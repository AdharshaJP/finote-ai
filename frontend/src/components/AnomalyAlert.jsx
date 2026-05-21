import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Cpu, WifiOff, Info } from 'lucide-react';
import { api } from '../services/api.js';

const AnomalyAlert = ({ userId }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch_ = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/ai/anomaly/${userId}`);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to run anomaly check');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  /* ── Loading ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="anomaly-card anomaly-loading">
        <div className="anomaly-spinner" />
        <span>Running ML anomaly detection…</span>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="anomaly-card anomaly-error">
        <AlertTriangle size={16} />
        <span>{error}</span>
        <button className="anomaly-refresh-btn" onClick={fetch_}>
          <RefreshCw size={13} />
        </button>
      </div>
    );
  }

  /* ── No data ─────────────────────────────────────────────────── */
  if (!data || data.totalExpenses === 0) {
    return (
      <div className="anomaly-card anomaly-info">
        <div className="anomaly-icon-wrap info"><Info size={16} /></div>
        <div className="anomaly-body">
          <span className="anomaly-title">Anomaly Detection</span>
          <span className="anomaly-message">{data?.message || 'No expense data yet.'}</span>
        </div>
      </div>
    );
  }

  /* ── Service offline fallback ────────────────────────────────── */
  if (data._serviceAvailable === false && data.method === 'fallback') {
    return (
      <div className="anomaly-card anomaly-offline">
        <div className="anomaly-icon-wrap offline"><WifiOff size={16} /></div>
        <div className="anomaly-body">
          <span className="anomaly-title">ML Service Offline</span>
          <span className="anomaly-message">{data.message}</span>
        </div>
        <button className="anomaly-refresh-btn" onClick={fetch_} title="Retry">
          <RefreshCw size={13} />
        </button>
      </div>
    );
  }

  const isAnomaly = data.isAnomaly;

  /* ── Anomaly detected ────────────────────────────────────────── */
  if (isAnomaly) {
    return (
      <div className="anomaly-card anomaly-alert">
        {/* Left accent bar via CSS */}
        <div className="anomaly-icon-wrap alert">
          <AlertTriangle size={18} />
        </div>

        <div className="anomaly-body">
          <div className="anomaly-header-row">
            <span className="anomaly-title">Spending Anomaly Detected</span>
            <span className="anomaly-badge alert">⚠ Anomaly</span>
          </div>
          <span className="anomaly-message">{data.message}</span>

          <div className="anomaly-metrics">
            <div className="anomaly-metric">
              <span className="anomaly-metric-label">Latest</span>
              <span className="anomaly-metric-val alert">₹{data.latestExpense?.toLocaleString()}</span>
            </div>
            <div className="anomaly-metric">
              <span className="anomaly-metric-label">Avg Spend</span>
              <span className="anomaly-metric-val">₹{data.mean?.toLocaleString()}</span>
            </div>
            <div className="anomaly-metric">
              <span className="anomaly-metric-label">Z-Score</span>
              <span className="anomaly-metric-val alert">{data.zScore > 0 ? '+' : ''}{data.zScore?.toFixed(2)}</span>
            </div>
            {data.sevenDayAvg !== null && data.sevenDayAvg !== undefined && (
              <div className="anomaly-metric">
                <span className="anomaly-metric-label">7-Txn Avg</span>
                <span className="anomaly-metric-val">₹{data.sevenDayAvg?.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="anomaly-side">
          <div className="anomaly-method-badge">
            <Cpu size={11} /> {data.method}
          </div>
          <button className="anomaly-refresh-btn" onClick={fetch_} title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>
    );
  }

  /* ── Normal ──────────────────────────────────────────────────── */
  return (
    <div className="anomaly-card anomaly-normal">
      <div className="anomaly-icon-wrap normal">
        <CheckCircle size={18} />
      </div>

      <div className="anomaly-body">
        <div className="anomaly-header-row">
          <span className="anomaly-title">Spending Within Normal Range</span>
          <span className="anomaly-badge normal">✓ Normal</span>
        </div>
        <span className="anomaly-message">{data.message}</span>

        <div className="anomaly-metrics">
          <div className="anomaly-metric">
            <span className="anomaly-metric-label">Latest</span>
            <span className="anomaly-metric-val">₹{data.latestExpense?.toLocaleString()}</span>
          </div>
          <div className="anomaly-metric">
            <span className="anomaly-metric-label">Avg Spend</span>
            <span className="anomaly-metric-val">₹{data.mean?.toLocaleString()}</span>
          </div>
          <div className="anomaly-metric">
            <span className="anomaly-metric-label">Z-Score</span>
            <span className="anomaly-metric-val">{data.zScore > 0 ? '+' : ''}{data.zScore?.toFixed(2)}</span>
          </div>
          {data.sevenDayAvg !== null && data.sevenDayAvg !== undefined && (
            <div className="anomaly-metric">
              <span className="anomaly-metric-label">7-Txn Avg</span>
              <span className="anomaly-metric-val">₹{data.sevenDayAvg?.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      <div className="anomaly-side">
        <div className="anomaly-method-badge">
          <Cpu size={11} /> {data.method}
        </div>
        <button className="anomaly-refresh-btn" onClick={fetch_} title="Refresh">
          <RefreshCw size={13} />
        </button>
      </div>
    </div>
  );
};

export default AnomalyAlert;
