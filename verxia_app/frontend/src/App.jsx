import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";
import verxiaLogo from "./assets/verxia-logo.png";
import "./App.css";

const API_BASE = "https://verxia-backend.onrender.com/api";

const NAVY = "#1E3A5F";
const RED = "#DC2626";
const ORANGE = "#F59E0B";
const GREEN = "#22C55E";

const bandColor = { Low: GREEN, Medium: ORANGE, High: RED };

function MetricRow({ label, lr, rf }) {
  const rfBetter = rf > lr;
  return (
    <tr>
      <td className="metric-label">{label}</td>
      <td>{(lr * 100).toFixed(1)}%</td>
      <td className={rfBetter ? "winner" : ""}>{(rf * 100).toFixed(1)}%</td>
    </tr>
  );
}

export default function App() {
  const [dataset, setDataset] = useState("ethereum");
  const [samples, setSamples] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [modelChoice, setModelChoice] = useState("rf");
  const [prediction, setPrediction] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [importance, setImportance] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
  setPrediction(null);
  setError(null);
  setSamples([]);

  const loadSamples = () =>
    fetch(`${API_BASE}/samples/${dataset}?n=200`).then((r) => {
      if (!r.ok) throw new Error(`Backend returned ${r.status}`);
      return r.json();
    });

  loadSamples()
    .then((data) => {
      setSamples(data);
      setSelectedId(data[0]?.id ?? "");
    })
    .catch(() => {
      setError("Backend is waking up, retrying in a few seconds...");
      setTimeout(() => {
        loadSamples()
          .then((data) => {
            setSamples(data);
            setSelectedId(data[0]?.id ?? "");
            setError(null);
          })
          .catch(() => setError("Could not reach the backend. Please refresh the page."));
      }, 8000);
    });

  fetch(`${API_BASE}/feature_importance/${dataset}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(setImportance)
    .catch(() => {});

  fetch(`${API_BASE}/risk_distribution/${dataset}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(setDistribution)
    .catch(() => {});
}, [dataset]);

  useEffect(() => {
    fetch(`${API_BASE}/model_comparison`).then((r) => r.json()).then(setComparison);
  }, []);

  const handleAnalyse = () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset, id: selectedId, model: modelChoice }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Prediction failed");
        return r.json();
      })
      .then((data) => setPrediction(data))
      .catch(() => setError("Prediction request failed. Check the backend is running."))
      .finally(() => setLoading(false));
  };

  const comp = comparison?.[dataset];

  return (
    <div className="app">
      <header className="header">
        <img src={verxiaLogo} alt="Verxia" className="logo" />
        <h1>Verxia</h1>
        <p className="tagline">Predict. Detect. Protect.</p>
        <p className="subtitle">
          Cryptocurrency Scam Risk Platform: live predictions from real trained Logistic Regression &amp; Random Forest models
        </p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="card">
        <h2>1. Choose a dataset</h2>
        <div className="dataset-toggle">
          <button
            className={dataset === "elliptic" ? "active" : ""}
            onClick={() => setDataset("elliptic")}
          >
            Elliptic (Bitcoin)
          </button>
          <button
            className={dataset === "ethereum" ? "active" : ""}
            onClick={() => setDataset("ethereum")}
          >
            Ethereum
          </button>
        </div>
      </section>

      <section className="card">
        <h2>2. Pick a real transaction/account from the test set</h2>
        <p className="hint">
          These are real held-out {dataset === "elliptic" ? "transactions" : "accounts"} the model has never
          been trained on, not synthetic examples.
        </p>
        <select
  value={selectedId}
  onChange={(e) => setSelectedId(e.target.value)}
  className="id-select"
  disabled={samples.length === 0}
>
  {samples.length === 0 ? (
    <option value="">Loading cases...</option>
  ) : (
    samples.map((s) => (
      <option key={s.id} value={s.id}>
        {s.id.length > 20 ? s.id.slice(0, 18) + "…" : s.id}
      </option>
    ))
  )}
</select>

        <div className="model-toggle">
          <label>
            <input type="radio" checked={modelChoice === "rf"} onChange={() => setModelChoice("rf")} />
            Random Forest
          </label>
          <label>
            <input type="radio" checked={modelChoice === "lr"} onChange={() => setModelChoice("lr")} />
            Logistic Regression
          </label>
        </div>

        <button className="analyse-btn" onClick={handleAnalyse} disabled={loading}>
          {loading ? "Analysing..." : "Analyse"}
        </button>

        {prediction && (
          <div className="result" style={{ borderColor: bandColor[prediction.risk_band] }}>
            <div className="result-score">
              <span className="score-value">{prediction.risk_score.toFixed(3)}</span>
              <span className="score-label">Risk Score (0-1)</span>
            </div>
            <div className="result-band" style={{ background: bandColor[prediction.risk_band] }}>
              {prediction.risk_band.toUpperCase()} RISK
            </div>
            <p className="ground-truth">
              Ground truth label for this {dataset === "elliptic" ? "transaction" : "account"}:{" "}
              <strong>{prediction.true_label === 1 ? "Illicit/Fraud" : "Licit/Legitimate"}</strong>{" "}
              <span className="disclaimer">(shown for demo purposes; a real system would not have this)</span>
            </p>
          </div>
        )}
      </section>

      <section className="card">
        <h2>3. Model comparison: Logistic Regression vs Random Forest ({dataset})</h2>
        {comp ? (
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Logistic Regression</th>
                <th>Random Forest</th>
              </tr>
            </thead>
            <tbody>
              <MetricRow label="Accuracy" lr={comp.logistic_regression.accuracy} rf={comp.random_forest.accuracy} />
              <MetricRow label="Precision" lr={comp.logistic_regression.precision} rf={comp.random_forest.precision} />
              <MetricRow label="Recall" lr={comp.logistic_regression.recall} rf={comp.random_forest.recall} />
              <MetricRow label="F1-score" lr={comp.logistic_regression.f1} rf={comp.random_forest.f1} />
              <MetricRow label="ROC-AUC" lr={comp.logistic_regression.roc_auc} rf={comp.random_forest.roc_auc} />
            </tbody>
          </table>
        ) : (
          <p>Loading...</p>
        )}
      </section>

      <section className="card">
        <h2>4. Top feature importances (Random Forest, {dataset})</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={importance} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="feature" width={180} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => v.toFixed(4)} />
            <Bar dataKey="importance" fill={NAVY} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="card">
        <h2>5. Risk band distribution (full test set, {dataset})</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={distribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="band" />
            <YAxis />
            <Tooltip
              formatter={(value, name) =>
                name === "count" ? [value, "Count"] : [(value * 100).toFixed(1) + "%", "Actual positive rate"]
              }
            />
            <Bar dataKey="count">
              {distribution.map((d) => (
                <Cell key={d.band} fill={bandColor[d.band]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <table className="distribution-table">
          <thead>
            <tr><th>Band</th><th>Count</th><th>Actual illicit/fraud rate</th></tr>
          </thead>
          <tbody>
            {distribution.map((d) => (
              <tr key={d.band}>
                <td style={{ color: bandColor[d.band], fontWeight: 700 }}>{d.band}</td>
                <td>{d.count}</td>
                <td>{(d.actual_positive_rate * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

    </div>
  );
}
