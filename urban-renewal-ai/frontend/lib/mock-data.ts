export const caseCards = [
  {
    name: "Shanghai West Bund",
    subtitle: "Longhua Airport renewal · waterfront AI cultural corridor",
    score: 0.78,
    accent: "from-cyan-400 to-blue-500"
  },
  {
    name: "Quzhou Shuitingmen Historical District",
    subtitle: "Historic block conservation · tourism and local life balance",
    score: 0.72,
    accent: "from-violet-400 to-fuchsia-500"
  }
];

export const dimensionData = [
  { dimension: "Vitality", Shanghai: 0.82, Quzhou: 0.76 },
  { dimension: "Function", Shanghai: 0.75, Quzhou: 0.66 },
  { dimension: "Environment", Shanghai: 0.8, Quzhou: 0.68 },
  { dimension: "Perception", Shanghai: 0.73, Quzhou: 0.77 },
  { dimension: "Economic", Shanghai: 0.79, Quzhou: 0.69 },
  { dimension: "Heritage", Shanghai: 0.62, Quzhou: 0.84 }
];

export const modelMetrics = [
  { model: "OLS baseline", r2: 0.54, rmse: 0.122, mae: 0.09, mape: 12.6 },
  { model: "RandomForestRegressor", r2: 0.83, rmse: 0.071, mae: 0.052, mape: 6.8 },
  { model: "XGBoostRegressor", r2: 0.87, rmse: 0.061, mae: 0.047, mape: 5.9 },
  { model: "LightGBMRegressor", r2: 0.85, rmse: 0.066, mae: 0.049, mape: 6.2 }
];

export const shapImportance = [
  { feature_name: "waterfront_accessibility", mean_abs_shap: 0.092 },
  { feature_name: "public_space_improvement", mean_abs_shap: 0.081 },
  { feature_name: "heritage_integrity", mean_abs_shap: 0.074 },
  { feature_name: "cultural_facility_density", mean_abs_shap: 0.069 },
  { feature_name: "tourism_business_density", mean_abs_shap: 0.058 },
  { feature_name: "nighttime_consumption", mean_abs_shap: 0.052 },
  { feature_name: "transit_accessibility", mean_abs_shap: 0.047 }
];

export const thresholdCards = [
  {
    feature_name: "waterfront_accessibility",
    threshold_low: 0.42,
    threshold_high: 0.78,
    effect_type: "positive_threshold",
    interpretation: "When waterfront accessibility exceeds 0.42, UEI contribution becomes positive; after 0.78, gains saturate."
  },
  {
    feature_name: "tourism_business_density",
    threshold_low: 0.38,
    threshold_high: 0.64,
    effect_type: "inverted_u_or_saturation",
    interpretation: "Tourism business density performs best in a middle range; excessive commercialization weakens marginal benefits."
  },
  {
    feature_name: "heritage_integrity",
    threshold_low: 0.55,
    threshold_high: 0.82,
    effect_type: "positive_threshold",
    interpretation: "Higher heritage integrity strengthens renewal outcomes, especially in Shuitingmen heritage-core units."
  }
];

export const eventStudy = [
  { event_time: -3, coefficient: -0.01 },
  { event_time: -2, coefficient: -0.006 },
  { event_time: 0, coefficient: 0.038 },
  { event_time: 1, coefficient: 0.089 },
  { event_time: 2, coefficient: 0.126 },
  { event_time: 3, coefficient: 0.142 }
];

export const balanceData = [
  { covariate: "building_density", smd_before: 0.38, smd_after: 0.08 },
  { covariate: "land_use_mix", smd_before: 0.29, smd_after: 0.06 },
  { covariate: "walkability", smd_before: 0.34, smd_after: 0.07 },
  { covariate: "heritage_constraint", smd_before: 0.42, smd_after: 0.1 }
];

export const heatmapData = [
  ["waterfront_accessibility", "public_space_improvement", 0.78],
  ["waterfront_accessibility", "green_view_index", 0.63],
  ["heritage_integrity", "cultural_identity_score", 0.72],
  ["tourism_business_density", "nighttime_consumption", 0.58],
  ["transit_accessibility", "office_poi_growth", 0.45]
];
