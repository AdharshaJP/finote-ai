import { useEffect, useState, useCallback } from 'react';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler,
} from 'chart.js';
import { api } from '../services/api.js';
import {
  Brain, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, Lightbulb, Shield,
  Target, Zap, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler);

// ── Health Score Arc (half-circle gauge) ─────────────────────────────────────
const HealthGauge = ({ score }) => {
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';
  const label = score >= 70 ? 'Excellent' : score >= 40 ? 'Fair' : 'At Risk';
  const bgColor = score >= 70 ? 'rgba(16,185,129,0.1)' : score >= 40 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';

  // Semi-circle arc
  const r = 60, cx = 80, cy = 80;
  const circumference = Math.PI * r; // half circle
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="health-gauge-wrap" style={{ background: bgColor }}>
      <svg width="160" height="90" viewBox="0 0 160 90" style={{ overflow: 'visible' }}>
        {/* Track */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none" stroke="var(--soft-border)" strokeWidth="12" strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="health-gauge-center">
        <div className="health-gauge-score" style={{ color }}>{score}</div>
        <div className="health-gauge-max">out of 100</div>
      </div>
      <div className="health-gauge-label" style={{ color, background: bgColor }}>{label}</div>
    </div>
  );
};

// ── Parse **Section** formatted AI text ──────────────────────────────────────
const parseAdvice = (raw) => {
  if (!raw) return {};
  const out = {};
  const lines = raw.split('\n');
  let cur = null, buf = [];
  for (const line of lines) {
    const m = line.match(/^\*\*(.+?)\*\*/);
    if (m) {
      if (cur) out[cur] = buf.join('\n').trim();
      cur = m[1]; buf = [line.replace(/^\*\*.+?\*\*\s*/, '')];
    } else if (cur) buf.push(line);
  }
  if (cur) out[cur] = buf.join('\n').trim();
  return out;
};

const TREND_META = {
  increasing: { Icon: TrendingUp, color: '#EF4444', label: 'Spending Rising' },
  decreasing: { Icon: TrendingDown, color: '#10B981', label: 'Spending Falling' },
  stable: { Icon: Minus, color: '#F59E0B', label: 'Stable' },
};

const RISK_META = {
  LOW: { Icon: CheckCircle, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  MEDIUM: { Icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  HIGH: { Icon: XCircle, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
};

// ── Chart default options ─────────────────────────────────────────────────────
const lineOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } } },
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
  },
  elements: { line: { tension: 0.4 } },
};

const barOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } } },
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
  },
};

// ── Main component ─────────────────────────────────────────────────────────────
const AIInsights = ({ userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    if (!userId) return;
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/ai/insights/${userId}`);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load insights');
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return (
    <div className="insights-loading">
      <div className="insights-spinner" />
      <p>Analyzing your finances with AI…</p>
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
      <Brain size={56} />
      <h3>No data yet</h3>
      <p>Add some transactions to unlock your AI financial insights.</p>
    </div>
  );

  const trend = TREND_META[data.trend] || TREND_META.stable;
  const risk = RISK_META[data.riskLevel] || RISK_META.MEDIUM;
  const advice = parseAdvice(data.aiAdvice);

  const savingsGood = data.savingsRate > 20;
  const balanceGood = data.balance >= 0;

  // ── Chart datasets ─────────────────────────────────────────────────────────
  const catChart = data.chartData?.categoryPie?.labels?.length ? {
    labels: data.chartData.categoryPie.labels,
    datasets: [{
      data: data.chartData.categoryPie.data,
      backgroundColor: data.chartData.categoryPie.colors,
      borderWidth: 3,
      borderColor: 'var(--card-bg)',
      hoverOffset: 12,
    }],
  } : null;

  const trendChart = data.chartData?.monthlyTrend?.labels?.length ? {
    labels: data.chartData.monthlyTrend.labels,
    datasets: [{
      label: 'Monthly Spend (₹)',
      data: data.chartData.monthlyTrend.data,
      borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.08)',
      borderWidth: 2.5, fill: true,
      pointBackgroundColor: '#3B82F6', pointBorderColor: '#fff',
      pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 8,
    }],
  } : null;

  const ivseChart = {
    labels: ['Income', 'Expenses', 'Balance'],
    datasets: [{
      data: [data.income, data.expense, Math.max(0, data.balance)],
      backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(239,68,68,0.85)', 'rgba(59,130,246,0.85)'],
      borderColor: ['#10B981', '#EF4444', '#3B82F6'],
      borderWidth: 2, borderRadius: 10,
    }],
  };

  return (
    <div className="insights-root">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="insights-header">
        <div>
          <h2 className="insights-title">
            <div className="insights-title-icon"><Brain size={20} /></div>
            AI Financial Insights
          </h2>
          <p className="insights-subtitle">Powered by Groq LLM · Live analysis of your transactions</p>
        </div>
        <button className="btn btn-secondary btn-small" onClick={fetch_}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── Hero summary card ──────────────────────────────────────────────── */}
      <div className="insights-hero-card">
        {/* Left: gauge */}
        <div className="insights-hero-left">
          <div className="insights-hero-label">Financial Health Score</div>
          <HealthGauge score={data.healthScore} />
          <div className="insights-hero-chips">
            <div className="insights-chip" style={{ color: risk.color, background: risk.bg }}>
              <risk.Icon size={13} /> Risk: {data.riskLevel}
            </div>
            <div className="insights-chip" style={{ color: trend.color, background: `${trend.color}18` }}>
              <trend.Icon size={13} /> {trend.label}
            </div>
          </div>
        </div>

        {/* Right: key numbers */}
        <div className="insights-hero-right">
          <div className="insights-hero-stat">
            <div className="insights-hero-stat-icon income"><TrendingUp size={16} /></div>
            <div>
              <div className="insights-hero-stat-label">Total Income</div>
              <div className="insights-hero-stat-val income">₹{data.income.toLocaleString()}</div>
            </div>
            <ArrowUpRight size={16} className="insights-hero-stat-arrow income" />
          </div>
          <div className="insights-hero-stat">
            <div className="insights-hero-stat-icon expense"><TrendingDown size={16} /></div>
            <div>
              <div className="insights-hero-stat-label">Total Expenses</div>
              <div className="insights-hero-stat-val expense">₹{data.expense.toLocaleString()}</div>
            </div>
            <ArrowDownRight size={16} className="insights-hero-stat-arrow expense" />
          </div>
          <div className="insights-hero-stat">
            <div className="insights-hero-stat-icon balance"><Target size={16} /></div>
            <div>
              <div className="insights-hero-stat-label">Net Balance</div>
              <div className={`insights-hero-stat-val ${balanceGood ? 'income' : 'expense'}`}>
                ₹{data.balance.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="insights-hero-stat">
            <div className="insights-hero-stat-icon savings"><Shield size={16} /></div>
            <div>
              <div className="insights-hero-stat-label">Savings Rate</div>
              <div className={`insights-hero-stat-val ${savingsGood ? 'income' : 'expense'}`}>
                {data.savingsRate ?? 0}%
              </div>
            </div>
            <div className={`insights-savings-badge ${savingsGood ? 'good' : 'warn'}`}>
              {savingsGood ? 'On Track' : 'Needs Work'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div className="insights-charts-trio">
        {/* Income vs Expense */}
        <div className="card insights-chart-card">
          <div className="card-header">
            <h3 className="card-title">Income vs Expenses</h3>
          </div>
          <div style={{ height: 200 }}>
            <Bar data={ivseChart} options={barOpts} />
          </div>
        </div>

        {/* Category donut */}
        {catChart && (
          <div className="card insights-chart-card">
            <div className="card-header">
              <h3 className="card-title">Spending by Category</h3>
            </div>
            <div style={{ height: 170 }}>
              <Doughnut
                data={catChart}
                options={{
                  responsive: true, maintainAspectRatio: false, cutout: '68%',
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
            <div className="insights-cat-list">
              {(data.categoryInsights || []).slice(0, 5).map(ci => (
                <div key={ci.category} className="insights-cat-row">
                  <span className="insights-cat-dot" style={{ background: ci.color }} />
                  <span className="insights-cat-name">{ci.category}</span>
                  <div className="insights-cat-bar-wrap">
                    <div className="insights-cat-bar-fill" style={{ width: `${ci.percent}%`, background: ci.color }} />
                  </div>
                  <span className="insights-cat-pct">{ci.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly trend */}
        {trendChart && (
          <div className="card insights-chart-card">
            <div className="card-header">
              <h3 className="card-title">Monthly Spending Trend</h3>
            </div>
            <div style={{ height: 200 }}>
              <Line data={trendChart} options={lineOpts} />
            </div>
          </div>
        )}
      </div>

      {/* ── Top spending category highlights ───────────────────────────────── */}
      {data.categoryInsights?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Category Breakdown</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
              Top {Math.min(data.categoryInsights.length, 6)} categories
            </span>
          </div>
          <div className="insights-cat-grid">
            {data.categoryInsights.slice(0, 6).map((ci, i) => (
              <div key={ci.category} className="insights-cat-tile" style={{ '--accent': ci.color }}>
                <div className="insights-cat-tile-rank">#{i + 1}</div>
                <div className="insights-cat-tile-name">{ci.category}</div>
                <div className="insights-cat-tile-amount">₹{ci.amount.toLocaleString()}</div>
                <div className="insights-cat-tile-pct" style={{ color: ci.color }}>{ci.percent}%</div>
                <div className="insights-cat-tile-bar">
                  <div style={{ width: `${ci.percent}%`, background: ci.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Advice ──────────────────────────────────────────────────────── */}
      <div className="card insights-advice-card">
        <div className="card-header">
          <h3 className="card-title">
            <div className="insights-title-icon" style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}>
              <Lightbulb size={16} />
            </div>
            AI Analysis
          </h3>
          <div className="insights-ai-badge-wrap">
            <Zap size={11} />
            <span>Groq AI</span>
          </div>
        </div>

        <div className="insights-advice-grid">
          {advice['Key Insight'] && (
            <div className="insights-advice-block blue">
              <div className="insights-advice-block-header">
                <div className="insights-advice-icon blue"><Brain size={15} /></div>
                <span>Key Insight</span>
              </div>
              <p>{advice['Key Insight']}</p>
            </div>
          )}
          {advice['Risk Warning'] && (
            <div className="insights-advice-block amber">
              <div className="insights-advice-block-header">
                <div className="insights-advice-icon amber"><AlertTriangle size={15} /></div>
                <span>Risk Warning</span>
              </div>
              <p>{advice['Risk Warning']}</p>
            </div>
          )}
          {advice['Top Recommendation'] && (
            <div className="insights-advice-block green">
              <div className="insights-advice-block-header">
                <div className="insights-advice-icon green"><Target size={15} /></div>
                <span>Top Recommendation</span>
              </div>
              <p>{advice['Top Recommendation']}</p>
            </div>
          )}
          {!advice['Key Insight'] && data.aiAdvice && (
            <div className="insights-advice-block blue">
              <p>{data.aiAdvice}</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default AIInsights;
