import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { aiAPI } from '../services/api.js';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js';
import { DollarSign, CheckCircle, AlertTriangle, XCircle, Loader, ShoppingCart, Lightbulb } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const DECISION_CONFIG = {
  YES: { icon: CheckCircle, label: 'Go For It!', color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: '#10B981' },
  RISKY: { icon: AlertTriangle, label: 'Proceed with Caution', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: '#F59E0B' },
  NO: { icon: XCircle, label: 'Not Right Now', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: '#EF4444' },
};

const AffordCheck = ({ userId }) => {
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!item.trim() || !amount || !userId) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await aiAPI.afford(userId, item.trim(), Number(amount));
      setResult(res.data);
    } catch {
      setError('Could not check affordability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? DECISION_CONFIG[result.decision] || DECISION_CONFIG.NO : null;

  // Budget breakdown bar chart
  const barChart = result?.chartData?.budgetBreakdown && {
    labels: result.chartData.budgetBreakdown.labels,
    datasets: [{
      label: '₹',
      data: result.chartData.budgetBreakdown.data,
      backgroundColor: result.chartData.budgetBreakdown.colors,
      borderColor: result.chartData.budgetBreakdown.colors,
      borderWidth: 2,
      borderRadius: 8,
    }],
  };

  // Balance impact visual
  const impactPct = result
    ? Math.min(100, Math.round((Math.abs(result.purchaseAmount) / result.balance) * 100))
    : 0;

  return (
    <div className="afford-root">
      {/* Hero input card */}
      <div className="card afford-input-card">
        <div className="afford-input-header">
          <div className="afford-input-icon"><ShoppingCart size={24} /></div>
          <div>
            <h2 className="afford-input-title">Can I Afford This?</h2>
            <p className="afford-input-sub">AI-powered purchase analysis based on your real financial data</p>
          </div>
        </div>

        <form onSubmit={handleCheck} className="afford-form">
          <div className="afford-fields">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">What do you want to buy?</label>
              <input
                className="form-input"
                placeholder="e.g. iPhone 15, New Laptop, Vacation..."
                value={item}
                onChange={e => setItem(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Amount (₹)</label>
              <input
                className="form-input"
                type="number"
                placeholder="e.g. 50000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="1"
                required
              />
            </div>
          </div>
          <button className="btn btn-primary afford-submit-btn" disabled={loading}>
            {loading ? (
              <><Loader size={16} className="spin" /> Analyzing your finances...</>
            ) : (
              <><DollarSign size={16} /> Check Affordability</>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="afford-error">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {result && cfg && (
        <>
          {/* Decision card */}
          <div
            className="card afford-decision-card"
            style={{ borderColor: cfg.border, background: cfg.bg }}
          >
            <div className="afford-decision-content">
              <cfg.icon size={56} style={{ color: cfg.color }} className="afford-decision-icon" />
              <div>
                <div className="afford-decision-label" style={{ color: cfg.color }}>{cfg.label}</div>
                <div className="afford-decision-item">"{result.purchaseAmount !== undefined ? `₹${Number(result.purchaseAmount).toLocaleString()}` : ''} for {item}"</div>
                <div className="afford-confidence-badge" style={{ borderColor: cfg.color, color: cfg.color }}>
                  {result.confidence} Confidence
                </div>
              </div>
            </div>

            {/* Balance impact bar */}
            <div className="afford-impact-section">
              <div className="afford-impact-label">
                <span>Purchase Impact on Balance</span>
                <span style={{ color: cfg.color }}>{impactPct}%</span>
              </div>
              <div className="afford-impact-bar">
                <div className="afford-impact-fill" style={{ width: `${impactPct}%`, background: cfg.color }} />
              </div>
            </div>
          </div>

          {/* Metrics row */}
          <div className="afford-metrics-grid">
            <div className="afford-metric-card">
              <div className="afford-metric-label">Current Balance</div>
              <div className="afford-metric-value">₹{Number(result.balance).toLocaleString()}</div>
            </div>
            <div className="afford-metric-card">
              <div className="afford-metric-label">Purchase Amount</div>
              <div className="afford-metric-value danger">₹{Number(result.purchaseAmount ?? amount).toLocaleString()}</div>
            </div>
            <div className="afford-metric-card">
              <div className="afford-metric-label">Balance After</div>
              <div className="afford-metric-value" style={{ color: result.balanceAfter < 0 ? '#EF4444' : 'inherit' }}>
                ₹{Number(result.balanceAfter).toLocaleString()}
              </div>
            </div>
            <div className="afford-metric-card">
              <div className="afford-metric-label">Safety Buffer (15d)</div>
              <div className="afford-metric-value warning">₹{Number(result.safeBuffer).toLocaleString()}</div>
            </div>
          </div>

          {/* Budget breakdown chart */}
          {barChart && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Budget Breakdown</h3>
              </div>
              <div style={{ height: 200 }}>
                <Bar
                  data={barChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
                      x: { grid: { display: false } },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* AI Reasoning */}
          <div className="card afford-reason-card">
            <div className="card-header">
              <h3 className="card-title"><Lightbulb size={18} /> AI Reasoning</h3>
              <span className="insights-ai-badge">AI Generated</span>
            </div>
            <p className="afford-reason-text">{result.aiReason}</p>
            <div className="afford-reason-meta">
              <span>Daily spending: ₹{Number(result.dailyAvg).toFixed(0)}/day</span>
              <span>·</span>
              <span>Buffer covers {Math.round(result.safeBuffer / result.dailyAvg)} days</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AffordCheck;
