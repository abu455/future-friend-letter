# Urban Renewal Intelligence Lab

An SCI-oriented empirical platform for evaluating urban renewal effectiveness with multi-source urban data, UEI index construction, machine learning prediction, SHAP explainability, threshold detection, spatial heterogeneity, and DID / PSM-DID quasi-causal tests.

## Case studies

- Shanghai Longhua Airport renewal into Shanghai West Bund
- Quzhou Shuitingmen Historical Cultural District renewal

## Project structure

- `backend/`: FastAPI analytical service
- `frontend/`: Next.js + TypeScript + Tailwind CSS research dashboard
- `sample_data/`: generated CSV and GeoJSON demo data
- `outputs/`: generated UEI, model, SHAP, threshold, causal, and report artifacts
- `models/`: persisted best model, including `best_model.pkl`

## Backend setup

```bash
cd urban-renewal-ai
python3 -m pip install -r backend/requirements.txt
python3 backend/sample_data_generator.py
python3 -m uvicorn backend.main:app --reload --port 8000
```

If `xgboost`, `lightgbm`, `shap`, or `geopandas` are unavailable, the API keeps running and falls back to RandomForest or deterministic explainability approximations where needed.

## Frontend setup

```bash
cd urban-renewal-ai/frontend
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run dev
```

Open `http://localhost:3000`.

## Main API endpoints

- `POST /api/upload`
- `POST /api/preprocess`
- `POST /api/calculate-index`
- `POST /api/train-model`
- `GET /api/model-metrics`
- `POST /api/shap-analysis`
- `GET /api/shap-summary`
- `GET /api/shap-map`
- `POST /api/threshold-analysis`
- `GET /api/threshold-results`
- `POST /api/causal-analysis`
- `GET /api/causal-results`
- `GET /api/dashboard-summary`
- `POST /api/generate-report`
- `GET /api/export/{artifact_name}`

## Exported artifacts

- `model_metrics.csv`
- `uei_result.csv`
- `shap_importance.csv`
- `threshold_results.csv`
- `did_results.csv`
- `final_report.md`

## Demo workflow

```bash
cd urban-renewal-ai
python3 backend/sample_data_generator.py
python3 - <<'PY'
import sys
sys.path.insert(0, "backend")
from main import preprocess, calculate_index, train_model, shap_analysis, threshold_analysis, causal_analysis, generate_final_report
print(preprocess())
print(calculate_index())
print(train_model({"target": "uei_score"})["best_model"])
print(shap_analysis()["model_name"])
print(len(threshold_analysis()))
print(causal_analysis()["did_results"][0])
print(generate_final_report())
PY
```
