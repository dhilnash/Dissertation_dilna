# Verxia: Crypto Scam Risk Platform, Full-Stack Prototype

A working React + Flask prototype that serves live predictions from the
dissertation's actual trained Logistic Regression and Random Forest models
(Elliptic + Ethereum). Every number shown, including model metrics, feature
importances, risk band distribution, and individual predictions, is
computed live by the real `.joblib` models, not hardcoded.

**Important:** this needs to be run on your own machine. Two servers run
side by side (backend on port 5001, frontend on port 5173) and talk to
each other over localhost. It cannot run inside a chat window.

## Project structure
```
verxia/
├── backend/
│   ├── app.py              <- Flask API serving the real trained models
│   ├── requirements.txt
│   ├── models/              <- the actual .joblib models + results.json
│   └── data/                 <- elliptic_test.csv, ethereum_test.csv
└── frontend/
    ├── src/
    │   ├── App.jsx           <- main React component
    │   └── App.css
    └── package.json
```

## 1. Start the backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```
This starts the API on **http://localhost:5001**. Leave this terminal running.

Quick check it's working:
```bash
curl http://localhost:5001/api/health
# should return {"status":"ok"}
```

## 2. Start the frontend (in a second terminal)
```bash
cd frontend
npm install
npm run dev
```
This starts the app on **http://localhost:5173**. Open that URL in your browser.

## What it does
1. **Choose a dataset:** Elliptic (Bitcoin transactions) or Ethereum (accounts)
2. **Pick a real held-out test-set transaction/account** from a dropdown.
   these are real rows the model was never trained on, not made up
3. **Choose Random Forest or Logistic Regression**, then click **Analyse**. The
   backend runs that exact model on that exact row and returns a live
   0-1 risk score and Low/Medium/High band.
4. **Model comparison table:** the real accuracy/precision/recall/F1/ROC-AUC
   for both models on the selected dataset
5. **Feature importance chart:** the real Random Forest feature importances.
6. **Risk band distribution:** bands the entire test set live and shows the
   actual illicit/fraud rate within each band, matching the dissertation's
   Results chapter exactly

## API endpoints (backend)
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Check the server is up |
| `/api/model_comparison` | GET | LR vs RF metrics, both datasets |
| `/api/feature_importance/<dataset>` | GET | Top 10 RF feature importances |
| `/api/risk_distribution/<dataset>` | GET | Live-computed Low/Medium/High bands across the full test set |
| `/api/samples/<dataset>?n=20` | GET | A random sample of real test-set IDs to pick from |
| `/api/predict` | POST | `{"dataset": "...", "id": "...", "model": "rf"|"lr"}` → live risk score |

## Notes for your dissertation write-up
- The `true_label` returned by `/api/predict` is included only for demo/viva
   purposes, so you can show the model getting real cases right or wrong.
  a genuinely deployed version would not have access to the ground truth.
- This prototype was not required by the approved proposal (which specifies
   a trained model, not a deployed application). It is an additional
  practical demonstration layer, worth describing as such in Chapter 5
  (Design & Implementation) rather than as a core deliverable.
- All backend logic was tested end-to-end (both servers running
  simultaneously, real HTTP requests, real model inference) before delivery.
