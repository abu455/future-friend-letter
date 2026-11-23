"""Generate reproducible demonstration data for the SCI-style MVP workflow."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd


RNG = np.random.default_rng(20260618)
BASE_DIR = Path(__file__).resolve().parents[1]
SAMPLE_DIR = BASE_DIR / "sample_data"


def generate_sample_data() -> None:
    """Generate CSV and GeoJSON sample files for two urban renewal cases."""

    SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
    units = _generate_units()
    before = _generate_indicators(units, post=0, year=2018)
    after = _generate_indicators(units, post=1, year=2024)
    project_info = _generate_project_info()
    units.to_csv(SAMPLE_DIR / "city_units.csv", index=False)
    before.to_csv(SAMPLE_DIR / "indicators_before.csv", index=False)
    after.to_csv(SAMPLE_DIR / "indicators_after.csv", index=False)
    project_info.to_csv(SAMPLE_DIR / "project_info.csv", index=False)
    _write_geojson(units, SAMPLE_DIR / "geo_units.geojson")
    _write_optional(before, after)


def _generate_units() -> pd.DataFrame:
    """Create base spatial units for Shanghai West Bund and Quzhou Shuitingmen."""

    rows = []
    specs = [
        ("Shanghai West Bund", "Shanghai", "SHWB", 300, 121.452, 31.184),
        ("Quzhou Shuitingmen Historical District", "Quzhou", "QZSTM", 200, 118.862, 28.970),
    ]
    for case_name, city, prefix, count, lon0, lat0 in specs:
        for idx in range(count):
            core = RNG.random()
            treat = int(core > 0.35)
            if "Shanghai" in case_name:
                space_types = ["waterfront_core", "industrial_reuse_area", "cultural_core", "residential_edge"]
            else:
                space_types = ["heritage_core", "tourism_core", "local_life_area", "cultural_core"]
            rows.append(
                {
                    "unit_id": f"{prefix}_{idx + 1:03d}",
                    "case_name": case_name,
                    "city": city,
                    "district": "Core" if treat else "Control Fringe",
                    "longitude": lon0 + RNG.normal(0, 0.012),
                    "latitude": lat0 + RNG.normal(0, 0.009),
                    "space_type": RNG.choice(space_types, p=[0.32, 0.28, 0.24, 0.16]),
                    "treat": treat,
                    "update_year": 2020,
                }
            )
    return pd.DataFrame(rows)


def _generate_indicators(units: pd.DataFrame, post: int, year: int) -> pd.DataFrame:
    """Generate panel indicators with embedded renewal mechanisms and noise."""

    rows = []
    for _, unit in units.iterrows():
        shanghai = unit["case_name"] == "Shanghai West Bund"
        treat = int(unit["treat"])
        renewal = post * treat
        base_quality = RNG.beta(3, 3)
        waterfront = np.clip((0.82 if shanghai else 0.38) + RNG.normal(0, 0.14) + renewal * (0.12 if shanghai else 0.03), 0, 1)
        heritage = np.clip((0.35 if shanghai else 0.75) + RNG.normal(0, 0.12) + renewal * (0.05 if shanghai else 0.13), 0, 1)
        tourism = np.clip((0.35 if shanghai else 0.55) + RNG.normal(0, 0.18) + renewal * (0.04 if shanghai else 0.12), 0, 1)
        nighttime = np.clip(RNG.beta(3, 4) + renewal * (0.18 if shanghai else 0.22), 0, 1)
        public_space = np.clip(RNG.beta(3, 3) + renewal * (0.22 if shanghai else 0.12), 0, 1)
        culture = np.clip(RNG.beta(2.5, 3) + renewal * (0.18 if shanghai else 0.16), 0, 1)
        industrial = np.clip((0.62 if shanghai else 0.18) + RNG.normal(0, 0.16) + renewal * (0.14 if shanghai else 0.01), 0, 1)
        tourism_peak = 1 - 2.2 * abs(tourism - 0.58)
        mechanism = (
            (0.35 * waterfront + 0.24 * public_space + 0.16 * culture + 0.12 * industrial)
            if shanghai
            else (0.34 * heritage + 0.24 * tourism_peak + 0.20 * nighttime + 0.14 * culture)
        )
        noise = RNG.normal(0, 0.045)
        renewal_gain = np.clip(0.12 * renewal + mechanism * 0.28 + noise, -0.05, 0.45)
        update_intensity = np.clip(RNG.beta(2.5, 2.2) + renewal * 0.28, 0, 1)
        row = {
            **unit.to_dict(),
            "year": year,
            "post": post,
            "update_type": "industrial_waterfront" if shanghai else "historic_district",
            "update_intensity": update_intensity,
            "poi_density": _scale(base_quality + renewal_gain + RNG.normal(0, 0.08), 80, 650),
            "green_view_index": np.clip(0.22 + 0.35 * public_space + 0.18 * waterfront + renewal_gain + RNG.normal(0, 0.07), 0, 1),
            "ndvi": np.clip(0.18 + 0.32 * public_space + 0.16 * waterfront + renewal_gain * 0.5 + RNG.normal(0, 0.05), 0, 1),
            "lst": np.clip(35 - 4.8 * public_space - 3.5 * waterfront - 2.2 * renewal_gain + RNG.normal(0, 1.0), 22, 42),
            "night_light": _scale(nighttime + renewal_gain + RNG.normal(0, 0.08), 10, 90),
            "road_density": _scale(base_quality + RNG.normal(0, 0.1), 2.5, 12),
            "transit_accessibility": np.clip(0.34 + 0.42 * base_quality + 0.12 * renewal + RNG.normal(0, 0.08), 0, 1),
            "cultural_facility_density": _scale(culture + renewal_gain + RNG.normal(0, 0.08), 1, 35),
            "commercial_density": _scale(tourism + nighttime + renewal_gain + RNG.normal(0, 0.08), 20, 360),
            "sentiment_score": np.clip(0.36 + 0.25 * public_space + 0.18 * culture + renewal_gain + RNG.normal(0, 0.08), 0, 1),
            "heritage_integrity": heritage,
            "pedestrian_accessibility": np.clip(0.34 + 0.35 * public_space + 0.2 * heritage + renewal_gain + RNG.normal(0, 0.07), 0, 1),
            "mobility_intensity": _scale(nighttime + public_space + renewal_gain + RNG.normal(0, 0.08), 120, 1800),
            "pedestrian_count": _scale(public_space + nighttime + renewal_gain + RNG.normal(0, 0.08), 200, 4500),
            "checkin_density": _scale(tourism + nighttime + renewal_gain + RNG.normal(0, 0.08), 5, 220),
            "public_service_density": _scale(base_quality + culture + renewal_gain + RNG.normal(0, 0.08), 2, 42),
            "life_service_coverage": np.clip(0.35 + 0.32 * base_quality + renewal_gain + RNG.normal(0, 0.07), 0, 1),
            "land_use_mix": np.clip(0.28 + 0.42 * base_quality + 0.12 * tourism + renewal_gain * 0.35 + RNG.normal(0, 0.07), 0, 1),
            "fifteen_minute_life_circle": np.clip(0.35 + 0.35 * base_quality + renewal_gain + RNG.normal(0, 0.07), 0, 1),
            "waterfront_accessibility": waterfront,
            "walkability": np.clip(0.33 + 0.36 * public_space + 0.18 * base_quality + renewal_gain + RNG.normal(0, 0.07), 0, 1),
            "safety_score": np.clip(0.42 + 0.25 * public_space + renewal_gain + RNG.normal(0, 0.07), 0, 1),
            "aesthetic_score": np.clip(0.38 + 0.28 * public_space + 0.2 * heritage + renewal_gain + RNG.normal(0, 0.07), 0, 1),
            "cultural_identity_score": np.clip(0.24 + 0.52 * heritage + 0.14 * culture + renewal_gain + RNG.normal(0, 0.07), 0, 1),
            "complaint_reduction": np.clip(0.2 + 0.45 * public_space + renewal_gain + RNG.normal(0, 0.08), 0, 1),
            "commercial_growth": np.clip(0.18 + 0.35 * tourism + 0.2 * nighttime + renewal_gain + RNG.normal(0, 0.08), 0, 1),
            "enterprise_density": _scale(base_quality + tourism + renewal_gain + RNG.normal(0, 0.08), 6, 180),
            "rent_growth": np.clip(0.12 + 0.28 * tourism + renewal_gain + RNG.normal(0, 0.09), 0, 1),
            "consumption_heat": np.clip(0.18 + 0.45 * nighttime + 0.2 * tourism + renewal_gain + RNG.normal(0, 0.07), 0, 1),
            "store_opening_rate": np.clip(0.12 + 0.34 * tourism + renewal_gain + RNG.normal(0, 0.08), 0, 1),
            "historic_building_density": _scale(heritage + RNG.normal(0, 0.08), 1, 48),
            "traditional_street_continuity": np.clip(0.24 + 0.55 * heritage + renewal_gain * 0.25 + RNG.normal(0, 0.06), 0, 1),
            "local_culture_keyword_score": np.clip(0.22 + 0.48 * heritage + 0.14 * tourism + renewal_gain + RNG.normal(0, 0.07), 0, 1),
            "building_density": _scale(base_quality + RNG.normal(0, 0.1), 0.7, 4.8),
            "building_age": _scale(1 - base_quality + (0.25 if not shanghai else 0.05) + RNG.normal(0, 0.1), 8, 95),
            "block_size": _scale(1 - public_space + RNG.normal(0, 0.08), 1.5, 9.5),
            "distance_to_cbd": _scale(1 - base_quality + RNG.normal(0, 0.1), 1.0, 18.0),
            "distance_to_waterfront": _scale(1 - waterfront + RNG.normal(0, 0.08), 0.05, 5.5),
            "distance_to_metro": _scale(1 - base_quality + RNG.normal(0, 0.1), 0.1, 3.2),
            "distance_to_bus": _scale(1 - base_quality + RNG.normal(0, 0.1), 0.05, 1.8),
            "distance_to_park": _scale(1 - public_space + RNG.normal(0, 0.08), 0.05, 4.6),
            "public_space_improvement": public_space,
            "heritage_renovation_intensity": np.clip(heritage * update_intensity + RNG.normal(0, 0.06), 0, 1),
            "commercial_upgrade_intensity": np.clip(tourism * update_intensity + RNG.normal(0, 0.06), 0, 1),
            "population_density": _scale(base_quality + RNG.normal(0, 0.1), 4000, 36000),
            "initial_commercial_density": _scale(tourism + RNG.normal(0, 0.1), 10, 280),
            "governance_type": "government_led" if RNG.random() < 0.55 else "public_private_partnership",
            "heritage_constraint": np.clip(heritage + RNG.normal(0, 0.08), 0, 1),
            "tourism_business_density": tourism,
            "nighttime_consumption": nighttime,
            "public_space_node_density": np.clip(public_space + RNG.normal(0, 0.08), 0, 1),
            "industrial_reuse_intensity": industrial,
            "office_poi_growth": np.clip((0.55 if shanghai else 0.18) * renewal + RNG.beta(2, 6), 0, 1),
        }
        rows.append(row)
    return pd.DataFrame(rows)


def _scale(value: float, low: float, high: float) -> float:
    """Map an approximately 0-1 latent value to a bounded numeric range."""

    return float(np.clip(value, 0, 1) * (high - low) + low)


def _generate_project_info() -> pd.DataFrame:
    """Return project ledger records."""

    return pd.DataFrame(
        [
            {
                "case_name": "Shanghai West Bund",
                "city": "Shanghai",
                "project_name": "Longhua Airport to Shanghai West Bund",
                "update_type": "industrial_waterfront",
                "update_year": 2020,
                "planning_theme": "AI waterfront, public culture, industrial reuse",
            },
            {
                "case_name": "Quzhou Shuitingmen Historical District",
                "city": "Quzhou",
                "project_name": "Shuitingmen Historic Cultural Block Renewal",
                "update_type": "historic_district",
                "update_year": 2020,
                "planning_theme": "heritage conservation, tourism vitality, local life",
            },
        ]
    )


def _write_geojson(units: pd.DataFrame, path: Path) -> None:
    """Write simple square polygons around unit centroids."""

    features = []
    for _, row in units.iterrows():
        lon, lat = float(row["longitude"]), float(row["latitude"])
        d = 0.0018
        polygon = [
            [lon - d, lat - d],
            [lon + d, lat - d],
            [lon + d, lat + d],
            [lon - d, lat + d],
            [lon - d, lat - d],
        ]
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "unit_id": row["unit_id"],
                    "case_name": row["case_name"],
                    "space_type": row["space_type"],
                },
                "geometry": {"type": "Polygon", "coordinates": [polygon]},
            }
        )
    path.write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False), encoding="utf-8")


def _write_optional(before: pd.DataFrame, after: pd.DataFrame) -> None:
    """Create optional multimodal data files used by upload validation demos."""

    post = after[["unit_id", "case_name", "sentiment_score", "poi_density", "green_view_index", "mobility_intensity"]].copy()
    post.rename(columns={"mobility_intensity": "heat_intensity"}, inplace=True)
    post[["unit_id", "case_name", "sentiment_score"]].to_csv(SAMPLE_DIR / "optional_text_sentiment.csv", index=False)
    post[["unit_id", "case_name", "poi_density"]].to_csv(SAMPLE_DIR / "optional_poi.csv", index=False)
    post[["unit_id", "case_name", "green_view_index"]].to_csv(SAMPLE_DIR / "optional_street_view.csv", index=False)
    post[["unit_id", "case_name", "heat_intensity"]].to_csv(SAMPLE_DIR / "optional_mobility.csv", index=False)


if __name__ == "__main__":
    generate_sample_data()
