import { modelMetrics, shapImportance, thresholdCards } from "@/lib/mock-data";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function getDashboardSummary() {
  return safeFetch("/api/dashboard-summary", {
    uei: { mean_uei: 0.75, level_counts: [] },
    model: { best_model: "XGBoostRegressor", metrics: modelMetrics },
    thresholds: thresholdCards,
    data_profile: { sample_count: 1000, variable_count: 70, completeness: 0.984, time_span: [2018, 2024] }
  });
}

export async function getShapSummary() {
  return safeFetch("/api/shap-summary", shapImportance);
}

export async function getThresholdResults() {
  return safeFetch("/api/threshold-results", thresholdCards);
}

export function exportUrl(fileName: string) {
  return `${API_BASE}/api/export/${fileName}`;
}

async function safeFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!response.ok) return fallback;
    return response.json();
  } catch {
    return fallback;
  }
}
