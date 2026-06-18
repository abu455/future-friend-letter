"""Spatial heterogeneity analysis for case-study subareas."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd


SPACE_TYPES = [
    "waterfront_core",
    "cultural_core",
    "industrial_reuse_area",
    "residential_edge",
    "heritage_core",
    "tourism_core",
    "local_life_area",
]


def analyze_spatial_heterogeneity(
    local_shap_path: str | Path,
    attributes: pd.DataFrame,
    geojson_path: str | Path,
    output_dir: str | Path,
) -> dict[str, Any]:
    """Compare SHAP drivers by case and spatial type and create spatial_shap.geojson."""

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    shap_df = pd.read_csv(local_shap_path)
    attrs = attributes[["unit_id", "case_name", "space_type"]].drop_duplicates("unit_id")
    merged = shap_df.merge(attrs, on=["unit_id", "case_name"], how="left")
    shap_columns = [column for column in merged.columns if column.startswith("shap_")]

    rows: list[dict[str, Any]] = []
    for (case_name, space_type), group in merged.groupby(["case_name", "space_type"], dropna=False):
        importance = group[shap_columns].abs().mean().sort_values(ascending=False).head(8)
        for feature, value in importance.items():
            rows.append(
                {
                    "case_name": case_name,
                    "space_type": space_type or "unclassified",
                    "feature_name": feature.replace("shap_", ""),
                    "mean_abs_shap": round(float(value), 6),
                }
            )
    heterogeneity = pd.DataFrame(rows)
    csv_path = output_dir / "spatial_heterogeneity.csv"
    heterogeneity.to_csv(csv_path, index=False)
    geo_path = output_dir / "spatial_shap.geojson"
    _write_spatial_shap(merged, shap_columns, geojson_path, geo_path)
    return {
        "heterogeneity": heterogeneity.to_dict(orient="records"),
        "csv_path": str(csv_path),
        "geojson_path": str(geo_path),
    }


def _write_spatial_shap(
    merged: pd.DataFrame,
    shap_columns: list[str],
    geojson_path: str | Path,
    output_path: str | Path,
) -> None:
    """Attach local dominant SHAP drivers to GeoJSON features."""

    with Path(geojson_path).open("r", encoding="utf-8") as file:
        geojson = json.load(file)
    lookup = merged.set_index("unit_id")
    for feature in geojson.get("features", []):
        unit_id = feature.get("properties", {}).get("unit_id")
        if unit_id not in lookup.index:
            continue
        row = lookup.loc[unit_id]
        shap_values = row[shap_columns].astype(float)
        top_feature = shap_values.abs().idxmax().replace("shap_", "")
        feature.setdefault("properties", {}).update(
            {
                "space_type": row.get("space_type", feature.get("properties", {}).get("space_type")),
                "top_shap_feature": top_feature,
                "top_shap_value": float(shap_values[f"shap_{top_feature}"]),
            }
        )
    with Path(output_path).open("w", encoding="utf-8") as file:
        json.dump(geojson, file, ensure_ascii=False)
