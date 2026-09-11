"""Crypto Scam Risk Detector backend API.
Serves the actual trained Logistic Regression / Random Forest models
(from the dissertation's real Elliptic + Ethereum pipeline) over a REST API.

Run with:
    pip install -r requirements.txt
    python app.py
Then it listens on http://localhost:5001
"""

import os
import json
import joblib
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_DIR = os.path.join(BASE_DIR, "data")

app = Flask(__name__)
frontend_origin = os.getenv("FRONTEND_ORIGIN", "*")
CORS(app, resources={r"/api/*": {"origins": frontend_origin}})

# Load real trained artifacts once at startup
lr_ell = joblib.load(os.path.join(MODELS_DIR, "lr_elliptic.joblib"))
scaler_ell = joblib.load(os.path.join(MODELS_DIR, "scaler_elliptic.joblib"))
rf_ell = joblib.load(os.path.join(MODELS_DIR, "rf_elliptic.joblib"))

lr_eth = joblib.load(os.path.join(MODELS_DIR, "lr_ethereum.joblib"))
scaler_eth = joblib.load(os.path.join(MODELS_DIR, "scaler_ethereum.joblib"))
rf_eth = joblib.load(os.path.join(MODELS_DIR, "rf_ethereum.joblib"))

with open(os.path.join(MODELS_DIR, "lr_results.json")) as f:
    LR_RESULTS = json.load(f)
with open(os.path.join(MODELS_DIR, "rf_results.json")) as f:
    RF_RESULTS = json.load(f)

ell_test = pd.read_csv(os.path.join(DATA_DIR, "elliptic_test.csv"))
eth_test = pd.read_csv(os.path.join(DATA_DIR, "ethereum_test.csv"))

ELL_FEAT_COLS = [c for c in ell_test.columns if c.startswith("feat_")]
ETH_FEAT_COLS = [c for c in eth_test.columns if c not in ["Address", "FLAG"]]

RISK_LOW_MAX = 0.3
RISK_HIGH_MIN = 0.7


def risk_band(score: float) -> str:
    if score < RISK_LOW_MAX:
        return "Low"
    if score < RISK_HIGH_MIN:
        return "Medium"
    return "High"


# Routes
@app.route("/")
def index():
    return jsonify({"service": "Verxia API", "status": "ok", "health": "/api/health"})


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/api/model_comparison")
def model_comparison():
    """Real LR vs RF metrics, both datasets, from the actual saved results."""
    return jsonify({
        "elliptic": {"logistic_regression": LR_RESULTS["elliptic_lr"], "random_forest": RF_RESULTS["elliptic_rf"]},
        "ethereum": {"logistic_regression": LR_RESULTS["ethereum_lr"], "random_forest": RF_RESULTS["ethereum_rf"]},
    })


@app.route("/api/feature_importance/<dataset>")
def feature_importance(dataset):
    if dataset == "elliptic":
        imp = pd.Series(rf_ell.feature_importances_, index=ELL_FEAT_COLS).sort_values(ascending=False).head(10)
    elif dataset == "ethereum":
        imp = pd.Series(rf_eth.feature_importances_, index=ETH_FEAT_COLS).sort_values(ascending=False).head(10)
    else:
        return jsonify({"error": "dataset must be 'elliptic' or 'ethereum'"}), 400
    return jsonify([{"feature": k, "importance": float(v)} for k, v in imp.items()])


@app.route("/api/risk_distribution/<dataset>")
def risk_distribution(dataset):
    """Runs the real RF model across the full test set and bands every row."""
    if dataset == "elliptic":
        probs = rf_ell.predict_proba(ell_test[ELL_FEAT_COLS])[:, 1]
        labels = ell_test["label"]
    elif dataset == "ethereum":
        probs = rf_eth.predict_proba(eth_test[ETH_FEAT_COLS])[:, 1]
        labels = eth_test["FLAG"]
    else:
        return jsonify({"error": "dataset must be 'elliptic' or 'ethereum'"}), 400

    bands = pd.Series([risk_band(p) for p in probs])
    df = pd.DataFrame({"band": bands, "label": labels.values})
    result = []
    for band in ["Low", "Medium", "High"]:
        subset = df[df["band"] == band]
        result.append({
            "band": band,
            "count": int(len(subset)),
            "actual_positive_rate": float(subset["label"].mean()) if len(subset) else 0.0,
        })
    return jsonify(result)


@app.route("/api/samples/<dataset>")
def samples(dataset):
    """Returns a handful of real test-set rows to pick from (id + true label only)."""
    n = int(request.args.get("n", 15))
    if dataset == "elliptic":
        sample = ell_test.sample(n=min(n, len(ell_test)), random_state=1)
        return jsonify([{"id": str(row.txId), "true_label": int(row.label)} for row in sample.itertuples()])
    elif dataset == "ethereum":
        sample = eth_test.sample(n=min(n, len(eth_test)), random_state=1)
        return jsonify([{"id": row.Address, "true_label": int(row.FLAG)} for row in sample.itertuples()])
    return jsonify({"error": "dataset must be 'elliptic' or 'ethereum'"}), 400


@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Body: {"dataset": "elliptic"|"ethereum", "id": "<txId or Address>", "model": "rf"|"lr"}
    Runs the REAL trained model on that REAL test-set row and returns a live prediction.
    """
    payload = request.get_json()
    dataset = payload.get("dataset")
    row_id = payload.get("id")
    model_choice = payload.get("model", "rf")

    if dataset == "elliptic":
        row = ell_test[ell_test["txId"].astype(str) == str(row_id)]
        if row.empty:
            return jsonify({"error": "id not found"}), 404
        X = row[ELL_FEAT_COLS]
        true_label = int(row["label"].iloc[0])
        if model_choice == "lr":
            score = float(lr_ell.predict_proba(scaler_ell.transform(X))[0, 1])
        else:
            score = float(rf_ell.predict_proba(X)[0, 1])

    elif dataset == "ethereum":
        row = eth_test[eth_test["Address"] == row_id]
        if row.empty:
            return jsonify({"error": "id not found"}), 404
        X = row[ETH_FEAT_COLS]
        true_label = int(row["FLAG"].iloc[0])
        if model_choice == "lr":
            score = float(lr_eth.predict_proba(scaler_eth.transform(X))[0, 1])
        else:
            score = float(rf_eth.predict_proba(X)[0, 1])
    else:
        return jsonify({"error": "dataset must be 'elliptic' or 'ethereum'"}), 400

    return jsonify({
        "id": row_id,
        "dataset": dataset,
        "model": model_choice,
        "risk_score": round(score, 4),
        "risk_band": risk_band(score),
        "true_label": true_label,  # included for demo/viva purposes only
    })


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5001)

