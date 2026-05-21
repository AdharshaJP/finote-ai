import { useEffect, useState, useCallback } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { api } from '../services/api.js';
import {
  BarChart3, AlertTriangle, RefreshCw, TrendingDown,
  Calendar, Clock, DollarSign, Target,
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip, Legend);

const parseAdvice = (raw) => {
  if (!raw) return [];
  const sections = [];
  const lines = raw.split('\n');
  let current = null;
  let buffer = [];
  for (const line of lines) {
    const m = line.match(/^\*\*(.+?)\*\*/);
    if (m) {
      if (current) sections.push({ title: current, body: buffer.join('\n').trim() });
      current = m[1];
      buffer = [line.replace(/^\*\*.+?\*\*\s*/, '')];
    } else if (current) {
      buffer.push(line);
    }
  }
  if (current) sections.push({ title: current, body: buffer.join('\n').trim() });
  return sections.length ? sections : [{ title: 'AI Forecast', body: raw }];
};

const AIPredictions = ({ userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/ai/predict/${userId}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return (
    <div className="insights-loading">
      <div className="insights-spinner" />
      <p>Running spending forecast...</p>
    </div>
  );
  if (error) return (
    <div className="insights-error">
      <AlertTriangle size={40} /><p>{error}</p>
      <button className="btn btn-primary" onClick={fetch_}>Retry</button>
    </div>
  );
  if (!data || data.message) return (
    <div className="insights-empty">
      <BarChart3 size={48} /><p>Add some transactions to generate predictions.</p>
    </div>
  );

  const { chartData } = data;
  const sections = parseAdvice(data.aiAdvice);

  const daysLeftColor = data.predictedDaysLeft < 15 ? '#EF4444'
    : data.predictedDaysLeft < 30 ? '#F59E0B' : '#10B981';

  // Build combined forecast chart (historical solid, predicted dashed)
  const forecastLabels = chartData?.spendingForecast?.labels || [];
  const historicalData = chartData?.spendingForecast?.historical || [];
  const predictedData = chartData?.spendingForecast?.predicted || [];

  const forecastChart = forecastLabels.length && {
    labels: forecastLabels,
    datasets: [
      {
        label: 'Historical',
        data: historicalData,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        spanGaps: false,
      },
      {
        label: 'Predicted',
        data: predictedData,
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245,158,11,0.08)',
        borderWidth: 2.5,
        borderDash: [6, 4],
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#F59E0B',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        spanGaps: false,
      },
    ],
  };

  const catChart = chartData?.categoryRisk?.labels?.length && {
    labels: chartData.categoryRisk.labels,
    datasets: [{
      data: chartData.categoryRisk.data,
      backgroundColor: chartData.categoryRisk.colors,
      borderWidth: 2,
      borderColor: 'var(--card-bg)',
      hoverOffset: 8,
    }],
  };

  return (
    <div className="insights-root">
      <div className="insights-header">
        <div>
          <h2 className="insights-title"><BarChart3 size={22} /> Spending Predictions</h2>
          <p className="insights-subtitle">AI-powered 3-month forecast · Linear regression analysis</p>
        </div>
        <button className="btn btn-secondary btn-small" onClick={fetch_}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="insights-kpi-grid">
        <div className="insights-kpi-card income">
          <div className="kpi-label">Daily Avg Spend</div>
          <div className="kpi-value">₹{Number(data.dailyAvg).toLocaleString()}</div>
          <DollarSign size={18} className="kpi-icon" />
        </div>
        <div className="insights-kpi-card expense">
          <div className="kpi-label">Monthly Projection</div>
          <div className="kpi-value">₹{Number(data.monthlyProjection).toLocaleString()}</div>
          <Calendar size={18} className="kpi-icon" />
        </div>
        <div className="insights-kpi-card" style={{ '--kpi-accent': daysLeftColor }}>
          <div className="kpi-label">Days Left (Est.)</div>
          <div className="kpi-value" style={{ color: daysLeftColor }}>{data.predictedDaysLeft}</div>
          <Clock size={18} className="kpi-icon" />
        </div>
        <div className="insights-kpi-card savings">
          <div className="kpi-label">3-Month Balance</div>
          <div className="kpi-value" style={{ color: data.projectedBalance3M < 0 ? '#EF4444' : 'inherit' }}>
            ₹{Number(data.projectedBalance3M).toLocaleString()}
          </div>
          <Target size={18} className="kpi-icon" />
        </div>
      </div>

      {/* Forecast chart */}
      {forecastChart && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Spending Forecast (Historical + Predicted)</h3>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-light)' }}>
              <span style={{ color: '#3B82F6' }}>── Historical</span>
              <span style={{ color: '#F59E0B' }}>- - Predicted</span>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <Line
              data={forecastChart}
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

      {/* Category risk + burn rate */}
      <div className="insights-charts-row">
        {catChart && (
          <div className="card insights-chart-card">
            <div className="card-header">
              <h3 className="card-title">Category Risk</h3>
            </div>
            <div style={{ height: 200 }}>
              <Doughnut
                data={catChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '65%',
                  plugins: { legend: { position: 'bottom', labels: { padding: 10, font: { size: 11 } } } },
                }}
              />
            </div>
          </div>
        )}

        <div className="card insights-chart-card">
          <div className="card-header">
            <h3 className="card-title">Burn Rate Analysis</h3>
          </div>
          <div className="predict-burn-stats">
            <div className="predict-burn-row">
              <span>Current Balance</span>
              <span className="predict-burn-val">₹{data.balance.toLocaleString()}</span>
            </div>
            <div className="predict-burn-row">
              <span>Safe Buffer (15 days)</span>
              <span className="predict-burn-val warning">₹{Number(data.safeBuffer).toLocaleString()}</span>
            </div>
            <div className="predict-burn-row">
              <span>Daily Burn Rate</span>
              <span className="predict-burn-val danger">₹{Number(data.dailyAvg).toFixed(0)}/day</span>
            </div>
            <div className="predict-burn-row">
              <span>Savings Rate</span>
              <span className="predict-burn-val">{data.savingsRate ?? '—'}%</span>
            </div>
            <div className="predict-burn-progress-wrap">
              <div className="predict-burn-label">
                <span>Balance Safety</span>
                <span>{Math.min(100, Math.round((data.balance / (data.balance + Number(data.safeBuffer))) * 100))}%</span>
              </div>
              <div className="predict-burn-bar">
                <div
                  className="predict-burn-fill"
                  style={{
                    width: `${Math.min(100, Math.round((data.balance / (data.balance + Number(data.safeBuffer))) * 100))}%`,
                    background: daysLeftColor,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Advice sections */}
      <div className="card insights-advice-card">
        <div className="card-header">
          <h3 className="card-title"><TrendingDown size={18} /> AI Forecast Analysis</h3>
          <span className="insights-ai-badge">AI Generated</span>
        </div>
        <div className="insights-advice-grid">
          {sections.map((s, i) => (
            <div key={i} className={`insights-advice-section ${['insight', 'warning', 'recommendation'][i % 3]}`}>
              <div className="advice-section-title">{s.title}</div>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIPredictions;
