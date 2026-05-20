import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { dashboardAPI, transactionsAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  TrendingUp, TrendingDown, DollarSign,
  Plus, Brain, Receipt, ShoppingCart, ArrowRight,
  BarChart3, Wallet, Zap, RefreshCw, FileText,
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement, Tooltip, Legend, Filler
);

// ── Greeting helper ───────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Category icon/color map ───────────────────────────────────────────────────
const CAT_COLORS = [
  '#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444',
  '#0EA5E9','#EC4899','#14B8A6',
];

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const QUICK_ACTIONS = [
  { label: 'AI Insights',   icon: Brain,        to: '/ai-insights',  color: '#8B5CF6' },
  { label: 'Upload Bill',   icon: Receipt,      to: '/upload-bill',  color: '#10B981' },
  { label: 'Afford Check',  icon: ShoppingCart, to: '/afford',       color: '#F59E0B' },
  { label: 'Predictions',   icon: BarChart3,    to: '/ai-predict',   color: '#3B82F6' },
];

// ── Mini stat pill ────────────────────────────────────────────────────────────
const StatPill = ({ label, value, trend, good }) => (
  <div className="db-stat-pill">
    <div className="db-stat-pill-label">{label}</div>
    <div className="db-stat-pill-value">₹{(value || 0).toLocaleString()}</div>
    {trend !== undefined && (
      <div className={`db-stat-pill-trend ${good ? 'good' : 'bad'}`}>
        {good ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {Math.abs(trend || 0).toFixed(1)}%
      </div>
    )}
  </div>
);

// ── Category row ─────────────────────────────────────────────────────────────
const CategoryRow = ({ name, amount, pct, color }) => (
  <div className="db-cat-row">
    <div className="db-cat-dot" style={{ background: color }} />
    <span className="db-cat-name">{name}</span>
    <div className="db-cat-bar-wrap">
      <div className="db-cat-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
    <span className="db-cat-pct">{pct.toFixed(0)}%</span>
    <span className="db-cat-amt">₹{amount.toLocaleString()}</span>
  </div>
);

// ── Transaction row ───────────────────────────────────────────────────────────
const TxRow = ({ tx }) => {
  const isIncome = tx.type === 'income';
  return (
    <div className="db-tx-row">
      <div className={`db-tx-dot ${isIncome ? 'income' : 'expense'}`} />
      <div className="db-tx-info">
        <span className="db-tx-cat">{tx.category}</span>
        {tx.note && <span className="db-tx-note">{tx.note}</span>}
      </div>
      <div className="db-tx-right">
        <span className={`db-tx-amount ${isIncome ? 'income' : 'expense'}`}>
          {isIncome ? '+' : '-'}₹{tx.amount.toLocaleString()}
        </span>
        <span className="db-tx-date">{new Date(tx.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</span>
      </div>
    </div>
  );
};

// ── PDF generator ─────────────────────────────────────────────────────────────
async function generateMonthlyPDF(userName) {
  try {
    // Fetch all transactions for the current month
    const now = new Date();
    const monthStr = now.toISOString().slice(0, 7);
    const res = await transactionsAPI.getAll({ limit: 1000 });
    const all = res.data.transactions || [];

    const monthTxns = all.filter(t => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === monthStr;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    const doc = new jsPDF();
    const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Finote — Monthly Report', 14, 16);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${monthName}  ·  ${userName}`, 14, 27);

    // Summary boxes
    const income   = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance  = income - expenses;

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    const boxY = 44;
    const labels = ['Total Income', 'Total Expenses', 'Net Balance'];
    const vals   = [income, expenses, balance];
    const colors = [[16, 185, 129], [239, 68, 68], balance >= 0 ? [16, 185, 129] : [239, 68, 68]];

    labels.forEach((lbl, i) => {
      const x = 14 + i * 62;
      doc.setFillColor(...colors[i]);
      doc.roundedRect(x, boxY, 58, 20, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(lbl, x + 5, boxY + 8);
      doc.setFontSize(12);
      doc.text(`Rs ${vals[i].toLocaleString()}`, x + 5, boxY + 16);
      doc.setFontSize(10);
    });

    // Transactions table
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Transactions', 14, boxY + 32);

    if (monthTxns.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('No transactions recorded for this month.', 14, boxY + 42);
    } else {
      autoTable(doc, {
        startY: boxY + 36,
        head: [['Date', 'Category', 'Merchant / Note', 'Type', 'Amount (Rs)']],
        body: monthTxns.map(t => [
          new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          t.category,
          t.note || t.description || '—',
          t.type.charAt(0).toUpperCase() + t.type.slice(1),
          (t.type === 'income' ? '+' : '-') + t.amount.toLocaleString(),
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 28 },
          2: { cellWidth: 68 },
          3: { cellWidth: 22 },
          4: { cellWidth: 32, halign: 'right' },
        },
        didParseCell(data) {
          if (data.column.index === 4 && data.section === 'body') {
            const val = data.cell.raw;
            data.cell.styles.textColor = val.startsWith('+') ? [16, 185, 129] : [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Generated by Finote · Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }

    doc.save(`finote-report-${monthStr}.pdf`);
  } catch (err) {
    console.error('PDF generation error:', err);
  }
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats]   = useState(null);
  const [charts, setCharts] = useState(null);
  const [txns, setTxns]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const firstName = user?.name?.split(' ')[0] || 'there';

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [sRes, cRes, tRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getChartData(),
        transactionsAPI.getAll({ limit: 6 }),
      ]);
      setStats(sRes.data);
      setCharts(cRes.data);
      setTxns(tRes.data.transactions || []);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handlePDF = async () => {
    setPdfLoading(true);
    await generateMonthlyPDF(user?.name || 'User');
    setPdfLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="db-loading">
          <div className="db-loading-spinner" />
          <p>Loading your dashboard…</p>
        </div>
      </Layout>
    );
  }

  const savingsRate = stats?.totalIncome > 0
    ? ((stats.balance / stats.totalIncome) * 100).toFixed(1)
    : 0;
  const expenseRatio = stats?.totalIncome > 0
    ? ((stats.totalExpenses / stats.totalIncome) * 100).toFixed(0)
    : 0;

  // ── Monthly trend (line) ─────────────────────────────────────────────────
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthLabels = [
    ...new Set(charts?.monthlyTrends?.map(t => t.month) || [])
  ].sort().map(m => {
    const [, mm] = m.split('-');
    return months[parseInt(mm) - 1];
  });

  const incomeByMonth = {};
  const expByMonth   = {};
  (charts?.monthlyTrends || []).forEach(t => {
    const label = months[parseInt(t.month.split('-')[1]) - 1];
    if (t.type === 'income')  incomeByMonth[label] = t.amount;
    if (t.type === 'expense') expByMonth[label]    = t.amount;
  });

  const lineData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Income',
        data: monthLabels.map(l => incomeByMonth[l] || 0),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16,185,129,0.08)',
        fill: true, tension: 0.4,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
      },
      {
        label: 'Expenses',
        data: monthLabels.map(l => expByMonth[l] || 0),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239,68,68,0.06)',
        fill: true, tension: 0.4,
        pointBackgroundColor: '#EF4444',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
      },
    ],
  };

  // ── Doughnut ─────────────────────────────────────────────────────────────
  const catItems = (charts?.categoryBreakdown || []).slice(0, 6);
  const donutData = {
    labels: catItems.map(c => c.category),
    datasets: [{
      data: catItems.map(c => c.amount),
      backgroundColor: CAT_COLORS,
      borderWidth: 3,
      borderColor: 'var(--card-bg)',
      hoverOffset: 8,
    }],
  };

  const topCats = catItems.map((c, i) => ({
    ...c,
    color: CAT_COLORS[i],
    pct: stats?.totalExpenses > 0 ? (c.amount / stats.totalExpenses) * 100 : 0,
  }));

  // ── Weekly spending bar ───────────────────────────────────────────────────
  const weekRaw = charts?.weeklySpending || [];
  // Build a full 7-day array (some days may have 0)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const weekMap = {};
  weekRaw.forEach(w => { weekMap[w.date] = w.amount; });

  const weeklyData = {
    labels: weekDays.map(d => {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    }),
    datasets: [{
      label: 'Spending',
      data: weekDays.map(d => weekMap[d] || 0),
      backgroundColor: weekDays.map((_, i) => i === 6 ? '#8B5CF6' : 'rgba(139,92,246,0.35)'),
      borderColor: '#8B5CF6',
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  // ── Monthly income vs expense grouped bar ─────────────────────────────────
  const compRaw = charts?.monthlyComparison || [];
  const compMonths = [...new Set(compRaw.map(c => c.month))].sort();
  const compLabels = compMonths.map(m => months[parseInt(m.split('-')[1]) - 1]);
  const compIncome = {};
  const compExp    = {};
  compRaw.forEach(c => {
    if (c.type === 'income')  compIncome[c.month] = c.amount;
    if (c.type === 'expense') compExp[c.month]    = c.amount;
  });

  const barCompData = {
    labels: compLabels,
    datasets: [
      {
        label: 'Income',
        data: compMonths.map(m => compIncome[m] || 0),
        backgroundColor: 'rgba(16,185,129,0.75)',
        borderColor: '#10B981',
        borderWidth: 2,
        borderRadius: 5,
        borderSkipped: false,
      },
      {
        label: 'Expenses',
        data: compMonths.map(m => compExp[m] || 0),
        backgroundColor: 'rgba(239,68,68,0.65)',
        borderColor: '#EF4444',
        borderWidth: 2,
        borderRadius: 5,
        borderSkipped: false,
      },
    ],
  };

  // ── Day-of-week pattern ───────────────────────────────────────────────────
  const dowRaw = charts?.dowPattern || [];
  const dowAmounts = DOW_LABELS.map((_, i) => {
    const match = dowRaw.find(d => d.dow === i + 1);
    return match ? Math.round(match.avg) : 0;
  });
  const maxDow = Math.max(...dowAmounts, 1);

  const dowData = {
    labels: DOW_LABELS,
    datasets: [{
      label: 'Avg Spend',
      data: dowAmounts,
      backgroundColor: dowAmounts.map(v =>
        v === maxDow ? 'rgba(239,68,68,0.8)' : 'rgba(59,130,246,0.5)'
      ),
      borderColor: dowAmounts.map(v => v === maxDow ? '#EF4444' : '#3B82F6'),
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  const groupedBarOpts = {
    ...chartOpts,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { boxWidth: 12, font: { size: 11 }, padding: 12 },
      },
    },
  };

  return (
    <Layout>
      <div className="db-root">

        {/* ── Greeting banner ─────────────────────────────────── */}
        <div className="db-greeting-banner">
          <div className="db-greeting-left">
            <div className="db-greeting-avatar">{firstName[0].toUpperCase()}</div>
            <div>
              <h1 className="db-greeting-title">{greeting()}, {firstName}!</h1>
              <p className="db-greeting-sub">
                {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
              </p>
            </div>
          </div>
          <div className="db-header-actions">
            <button
              className="db-pdf-btn"
              onClick={handlePDF}
              disabled={pdfLoading}
              title="Download Monthly PDF Report"
            >
              {pdfLoading
                ? <><RefreshCw size={14} className="spin" /> Generating…</>
                : <><FileText size={14} /> Monthly PDF</>
              }
            </button>
            <button
              className="db-refresh-btn"
              onClick={() => load(true)}
              disabled={refreshing}
              title="Refresh"
            >
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── Hero stats row ──────────────────────────────────── */}
        <div className="db-hero-stats">
          <div className="db-hero-stat primary">
            <div className="db-hero-stat-icon"><Wallet size={22} /></div>
            <div>
              <div className="db-hero-stat-label">Total Balance</div>
              <div className="db-hero-stat-value" style={{ color: stats?.balance >= 0 ? '#10B981' : '#EF4444' }}>
                ₹{(stats?.balance || 0).toLocaleString()}
              </div>
              <div className="db-hero-stat-sub">Savings rate: {savingsRate}%</div>
            </div>
          </div>
          <StatPill label="Total Income"   value={stats?.totalIncome}   trend={stats?.incomeChange}  good={true}  />
          <StatPill label="Total Expenses" value={stats?.totalExpenses} trend={stats?.expenseChange} good={false} />
          <StatPill label="Budget Left"    value={stats?.budgetRemaining} />
          <div className="db-hero-stat-mini">
            <div className="db-expense-ratio-label">Spent {expenseRatio}% of income</div>
            <div className="db-expense-ratio-bar">
              <div
                className="db-expense-ratio-fill"
                style={{
                  width: `${Math.min(100, expenseRatio)}%`,
                  background: expenseRatio > 85 ? '#EF4444' : expenseRatio > 65 ? '#F59E0B' : '#10B981',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Quick actions ───────────────────────────────────── */}
        <div className="db-quick-actions">
          <span className="db-section-label">Quick Actions</span>
          <div className="db-qa-grid">
            {QUICK_ACTIONS.map(({ label, icon: Icon, to, color }) => (
              <Link key={to} to={to} className="db-qa-card">
                <div className="db-qa-icon" style={{ background: color + '18', color }}>
                  <Icon size={20} />
                </div>
                <span className="db-qa-label">{label}</span>
                <ArrowRight size={13} className="db-qa-arrow" />
              </Link>
            ))}
            <Link to="/transactions" className="db-qa-card db-qa-card-add">
              <div className="db-qa-icon" style={{ background: 'var(--gradient-primary)', color: '#fff' }}>
                <Plus size={20} />
              </div>
              <span className="db-qa-label">Add Transaction</span>
              <ArrowRight size={13} className="db-qa-arrow" />
            </Link>
          </div>
        </div>

        {/* ── Row 1: Monthly trend + Doughnut ────────────────── */}
        <div className="db-charts-row">
          <div className="card db-chart-card db-chart-wide">
            <div className="db-chart-header">
              <h3 className="db-chart-title">Monthly Trends</h3>
              <div className="db-chart-legend">
                <span className="db-legend-dot" style={{ background: '#10B981' }} /> Income
                <span className="db-legend-dot" style={{ background: '#EF4444' }} /> Expenses
              </div>
            </div>
            <div style={{ height: 220 }}>
              {monthLabels.length > 0
                ? <Line data={lineData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
                : <div className="db-chart-empty"><Zap size={24} /> Add transactions to see trends</div>
              }
            </div>
          </div>

          <div className="card db-chart-card db-chart-narrow">
            <div className="db-chart-header">
              <h3 className="db-chart-title">By Category</h3>
            </div>
            {catItems.length > 0 ? (
              <>
                <div style={{ height: 160, margin: '0 auto', maxWidth: 160 }}>
                  <Doughnut
                    data={donutData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      cutout: '68%',
                    }}
                  />
                </div>
                <div className="db-cat-list">
                  {topCats.map(c => (
                    <CategoryRow key={c.category} name={c.category} amount={c.amount} pct={c.pct} color={c.color} />
                  ))}
                </div>
              </>
            ) : (
              <div className="db-chart-empty"><Zap size={24} /> No expenses yet</div>
            )}
          </div>
        </div>

        {/* ── Row 2: Weekly spending + Income vs Expense bar ──── */}
        <div className="db-charts-row equal">
          <div className="card db-chart-card db-chart-half">
            <div className="db-chart-header">
              <h3 className="db-chart-title">Weekly Spending</h3>
              <span className="db-chart-sub">Last 7 days</span>
            </div>
            <div style={{ height: 200 }}>
              {weekRaw.length > 0
                ? <Bar data={weeklyData} options={chartOpts} />
                : <div className="db-chart-empty"><Zap size={24} /> No spending this week</div>
              }
            </div>
          </div>

          <div className="card db-chart-card db-chart-half">
            <div className="db-chart-header">
              <h3 className="db-chart-title">Income vs Expenses</h3>
              <span className="db-chart-sub">Last 6 months</span>
            </div>
            <div style={{ height: 200 }}>
              {compMonths.length > 0
                ? <Bar data={barCompData} options={groupedBarOpts} />
                : <div className="db-chart-empty"><Zap size={24} /> Add transactions to compare</div>
              }
            </div>
          </div>
        </div>

        {/* ── Row 3: Day-of-week pattern + Recent transactions ── */}
        <div className="db-charts-row wide-left">
          <div className="card db-chart-card db-chart-narrow">
            <div className="db-chart-header">
              <h3 className="db-chart-title">Spending by Day</h3>
              <span className="db-chart-sub">Avg per weekday (90d)</span>
            </div>
            <div style={{ height: 190 }}>
              {dowAmounts.some(v => v > 0)
                ? <Bar data={dowData} options={chartOpts} />
                : <div className="db-chart-empty"><Zap size={24} /> Not enough data yet</div>
              }
            </div>
          </div>

          <div className="card db-chart-card db-chart-wide">
            <div className="db-chart-header">
              <h3 className="db-chart-title">Recent Transactions</h3>
              <Link to="/transactions" className="db-see-all">
                See all <ArrowRight size={13} />
              </Link>
            </div>
            <div className="db-tx-list">
              {txns.length > 0
                ? txns.map(t => <TxRow key={t._id} tx={t} />)
                : (
                  <div className="db-chart-empty" style={{ padding: '2rem 0' }}>
                    <DollarSign size={24} /> No transactions yet — add one to get started
                  </div>
                )
              }
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Dashboard;
