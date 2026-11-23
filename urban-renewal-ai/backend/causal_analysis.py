"""DID, PSM-DID, and event-study quasi-causal analysis."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler


DEFAULT_CONTROLS = [
    "building_density",
    "building_age",
    "land_use_mix",
    "road_density",
    "population_density",
    "initial_commercial_density",
    "heritage_constraint",
    "walkability",
]


def run_causal_analysis(
    df: pd.DataFrame,
    outcome: str = "uei_score",
    output_dir: str | Path = "outputs",
    controls: list[str] | None = None,
) -> dict[str, Any]:
    """Run DID variants, PSM-DID, balance diagnostics, and event study."""

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    controls = [control for control in (controls or DEFAULT_CONTROLS) if control in df.columns]
    panel = df.copy()
    panel["treat_post"] = panel["treat"].astype(int) * panel["post"].astype(int)
    did_results = [
        _did_model(panel, outcome, [], "basic_did"),
        _did_model(panel, outcome, controls, "controlled_did"),
        _did_model(panel, outcome, controls, "unit_fixed_effects", unit_fe=True),
        _did_model(panel, outcome, controls, "two_way_fixed_effects", unit_fe=True, time_fe=True),
    ]
    psm = _psm_did(panel, outcome, controls)
    event = _event_study(panel, outcome, controls)
    payload = {"did_results": did_results, "psm_did": psm, "event_study": event}
    with (output_dir / "did_results.csv").open("w", encoding="utf-8") as file:
        pd.DataFrame(did_results).to_csv(file, index=False)
    with (output_dir / "psm_did_results.json").open("w", encoding="utf-8") as file:
        json.dump(psm, file, indent=2, ensure_ascii=False)
    with (output_dir / "event_study_result.json").open("w", encoding="utf-8") as file:
        json.dump(event, file, indent=2, ensure_ascii=False)
    with (output_dir / "causal_results.json").open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2, ensure_ascii=False)
    return payload


def _did_model(
    df: pd.DataFrame,
    outcome: str,
    controls: list[str],
    label: str,
    unit_fe: bool = False,
    time_fe: bool = False,
) -> dict[str, Any]:
    """Estimate a DID formula with robust standard errors."""

    terms = ["treat", "post", "treat_post", *controls]
    if unit_fe:
        terms.append("C(unit_id)")
    if time_fe:
        terms.append("C(year)")
    formula = f"{outcome} ~ " + " + ".join(terms)
    result = smf.ols(formula, data=df).fit(cov_type="HC1")
    ci = result.conf_int().loc["treat_post"].tolist()
    return {
        "model": label,
        "coefficient": round(float(result.params["treat_post"]), 6),
        "p_value": round(float(result.pvalues["treat_post"]), 6),
        "ci_low": round(float(ci[0]), 6),
        "ci_high": round(float(ci[1]), 6),
        "n": int(result.nobs),
        "r2": round(float(result.rsquared), 4),
    }


def _psm_did(df: pd.DataFrame, outcome: str, controls: list[str]) -> dict[str, Any]:
    """Estimate propensity scores, nearest-neighbor matches, and DID on matched data."""

    baseline = df[df["post"] == 0].drop_duplicates("unit_id").copy()
    covariates = [control for control in controls if pd.api.types.is_numeric_dtype(baseline[control])]
    if not covariates:
        covariates = ["update_intensity"] if "update_intensity" in baseline.columns else []
    X = baseline[covariates].fillna(baseline[covariates].median())
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    propensity = LogisticRegression(max_iter=1000).fit(X_scaled, baseline["treat"].astype(int))
    baseline["propensity_score"] = propensity.predict_proba(X_scaled)[:, 1]
    treated = baseline[baseline["treat"] == 1]
    controls_df = baseline[baseline["treat"] == 0]
    if treated.empty or controls_df.empty:
        return {"status": "skipped", "reason": "Need both treated and control units for PSM-DID"}
    matcher = NearestNeighbors(n_neighbors=1).fit(controls_df[["propensity_score"]])
    _, indices = matcher.kneighbors(treated[["propensity_score"]])
    matched_control_ids = controls_df.iloc[indices.flatten()]["unit_id"].tolist()
    matched_ids = set(treated["unit_id"].tolist() + matched_control_ids)
    matched_panel = df[df["unit_id"].isin(matched_ids)].copy()
    matched_panel["treat_post"] = matched_panel["treat"].astype(int) * matched_panel["post"].astype(int)
    did = _did_model(matched_panel, outcome, covariates, "psm_did", unit_fe=True, time_fe=True)
    return {
        "did": did,
        "matched_unit_count": len(matched_ids),
        "balance_table": _balance_table(baseline, matched_ids, covariates),
    }


def _balance_table(baseline: pd.DataFrame, matched_ids: set[str], covariates: list[str]) -> list[dict[str, Any]]:
    """Return standardized mean differences before and after matching."""

    rows: list[dict[str, Any]] = []
    for covariate in covariates:
        before = _smd(baseline, covariate)
        after = _smd(baseline[baseline["unit_id"].isin(matched_ids)], covariate)
        rows.append(
            {
                "covariate": covariate,
                "smd_before": round(float(before), 4),
                "smd_after": round(float(after), 4),
            }
        )
    return rows


def _smd(df: pd.DataFrame, covariate: str) -> float:
    """Compute absolute standardized mean difference for treated/control groups."""

    treated = df[df["treat"] == 1][covariate].astype(float)
    control = df[df["treat"] == 0][covariate].astype(float)
    pooled = np.sqrt((treated.var(ddof=1) + control.var(ddof=1)) / 2)
    return 0.0 if pooled == 0 or np.isnan(pooled) else abs(treated.mean() - control.mean()) / pooled


def _event_study(df: pd.DataFrame, outcome: str, controls: list[str]) -> list[dict[str, Any]]:
    """Estimate dynamic event-time effects around project update years."""

    event_df = df.copy()
    if "update_year" not in event_df.columns:
        event_df["update_year"] = event_df.groupby("unit_id")["year"].transform("min") + 1
    event_df["event_time"] = (event_df["year"] - event_df["update_year"]).clip(-3, 3).astype(int)
    rows: list[dict[str, Any]] = []
    event_lookup: dict[str, int] = {}
    for event_time in sorted(event_df["event_time"].unique()):
        if event_time == -1:
            continue
        suffix = f"m{abs(event_time)}" if event_time < 0 else f"p{event_time}"
        column = f"event_{suffix}"
        event_lookup[column] = int(event_time)
        event_df[column] = ((event_df["event_time"] == event_time) & (event_df["treat"] == 1)).astype(int)
    event_terms = list(event_lookup)
    formula = f"{outcome} ~ " + " + ".join([*event_terms, *controls, "C(unit_id)", "C(year)"])
    result = smf.ols(formula, data=event_df).fit(cov_type="HC1")
    for term in event_terms:
        ci = result.conf_int().loc[term].tolist()
        rows.append(
            {
                "event_time": event_lookup[term],
                "coefficient": round(float(result.params[term]), 6),
                "p_value": round(float(result.pvalues[term]), 6),
                "ci_low": round(float(ci[0]), 6),
                "ci_high": round(float(ci[1]), 6),
            }
        )
    return rows
