"""FastAPI application for the Urban Renewal Intelligence Lab MVP."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from causal_analysis import run_causal_analysis
from data_preprocessing import (
    REQUIRED_FIELDS,
    match_geojson_units,
    merge_before_after,
    preprocess_dataframe,
    profile_dataframe,
    validate_fields,
)
from database import DATA_DIR, MODEL_DIR, OUTPUT_DIR, UPLOAD_DIR, init_db, latest_uploaded_path, record_upload, upsert_artifact
from explainability import run_shap_analysis
from ml_model import train_models
from report_generator import generate_report
from threshold_analysis import identify_thresholds
from urban_renewal_index import calculate_uei, summarize_uei


app = FastAPI(
    title="Urban Renewal Intelligence Lab API",
    description="Multi-source urban data fusion, UEI construction, explainable ML, threshold, spatial, and quasi-causal analysis.",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
init_db()


@app.on_event("startup")
def startup() -> None:
    """Initialize runtime storage."""

    init_db()


@app.get("/api/health")
def health() -> dict[str, str]:
    """Return service health."""

    return {"status": "ok"}


@app.post("/api/upload")
async def upload(files: list[UploadFile] = File(...)) -> dict[str, Any]:
    """Upload CSV or GeoJSON files and return field validation cards."""

    results = []
    for file in files:
        suffix = Path(file.filename or "").suffix.lower()
        logical_name = Path(file.filename or "uploaded").name
        saved_path = UPLOAD_DIR / logical_name
        with saved_path.open("wb") as target:
            shutil.copyfileobj(file.file, target)
        validation = _validate_file(saved_path, suffix)
        record_upload(logical_name, file.filename or logical_name, saved_path, validation)
        results.append({"file_name": file.filename, "saved_path": str(saved_path), "validation": validation})
    return {"uploaded": results}


@app.post("/api/preprocess")
def preprocess(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    """Clean tabular data, standardize indicators, and merge with GeoJSON."""

    payload = payload or {}
    panel = _load_panel_data()
    processed = preprocess_dataframe(panel, standardization=payload.get("standardization", "minmax"))
    output_csv = OUTPUT_DIR / "preprocessed_panel.csv"
    processed.to_csv(output_csv, index=False)
    geo_path = _data_path("geo_units.geojson")
    geo_output = OUTPUT_DIR / "merged_units.geojson"
    match_result = match_geojson_units(processed[processed["post"] == 1].drop_duplicates("unit_id"), geo_path, geo_output)
    profile = profile_dataframe(processed)
    validation = validate_fields(processed, REQUIRED_FIELDS)
    upsert_artifact("preprocessed_panel", output_csv, profile)
    upsert_artifact("merged_units_geojson", geo_output, match_result)
    return {"profile": profile, "validation": validation, "geo_match": match_result}


@app.post("/api/calculate-index")
def calculate_index(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    """Calculate six UEI dimensions and the composite score."""

    payload = payload or {}
    panel = _load_preprocessed_or_panel()
    result = calculate_uei(panel, weight_method=payload.get("weight_method", "entropy_weight"))
    index_columns = [
        "vitality_index",
        "function_index",
        "environment_index",
        "perception_index",
        "economic_index",
        "heritage_index",
        "uei_score",
        "uei_level",
    ]
    uei_panel = pd.concat(
        [panel.reset_index(drop=True), result.records[index_columns].reset_index(drop=True)],
        axis=1,
    )
    panel_path = OUTPUT_DIR / "uei_panel.csv"
    result_path = OUTPUT_DIR / "uei_result.csv"
    uei_panel.to_csv(panel_path, index=False)
    uei_panel[uei_panel["post"] == 1].drop_duplicates("unit_id").to_csv(result_path, index=False)
    summary = summarize_uei(result.records)
    summary["weights"] = result.weights
    upsert_artifact("uei_panel", panel_path, summary)
    upsert_artifact("uei_result", result_path, summary)
    return summary


@app.post("/api/train-model")
def train_model(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    """Train regressors and persist the best model."""

    payload = payload or {}
    df = _load_model_frame()
    metrics_path = OUTPUT_DIR / "model_metrics.json"
    try:
        metrics = train_models(df, target=payload.get("target", "uei_score"), model_dir=MODEL_DIR, metrics_path=metrics_path)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Model training failed: {exc}") from exc
    upsert_artifact("model_metrics", metrics_path, metrics)
    return metrics


@app.get("/api/model-metrics")
def model_metrics() -> dict[str, Any]:
    """Return model metric table."""

    return _read_json(OUTPUT_DIR / "model_metrics.json", {"best_model": None, "metrics": []})


@app.post("/api/shap-analysis")
def shap_analysis() -> dict[str, Any]:
    """Run global and local SHAP analysis for the best trained model."""

    model_path = MODEL_DIR / "best_model.pkl"
    if not model_path.exists():
        train_model({"target": "uei_score"})
    df = _load_model_frame()
    geojson_path = OUTPUT_DIR / "merged_units.geojson"
    if not geojson_path.exists():
        preprocess()
    result = run_shap_analysis(df, model_path, OUTPUT_DIR, geojson_path=geojson_path)
    upsert_artifact("shap_importance", OUTPUT_DIR / "shap_importance.csv", result["importance"])
    upsert_artifact("shap_map", Path(result["map_path"]) if result["map_path"] else OUTPUT_DIR / "spatial_shap.geojson")
    return result


@app.get("/api/shap-summary")
def shap_summary() -> list[dict[str, Any]]:
    """Return SHAP global importance records."""

    path = OUTPUT_DIR / "shap_importance.csv"
    if not path.exists():
        shap_analysis()
    return pd.read_csv(path).to_dict(orient="records")


@app.get("/api/shap-map")
def shap_map() -> dict[str, Any]:
    """Return GeoJSON with local SHAP values."""

    path = OUTPUT_DIR / "spatial_shap.geojson"
    if not path.exists():
        shap_analysis()
    return _read_json(path, {"type": "FeatureCollection", "features": []})


@app.post("/api/threshold-analysis")
def threshold_analysis() -> list[dict[str, Any]]:
    """Detect nonlinear threshold effects from SHAP dependence records."""

    dependence_path = OUTPUT_DIR / "shap_dependence.json"
    if not dependence_path.exists():
        shap_analysis()
    results = identify_thresholds(dependence_path, OUTPUT_DIR / "threshold_result.json")
    upsert_artifact("threshold_results", OUTPUT_DIR / "threshold_result.json", results)
    pd.DataFrame(results).to_csv(OUTPUT_DIR / "threshold_results.csv", index=False)
    return results


@app.get("/api/threshold-results")
def threshold_results() -> list[dict[str, Any]]:
    """Return threshold detection outputs."""

    path = OUTPUT_DIR / "threshold_result.json"
    if not path.exists():
        return threshold_analysis()
    return _read_json(path, [])


@app.post("/api/causal-analysis")
def causal_analysis(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    """Run DID, PSM-DID, and event-study models."""

    payload = payload or {}
    df = _load_causal_frame()
    result = run_causal_analysis(df, outcome=payload.get("outcome", "uei_score"), output_dir=OUTPUT_DIR)
    upsert_artifact("causal_results", OUTPUT_DIR / "causal_results.json", result)
    return result


@app.get("/api/causal-results")
def causal_results() -> dict[str, Any]:
    """Return quasi-causal analysis results."""

    path = OUTPUT_DIR / "causal_results.json"
    if not path.exists():
        return causal_analysis()
    return _read_json(path, {})


@app.get("/api/dashboard-summary")
def dashboard_summary() -> dict[str, Any]:
    """Return compact dashboard data for the frontend."""

    if not (OUTPUT_DIR / "uei_result.csv").exists():
        calculate_index()
    uei = pd.read_csv(OUTPUT_DIR / "uei_result.csv")
    thresholds = threshold_results() if (OUTPUT_DIR / "shap_dependence.json").exists() else []
    metrics = model_metrics()
    return {
        "uei": summarize_uei(uei),
        "model": metrics,
        "thresholds": thresholds[:4],
        "data_profile": profile_dataframe(_load_preprocessed_or_panel()),
    }


@app.post("/api/generate-report")
def generate_final_report() -> dict[str, Any]:
    """Generate final_report.md from available analytical artifacts."""

    if not (OUTPUT_DIR / "threshold_result.json").exists():
        threshold_analysis()
    if not (OUTPUT_DIR / "causal_results.json").exists():
        causal_analysis()
    result = generate_report(
        OUTPUT_DIR / "uei_result.csv",
        OUTPUT_DIR / "shap_importance.csv",
        OUTPUT_DIR / "threshold_result.json",
        OUTPUT_DIR / "causal_results.json",
        OUTPUT_DIR / "final_report.md",
    )
    upsert_artifact("final_report", OUTPUT_DIR / "final_report.md", result)
    return result


@app.get("/api/export/{artifact_name}")
def export_artifact(artifact_name: str) -> FileResponse:
    """Download generated CSV, JSON, GeoJSON, Markdown, or model artifacts."""

    allowed = {
        "model_metrics.csv": OUTPUT_DIR / "model_metrics.csv",
        "model_metrics.json": OUTPUT_DIR / "model_metrics.json",
        "uei_result.csv": OUTPUT_DIR / "uei_result.csv",
        "shap_importance.csv": OUTPUT_DIR / "shap_importance.csv",
        "threshold_results.csv": OUTPUT_DIR / "threshold_results.csv",
        "did_results.csv": OUTPUT_DIR / "did_results.csv",
        "final_report.md": OUTPUT_DIR / "final_report.md",
    }
    path = allowed.get(artifact_name)
    if artifact_name == "model_metrics.csv" and not path.exists() and (OUTPUT_DIR / "model_metrics.json").exists():
        pd.DataFrame(model_metrics().get("metrics", [])).to_csv(path, index=False)
    if artifact_name == "final_report.md" and path and not path.exists():
        generate_final_report()
    if not path or not path.exists():
        raise HTTPException(status_code=404, detail=f"Artifact {artifact_name} is not available")
    return FileResponse(path, filename=artifact_name)


def _validate_file(path: Path, suffix: str) -> dict[str, Any]:
    """Validate CSV required fields or GeoJSON structure."""

    if suffix == ".csv":
        df = pd.read_csv(path, nrows=200)
        return validate_fields(df)
    if suffix in {".geojson", ".json"}:
        payload = _read_json(path, {})
        features = payload.get("features", [])
        has_unit_id = bool(features and "unit_id" in features[0].get("properties", {}))
        return {"valid": has_unit_id, "feature_count": len(features), "missing_fields": [] if has_unit_id else ["unit_id"]}
    return {"valid": False, "missing_fields": ["unsupported_file_type"]}


def _load_panel_data() -> pd.DataFrame:
    """Load uploaded or sample before/after indicator data."""

    before = pd.read_csv(latest_uploaded_path("indicators_before.csv") or _data_path("indicators_before.csv"))
    after = pd.read_csv(latest_uploaded_path("indicators_after.csv") or _data_path("indicators_after.csv"))
    return merge_before_after(before, after)


def _load_preprocessed_or_panel() -> pd.DataFrame:
    """Load preprocessed data if present, otherwise generate it."""

    path = OUTPUT_DIR / "preprocessed_panel.csv"
    if not path.exists():
        preprocess()
    return pd.read_csv(path)


def _load_model_frame() -> pd.DataFrame:
    """Load post-renewal records with UEI fields for machine learning."""

    path = OUTPUT_DIR / "uei_result.csv"
    if not path.exists():
        calculate_index()
    return pd.read_csv(path)


def _load_causal_frame() -> pd.DataFrame:
    """Load panel data with UEI outcomes for causal analysis."""

    path = OUTPUT_DIR / "uei_panel.csv"
    if not path.exists():
        calculate_index()
    return pd.read_csv(path)


def _data_path(file_name: str) -> Path:
    """Resolve uploaded files before falling back to sample data."""

    return latest_uploaded_path(file_name) or DATA_DIR / file_name


def _read_json(path: str | Path, default: Any) -> Any:
    """Read JSON content with a default when unavailable."""

    path = Path(path)
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)
