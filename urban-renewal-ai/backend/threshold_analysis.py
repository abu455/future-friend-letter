"""Threshold effect detection from SHAP dependence data."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


def identify_thresholds(
    dependence_data: list[dict[str, Any]] | str | Path,
    output_path: str | Path,
    top_n: int = 12,
) -> list[dict[str, Any]]:
    """Detect sign-change and diminishing-return thresholds for important features."""

    if isinstance(dependence_data, (str, Path)):
        with Path(dependence_data).open("r", encoding="utf-8") as file:
            rows = json.load(file)
    else:
        rows = dependence_data
    df = pd.DataFrame(rows)
    if df.empty:
        return []
    results: list[dict[str, Any]] = []
    for feature_name, group in df.groupby("feature_name", sort=False):
        if len(results) >= top_n:
            break
        prepared = group.groupby("feature_value", as_index=False)["shap_value"].mean().sort_values("feature_value")
        threshold = _threshold_for_feature(prepared)
        threshold["feature_name"] = feature_name
        threshold["interpretation"] = _interpret(feature_name, threshold)
        results.append(threshold)
    with Path(output_path).open("w", encoding="utf-8") as file:
        json.dump(results, file, indent=2, ensure_ascii=False)
    return results


def _threshold_for_feature(group: pd.DataFrame) -> dict[str, Any]:
    """Compute low/high thresholds from smoothed SHAP values."""

    values = group["feature_value"].astype(float).to_numpy()
    shap_values = group["shap_value"].astype(float).to_numpy()
    if len(values) < 3:
        value = float(values[0]) if len(values) else 0.0
        return {"threshold_low": round(value, 4), "threshold_high": round(value, 4), "effect_type": "insufficient_variation"}
    window = max(5, min(25, len(group) // 12))
    smooth = pd.Series(shap_values).rolling(window=window, center=True, min_periods=1).mean().to_numpy()
    sign_crossings = np.where((smooth[:-1] < 0) & (smooth[1:] >= 0))[0]
    slopes = np.gradient(smooth, values)
    positive_slopes = slopes[slopes > 0]
    slope_threshold = np.quantile(positive_slopes, 0.25) if len(positive_slopes) else 0
    diminishing = np.where((slopes[:-1] > np.median(slopes)) & (slopes[1:] <= slope_threshold))[0]

    low = float(values[sign_crossings[0] + 1]) if len(sign_crossings) else float(np.quantile(values, 0.25))
    high = float(values[diminishing[0] + 1]) if len(diminishing) else float(np.quantile(values, 0.75))
    if high < low:
        low, high = high, low
    effect_type = "positive_threshold" if len(sign_crossings) else "diminishing_returns"
    if smooth[-1] < smooth[len(smooth) // 2]:
        effect_type = "inverted_u_or_saturation"
    return {
        "threshold_low": round(low, 4),
        "threshold_high": round(high, 4),
        "effect_type": effect_type,
    }


def _interpret(feature_name: str, threshold: dict[str, Any]) -> str:
    """Generate a concise research-style interpretation for a threshold."""

    low = threshold["threshold_low"]
    high = threshold["threshold_high"]
    if "waterfront" in feature_name:
        return f"When {feature_name} is below {low}, its contribution to UEI becomes clearly positive; after {high}, the spatial accessibility gain weakens."
    if "tourism" in feature_name or "commercial" in feature_name:
        return f"{feature_name} improves renewal performance up to roughly {high}; beyond that range, marginal returns may decline and over-commercialization risk should be monitored."
    if "heritage" in feature_name or "cultural" in feature_name:
        return f"{feature_name} shows a positive contribution window between {low} and {high}, indicating that conservation quality strengthens renewal outcomes."
    return f"{feature_name} has a main threshold near {low} and a possible saturation point near {high}, suggesting nonlinear marginal effects."
