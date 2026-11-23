"""Machine-learning models for predicting UEI and sub-dimension indices."""

from __future__ import annotations

import json
import pickle
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GroupKFold, KFold, cross_val_score, train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


TARGETS = [
    "uei_score",
    "vitality_index",
    "function_index",
    "environment_index",
    "perception_index",
    "economic_index",
    "heritage_index",
]

FEATURES = [
    "building_density",
    "building_age",
    "land_use_mix",
    "road_density",
    "block_size",
    "distance_to_cbd",
    "distance_to_waterfront",
    "distance_to_metro",
    "distance_to_bus",
    "distance_to_park",
    "update_intensity",
    "public_space_improvement",
    "heritage_renovation_intensity",
    "commercial_upgrade_intensity",
    "cultural_facility_density",
    "population_density",
    "initial_commercial_density",
    "governance_type",
    "heritage_constraint",
    "walkability",
    "waterfront_accessibility",
    "heritage_integrity",
    "traditional_street_continuity",
    "cultural_identity_score",
    "tourism_business_density",
    "nighttime_consumption",
    "pedestrian_accessibility",
    "public_space_node_density",
    "industrial_reuse_intensity",
    "green_view_index",
    "office_poi_growth",
    "transit_accessibility",
]


def prepare_features(df: pd.DataFrame, feature_columns: list[str] | None = None) -> tuple[pd.DataFrame, list[str]]:
    """Select available model features and one-hot encode categorical variables."""

    candidate_features = feature_columns or [feature for feature in FEATURES if feature in df.columns]
    X = df[candidate_features].copy()
    for column in X.columns:
        if pd.api.types.is_numeric_dtype(X[column]):
            X[column] = X[column].fillna(X[column].median())
        else:
            mode = X[column].mode(dropna=True)
            X[column] = X[column].fillna(mode.iloc[0] if not mode.empty else "Unknown")
    X = pd.get_dummies(X, drop_first=False)
    return X.astype(float), list(X.columns)


def train_models(
    df: pd.DataFrame,
    target: str = "uei_score",
    model_dir: str | Path = "models",
    metrics_path: str | Path | None = None,
) -> dict[str, Any]:
    """Train OLS, RandomForest, optional gradient boosters, and persist the best model."""

    if target not in df.columns:
        raise ValueError(f"Target '{target}' is not available in the dataframe")
    model_dir = Path(model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    X, feature_names = prepare_features(df)
    y = df[target].astype(float)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    models = _available_models()
    metrics: list[dict[str, Any]] = []
    fitted_models: dict[str, Any] = {}
    for name, model in models.items():
        try:
            fitted = _fit_model(name, model, X_train, y_train)
            predictions = _predict_model(name, fitted, X_test)
            row = _metric_row(name, y_test, predictions)
            row["cv_r2"] = _cross_val_r2(name, model, X, y)
            row["spatial_cv_r2"] = _spatial_cv_r2(name, model, X, y, df)
            metrics.append(row)
            fitted_models[name] = fitted
        except Exception as exc:  # Keep the platform usable when optional estimators fail.
            metrics.append({"model": name, "status": "skipped", "reason": str(exc)})

    valid_metrics = [row for row in metrics if row.get("status") != "skipped"]
    if not valid_metrics:
        raise RuntimeError("No model could be trained")
    best_row = max(valid_metrics, key=lambda row: row["r2"])
    best_name = best_row["model"]
    artifact = {
        "model_name": best_name,
        "model": fitted_models[best_name],
        "feature_names": feature_names,
        "target": target,
    }
    with (model_dir / "best_model.pkl").open("wb") as file:
        pickle.dump(artifact, file)

    payload = {"target": target, "best_model": best_name, "metrics": metrics}
    if metrics_path:
        with Path(metrics_path).open("w", encoding="utf-8") as file:
            json.dump(payload, file, indent=2, ensure_ascii=False)
    return payload


def load_best_model(model_path: str | Path) -> dict[str, Any]:
    """Load a persisted model artifact."""

    with Path(model_path).open("rb") as file:
        return pickle.load(file)


def align_features(df: pd.DataFrame, feature_names: list[str]) -> pd.DataFrame:
    """Prepare dataframe features and align them to a saved model schema."""

    X, _ = prepare_features(df)
    return X.reindex(columns=feature_names, fill_value=0.0)


def _available_models() -> dict[str, Any]:
    """Return mandatory and installed optional regressors."""

    models: dict[str, Any] = {
        "OLS baseline": None,
        "RandomForestRegressor": RandomForestRegressor(n_estimators=240, random_state=42, min_samples_leaf=3),
    }
    try:
        from xgboost import XGBRegressor

        models["XGBoostRegressor"] = XGBRegressor(
            n_estimators=220,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="reg:squarederror",
            random_state=42,
        )
    except Exception:
        pass
    try:
        from lightgbm import LGBMRegressor

        models["LightGBMRegressor"] = LGBMRegressor(n_estimators=220, learning_rate=0.05, random_state=42, verbose=-1)
    except Exception:
        pass
    try:
        from catboost import CatBoostRegressor

        models["CatBoostRegressor"] = CatBoostRegressor(iterations=180, learning_rate=0.05, verbose=False, random_seed=42)
    except Exception:
        pass
    return models


def _fit_model(name: str, model: Any, X: pd.DataFrame, y: pd.Series) -> Any:
    """Fit an estimator, treating statsmodels OLS separately."""

    if name == "OLS baseline":
        return sm.OLS(y, sm.add_constant(X, has_constant="add")).fit()
    return model.fit(X, y)


def _predict_model(name: str, fitted: Any, X: pd.DataFrame) -> np.ndarray:
    """Predict with either statsmodels or scikit-compatible estimators."""

    if name == "OLS baseline":
        return fitted.predict(sm.add_constant(X, has_constant="add")).to_numpy()
    return np.asarray(fitted.predict(X))


def _metric_row(name: str, y_true: pd.Series, y_pred: np.ndarray) -> dict[str, Any]:
    """Compute regression metrics used by the dashboard."""

    return {
        "model": name,
        "r2": round(float(r2_score(y_true, y_pred)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 4),
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "mape": round(float(np.mean(np.abs((y_true - y_pred) / np.clip(np.abs(y_true), 1e-8, None))) * 100), 4),
    }


def _cross_val_r2(name: str, model: Any, X: pd.DataFrame, y: pd.Series) -> float | None:
    """Run ordinary KFold cross validation for scikit-compatible models."""

    if name == "OLS baseline":
        return None
    folds = KFold(n_splits=min(5, len(X)), shuffle=True, random_state=42)
    scores = cross_val_score(model, X, y, cv=folds, scoring="r2")
    return round(float(scores.mean()), 4)


def _spatial_cv_r2(name: str, model: Any, X: pd.DataFrame, y: pd.Series, df: pd.DataFrame) -> float | None:
    """Approximate spatial cross validation with case or district groups."""

    if name == "OLS baseline":
        return None
    group_column = "district" if "district" in df.columns else "case_name"
    if group_column not in df.columns or df[group_column].nunique() < 2:
        return None
    groups = df[group_column].astype(str)
    splitter = GroupKFold(n_splits=min(3, groups.nunique()))
    scores = cross_val_score(model, X, y, cv=splitter, groups=groups, scoring="r2")
    return round(float(scores.mean()), 4)
