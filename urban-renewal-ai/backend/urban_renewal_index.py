"""Urban Renewal Effectiveness Index (UEI) construction."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA


DIMENSION_INDICATORS = {
    "vitality_index": [
        "poi_density",
        "night_light",
        "mobility_intensity",
        "pedestrian_count",
        "checkin_density",
    ],
    "function_index": [
        "public_service_density",
        "life_service_coverage",
        "land_use_mix",
        "transit_accessibility",
        "fifteen_minute_life_circle",
    ],
    "environment_index": [
        "ndvi",
        "green_view_index",
        "waterfront_accessibility",
        "walkability",
        "negative_lst",
    ],
    "perception_index": [
        "sentiment_score",
        "safety_score",
        "aesthetic_score",
        "cultural_identity_score",
        "complaint_reduction",
    ],
    "economic_index": [
        "commercial_growth",
        "enterprise_density",
        "rent_growth",
        "consumption_heat",
        "store_opening_rate",
    ],
    "heritage_index": [
        "heritage_integrity",
        "historic_building_density",
        "traditional_street_continuity",
        "cultural_facility_density",
        "local_culture_keyword_score",
    ],
}


@dataclass(frozen=True)
class IndexResult:
    """Container for UEI records and the weights used to compute them."""

    records: pd.DataFrame
    weights: dict[str, dict[str, float]]


def minmax_series(series: pd.Series) -> pd.Series:
    """Return a 0-1 scaled series, preserving zero variance as zeros."""

    values = series.astype(float)
    span = values.max() - values.min()
    return pd.Series(0.0, index=values.index) if span == 0 else (values - values.min()) / span


def normalize_index_inputs(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize only variables that participate in UEI construction."""

    normalized = df.copy()
    indicators = {item for values in DIMENSION_INDICATORS.values() for item in values}
    for column in indicators:
        if column in normalized.columns and pd.api.types.is_numeric_dtype(normalized[column]):
            normalized[column] = minmax_series(normalized[column])
    return normalized


def calculate_weights(df: pd.DataFrame, indicators: list[str], method: str) -> dict[str, float]:
    """Calculate indicator weights using equal, entropy, or PCA weighting."""

    available = [column for column in indicators if column in df.columns]
    if not available:
        return {}
    matrix = df[available].fillna(0).clip(lower=0).astype(float)
    if method == "equal_weight" or len(available) == 1:
        weights = np.repeat(1 / len(available), len(available))
    elif method == "entropy_weight":
        weights = _entropy_weights(matrix)
    elif method == "pca_weight":
        weights = _pca_weights(matrix)
    else:
        raise ValueError("weight method must be equal_weight, entropy_weight, or pca_weight")
    return {feature: float(weight) for feature, weight in zip(available, weights)}


def calculate_uei(
    df: pd.DataFrame,
    weight_method: str = "entropy_weight",
    dimension_weights: dict[str, float] | None = None,
) -> IndexResult:
    """Calculate six dimension indices, composite UEI score, and quantile levels."""

    records = normalize_index_inputs(df)
    weights_by_dimension: dict[str, dict[str, float]] = {}
    dimensions = list(DIMENSION_INDICATORS)
    for dimension, indicators in DIMENSION_INDICATORS.items():
        weights = calculate_weights(records, indicators, weight_method)
        weights_by_dimension[dimension] = weights
        if not weights:
            records[dimension] = 0.0
            continue
        records[dimension] = sum(records[feature].fillna(0) * weight for feature, weight in weights.items())

    dim_weights = dimension_weights or {dimension: 1 / len(dimensions) for dimension in dimensions}
    records["uei_score"] = sum(records[dimension].fillna(0) * dim_weights.get(dimension, 0) for dimension in dimensions)
    records["uei_level"] = _quantile_levels(records["uei_score"])
    fields = ["unit_id", "case_name", *dimensions, "uei_score", "uei_level"]
    fields = [field for field in fields if field in records.columns]
    return IndexResult(records=records[fields].copy(), weights=weights_by_dimension)


def summarize_uei(index_df: pd.DataFrame) -> dict[str, Any]:
    """Build dashboard summary statistics for UEI outputs."""

    dimensions = list(DIMENSION_INDICATORS)
    by_case = (
        index_df.groupby("case_name")[["uei_score", *dimensions]]
        .mean()
        .round(4)
        .reset_index()
        .to_dict(orient="records")
        if "case_name" in index_df.columns
        else []
    )
    level_counts = (
        index_df.groupby(["case_name", "uei_level"]).size().reset_index(name="count").to_dict(orient="records")
        if {"case_name", "uei_level"}.issubset(index_df.columns)
        else []
    )
    return {
        "mean_uei": round(float(index_df["uei_score"].mean()), 4),
        "max_uei": round(float(index_df["uei_score"].max()), 4),
        "min_uei": round(float(index_df["uei_score"].min()), 4),
        "by_case": by_case,
        "level_counts": level_counts,
    }


def _entropy_weights(matrix: pd.DataFrame) -> np.ndarray:
    """Compute entropy weights for a non-negative feature matrix."""

    values = matrix.to_numpy(dtype=float)
    values = values + 1e-12
    proportions = values / values.sum(axis=0, keepdims=True)
    entropy = -(proportions * np.log(proportions)).sum(axis=0) / np.log(len(matrix))
    diversity = 1 - entropy
    if np.isclose(diversity.sum(), 0):
        return np.repeat(1 / matrix.shape[1], matrix.shape[1])
    return diversity / diversity.sum()


def _pca_weights(matrix: pd.DataFrame) -> np.ndarray:
    """Use absolute first-component loadings as PCA-derived weights."""

    if matrix.shape[1] == 1:
        return np.array([1.0])
    standardized = (matrix - matrix.mean()) / matrix.std(ddof=0).replace(0, 1)
    pca = PCA(n_components=1)
    pca.fit(standardized)
    loadings = np.abs(pca.components_[0])
    return loadings / loadings.sum() if loadings.sum() else np.repeat(1 / matrix.shape[1], matrix.shape[1])


def _quantile_levels(series: pd.Series) -> pd.Series:
    """Label UEI scores as Low, Medium, High, or Very High by quantiles."""

    labels = ["Low", "Medium", "High", "Very High"]
    try:
        return pd.qcut(series.rank(method="first"), q=4, labels=labels).astype(str)
    except ValueError:
        return pd.Series(["Medium"] * len(series), index=series.index)
