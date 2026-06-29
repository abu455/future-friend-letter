"""SHAP and fallback explainability routines for trained UEI models."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from ml_model import align_features, load_best_model


CASE_FOCUS_FEATURES = {
    "Shanghai West Bund": [
        "waterfront_accessibility",
        "public_space_improvement",
        "cultural_facility_density",
        "industrial_reuse_intensity",
        "transit_accessibility",
        "green_view_index",
        "office_poi_growth",
    ],
    "Quzhou Shuitingmen Historical District": [
        "heritage_integrity",
        "traditional_street_continuity",
        "cultural_identity_score",
        "tourism_business_density",
        "nighttime_consumption",
        "pedestrian_accessibility",
        "public_space_node_density",
    ],
}


def run_shap_analysis(
    df: pd.DataFrame,
    model_path: str | Path,
    output_dir: str | Path,
    geojson_path: str | Path | None = None,
) -> dict[str, Any]:
    """Compute global, local, dependence, interaction, and map-ready SHAP outputs."""

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    artifact = load_best_model(model_path)
    X = align_features(df, artifact["feature_names"])
    shap_values = _compute_shap_values(artifact, X)
    shap_df = pd.DataFrame(shap_values, columns=X.columns)
    local = pd.concat([df[["unit_id", "case_name"]].reset_index(drop=True), shap_df.add_prefix("shap_")], axis=1)
    importance = (
        shap_df.abs()
        .mean()
        .sort_values(ascending=False)
        .reset_index()
        .rename(columns={"index": "feature_name", 0: "mean_abs_shap"})
    )
    importance["case_focus"] = importance["feature_name"].apply(_case_focus_label)
    summary = _summary_records(X, shap_df, importance)
    dependence = _dependence_records(X, shap_df, importance)
    interactions = _interaction_records(X, shap_df, importance)

    paths = {
        "shap_importance": output_dir / "shap_importance.csv",
        "local_shap": output_dir / "local_shap.csv",
        "shap_summary": output_dir / "shap_summary.json",
        "shap_dependence": output_dir / "shap_dependence.json",
        "shap_interaction": output_dir / "shap_interaction.json",
    }
    importance.to_csv(paths["shap_importance"], index=False)
    local.to_csv(paths["local_shap"], index=False)
    _write_json(paths["shap_summary"], summary)
    _write_json(paths["shap_dependence"], dependence)
    _write_json(paths["shap_interaction"], interactions)
    shap_map_path = None
    if geojson_path:
        shap_map_path = output_dir / "spatial_shap.geojson"
        map_shap_to_geojson(local, importance, geojson_path, shap_map_path)

    return {
        "model_name": artifact["model_name"],
        "importance": importance.to_dict(orient="records"),
        "summary_path": str(paths["shap_summary"]),
        "dependence_path": str(paths["shap_dependence"]),
        "interaction_path": str(paths["shap_interaction"]),
        "local_path": str(paths["local_shap"]),
        "map_path": str(shap_map_path) if shap_map_path else None,
    }


def map_shap_to_geojson(
    local_shap: pd.DataFrame,
    importance: pd.DataFrame,
    geojson_path: str | Path,
    output_path: str | Path,
) -> None:
    """Attach top local SHAP contributions to GeoJSON features."""

    with Path(geojson_path).open("r", encoding="utf-8") as file:
        geojson = json.load(file)
    shap_columns = [column for column in local_shap.columns if column.startswith("shap_")]
    shap_records = local_shap.set_index("unit_id")
    global_top = importance.iloc[0]["feature_name"] if not importance.empty else None
    for feature in geojson.get("features", []):
        unit_id = feature.get("properties", {}).get("unit_id")
        if unit_id not in shap_records.index:
            continue
        row = shap_records.loc[unit_id, shap_columns].astype(float)
        top_column = row.abs().idxmax()
        feature.setdefault("properties", {}).update(
            {
                "top_shap_feature": top_column.replace("shap_", ""),
                "top_shap_value": float(row[top_column]),
                "global_top_feature": global_top,
            }
        )
        for column in shap_columns[:20]:
            feature["properties"][column] = float(row[column])
    with Path(output_path).open("w", encoding="utf-8") as file:
        json.dump(geojson, file, ensure_ascii=False)


def _compute_shap_values(artifact: dict[str, Any], X: pd.DataFrame) -> np.ndarray:
    """Use SHAP when available and a deterministic importance fallback otherwise."""

    model = artifact["model"]
    model_name = artifact["model_name"]
    if model_name != "OLS baseline":
        try:
            import shap

            explainer = shap.Explainer(model, X)
            explanation = explainer(X)
            values = explanation.values
            return values if values.ndim == 2 else values[:, :, 0]
        except Exception:
            pass
    return _fallback_local_contributions(model, model_name, X)


def _fallback_local_contributions(model: Any, model_name: str, X: pd.DataFrame) -> np.ndarray:
    """Approximate local contributions when SHAP is unavailable."""

    centered = X - X.mean()
    if hasattr(model, "feature_importances_"):
        weights = np.asarray(model.feature_importances_, dtype=float)
    elif model_name == "OLS baseline":
        weights = np.asarray(model.params.reindex(["const", *X.columns]).drop("const").fillna(0), dtype=float)
    else:
        weights = np.repeat(1 / X.shape[1], X.shape[1])
    if np.isclose(np.abs(weights).sum(), 0):
        weights = np.repeat(1 / X.shape[1], X.shape[1])
    weights = weights / np.abs(weights).sum()
    return centered.to_numpy(dtype=float) * weights


def _summary_records(X: pd.DataFrame, shap_df: pd.DataFrame, importance: pd.DataFrame) -> list[dict[str, Any]]:
    """Return sampled summary-plot records for frontend rendering."""

    top_features = importance.head(20)["feature_name"].tolist()
    records: list[dict[str, Any]] = []
    sample = X.index[:: max(len(X) // 600, 1)]
    for feature in top_features:
        for idx in sample:
            records.append(
                {
                    "feature_name": feature,
                    "feature_value": float(X.loc[idx, feature]),
                    "shap_value": float(shap_df.loc[idx, feature]),
                }
            )
    return records


def _dependence_records(X: pd.DataFrame, shap_df: pd.DataFrame, importance: pd.DataFrame) -> list[dict[str, Any]]:
    """Return feature-value versus SHAP contribution records."""

    records: list[dict[str, Any]] = []
    for feature in importance.head(15)["feature_name"]:
        ordered = pd.DataFrame({"feature_value": X[feature], "shap_value": shap_df[feature]}).sort_values("feature_value")
        for _, row in ordered.iterrows():
            records.append(
                {
                    "feature_name": feature,
                    "feature_value": float(row["feature_value"]),
                    "shap_value": float(row["shap_value"]),
                }
            )
    return records


def _interaction_records(X: pd.DataFrame, shap_df: pd.DataFrame, importance: pd.DataFrame) -> list[dict[str, Any]]:
    """Approximate pairwise SHAP interactions among the top ten variables."""

    features = importance.head(10)["feature_name"].tolist()
    records: list[dict[str, Any]] = []
    for feature_a in features:
        for feature_b in features:
            interaction = float(np.corrcoef(X[feature_a] * X[feature_b], shap_df[feature_a] + shap_df[feature_b])[0, 1])
            records.append(
                {
                    "feature_a": feature_a,
                    "feature_b": feature_b,
                    "interaction_strength": 0.0 if np.isnan(interaction) else round(interaction, 4),
                }
            )
    return records


def _case_focus_label(feature_name: str) -> str:
    """Label whether a feature is emphasized for a case-study narrative."""

    labels = [case for case, features in CASE_FOCUS_FEATURES.items() if feature_name in features]
    return ", ".join(labels)


def _write_json(path: Path, payload: Any) -> None:
    """Write JSON with UTF-8 and readable indentation."""

    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2, ensure_ascii=False)
