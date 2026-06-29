"""Data validation, cleaning, normalization, and spatial matching utilities."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


REQUIRED_FIELDS = {
    "unit_id",
    "case_name",
    "city",
    "longitude",
    "latitude",
    "treat",
    "post",
    "year",
    "update_type",
    "update_intensity",
    "poi_density",
    "green_view_index",
    "ndvi",
    "lst",
    "night_light",
    "road_density",
    "transit_accessibility",
    "cultural_facility_density",
    "commercial_density",
    "sentiment_score",
    "heritage_integrity",
    "pedestrian_accessibility",
}

NEGATIVE_INDICATORS = {
    "lst",
    "distance_to_cbd",
    "distance_to_waterfront",
    "distance_to_metro",
    "distance_to_bus",
    "block_size",
    "facility_deficit",
    "traffic_inconvenience",
}


def validate_fields(df: pd.DataFrame, required_fields: set[str] | None = None) -> dict[str, Any]:
    """Validate that a dataframe contains the fields required by the platform."""

    required = required_fields or REQUIRED_FIELDS
    columns = set(df.columns)
    missing = sorted(required - columns)
    present = sorted(required & columns)
    return {
        "valid": not missing,
        "missing_fields": missing,
        "present_fields": present,
        "field_count": len(df.columns),
        "sample_count": int(len(df)),
    }


def load_csv(path: str | Path) -> pd.DataFrame:
    """Load a CSV with consistent UTF-8 handling."""

    return pd.read_csv(path)


def merge_before_after(before: pd.DataFrame, after: pd.DataFrame) -> pd.DataFrame:
    """Combine before and after indicator tables into panel-like records."""

    before = before.copy()
    after = after.copy()
    before["post"] = before.get("post", 0)
    after["post"] = after.get("post", 1)
    return pd.concat([before, after], ignore_index=True, sort=False)


def impute_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """Fill continuous variables with medians and categorical variables with modes."""

    cleaned = df.copy()
    numeric_cols = cleaned.select_dtypes(include=[np.number]).columns
    categorical_cols = [column for column in cleaned.columns if column not in numeric_cols]
    for column in numeric_cols:
        cleaned[column] = cleaned[column].fillna(cleaned[column].median())
    for column in categorical_cols:
        mode = cleaned[column].mode(dropna=True)
        cleaned[column] = cleaned[column].fillna(mode.iloc[0] if not mode.empty else "Unknown")
    return cleaned


def winsorize_continuous(df: pd.DataFrame, lower: float = 0.01, upper: float = 0.99) -> pd.DataFrame:
    """Clip numeric variables to the requested quantile range."""

    clipped = df.copy()
    for column in clipped.select_dtypes(include=[np.number]).columns:
        low, high = clipped[column].quantile([lower, upper])
        clipped[column] = clipped[column].clip(low, high)
    return clipped


def unify_indicator_direction(df: pd.DataFrame, negative_indicators: set[str] | None = None) -> pd.DataFrame:
    """Create positive-direction versions of negative indicators."""

    adjusted = df.copy()
    negative = negative_indicators or NEGATIVE_INDICATORS
    for column in negative:
        if column in adjusted.columns and pd.api.types.is_numeric_dtype(adjusted[column]):
            adjusted[f"negative_{column}"] = adjusted[column].max() - adjusted[column]
    if "lst" in adjusted.columns:
        adjusted["negative_lst"] = adjusted["lst"].max() - adjusted["lst"]
    return adjusted


def standardize(df: pd.DataFrame, method: str = "minmax", exclude: set[str] | None = None) -> pd.DataFrame:
    """Normalize numeric variables with min-max or z-score scaling."""

    normalized = df.copy()
    excluded = exclude or {"unit_id", "year", "post", "treat", "longitude", "latitude"}
    numeric_cols = [
        column
        for column in normalized.select_dtypes(include=[np.number]).columns
        if column not in excluded
    ]
    for column in numeric_cols:
        values = normalized[column].astype(float)
        if method == "zscore":
            std = values.std(ddof=0)
            normalized[column] = 0.0 if std == 0 else (values - values.mean()) / std
        elif method == "minmax":
            span = values.max() - values.min()
            normalized[column] = 0.0 if span == 0 else (values - values.min()) / span
        else:
            raise ValueError("standardization method must be 'minmax' or 'zscore'")
    return normalized


def preprocess_dataframe(df: pd.DataFrame, standardization: str = "minmax") -> pd.DataFrame:
    """Run the complete cleaning, winsorization, direction, and scaling workflow."""

    cleaned = impute_missing_values(df)
    cleaned = winsorize_continuous(cleaned)
    cleaned = unify_indicator_direction(cleaned)
    return standardize(cleaned, method=standardization)


def match_geojson_units(
    df: pd.DataFrame,
    geojson_path: str | Path,
    output_path: str | Path,
) -> dict[str, Any]:
    """Join tabular attributes to GeoJSON features through unit_id."""

    with Path(geojson_path).open("r", encoding="utf-8") as file:
        geojson = json.load(file)

    attributes = df.set_index("unit_id").to_dict(orient="index")
    matched = 0
    for feature in geojson.get("features", []):
        unit_id = feature.get("properties", {}).get("unit_id")
        if unit_id in attributes:
            feature.setdefault("properties", {}).update(_json_safe(attributes[unit_id]))
            matched += 1

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with Path(output_path).open("w", encoding="utf-8") as file:
        json.dump(geojson, file, ensure_ascii=False)

    return {
        "matched_units": matched,
        "total_features": len(geojson.get("features", [])),
        "output_path": str(output_path),
    }


def profile_dataframe(df: pd.DataFrame) -> dict[str, Any]:
    """Return dashboard-friendly completeness and scope metadata."""

    years = sorted(df["year"].dropna().unique().tolist()) if "year" in df.columns else []
    return {
        "sample_count": int(len(df)),
        "variable_count": int(len(df.columns)),
        "completeness": round(float(1 - df.isna().sum().sum() / max(df.size, 1)), 4),
        "time_span": [int(min(years)), int(max(years))] if years else [],
        "cases": sorted(df["case_name"].dropna().unique().tolist()) if "case_name" in df.columns else [],
    }


def _json_safe(record: dict[str, Any]) -> dict[str, Any]:
    """Convert numpy scalars and NaNs into JSON-safe values."""

    safe: dict[str, Any] = {}
    for key, value in record.items():
        if pd.isna(value):
            safe[key] = None
        elif isinstance(value, (np.integer, np.floating)):
            safe[key] = value.item()
        else:
            safe[key] = value
    return safe
