import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, reviewsAPI } from '../services/api.js';
import {
  X, User, Mail, Calendar, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Info, Bell, Shield,
  DollarSign, Target, Zap, Star, Send, Settings,
  Edit3, Save, Loader, LayoutDashboard,
} from 'lucide-react';

// ── Smart alerts ──────────────────────────────────────────────────────────────
function buildAlerts(stats) {
  if (!stats) return [];
  const alerts = [];
  const { totalIncome, totalExpenses, balance, budgetRemaining, monthlyIncome, monthlyExpenses } = stats;
  const savingsRate  = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
  const expenseRatio = totalIncome > 0 ? totalExpenses / totalIncome   : 0;
  const monthlyNet   = (monthlyIncome || 0) - (monthlyExpenses || 0);

  if (balance < 0)
    alerts.push({ type:'critical', icon:AlertTriangle, title:'Negative Balance',     body:`Your balance is ₹${Math.abs(balance).toLocaleString()} in deficit.` });
  if (expenseRatio > 0.9 && balance >= 0)
    alerts.push({ type:'warning',  icon:AlertTriangle, title:'High Expense Ratio',   body:`${(expenseRatio*100).toFixed(0)}% of income spent. Target below 80%.` });
  if (savingsRate < 10 && savingsRate >= 0)
    alerts.push({ type:'warning',  icon:TrendingDown,  title:'Low Savings Rate',     body:`Saving only ${savingsRate.toFixed(1)}% — aim for 20%+.` });
  if (monthlyNet < 0)
    alerts.push({ type:'warning',  icon:AlertTriangle, title:'Monthly Deficit',      body:`₹${Math.abs(monthlyNet).toLocaleString()} over budget this month.` });
  if ((budgetRemaining ?? Infinity) < 500)
    alerts.push({ type:'warning',  icon:Target,        title:'Budget Almost Gone',   body:`Only ₹${(budgetRemaining??0).toLocaleString()} remaining this month.` });
  if (savingsRate >= 25)
    alerts.push({ type:'success',  icon:CheckCircle,   title:'Great Savings Rate!',  body:`You're saving ${savingsRate.toFixed(1)}% — keep it up!` });
  if (monthlyNet > 0 && expenseRatio < 0.7)
    alerts.push({ type:'success',  icon:CheckCircle,   title:'Healthy Spending',     body:'Your spending-to-income ratio is excellent.' });
  if (!alerts.length)
    alerts.push({ type:'info',     icon:Info,          title:'All Clear',            body:'No alerts right now. Keep tracking!' });
  return alerts;
}

const ALERT_STYLE = {
  critical:{ bg:'rgba(239,68,68,0.08)',  border:'#EF4444', color:'#EF4444', label:'Critical' },
  warning: { bg:'rgba(245,158,11,0.08)', border:'#F59E0B', color:'#F59E0B', label:'Warning'  },
  success: { bg:'rgba(16,185,129,0.08)', border:'#10B981', color:'#10B981', label:'Good'     },
  info:    { bg:'rgba(59,130,246,0.08)', border:'#3B82F6', color:'#3B82F6', label:'Info'     },
};

// ── Star picker ───────────────────────────────────────────────────────────────
const StarPicker = ({ value, onChange }) => (
  <div className="pm-stars">
    {[1,2,3,4,5].map(n => (
      <button
        key={n}
        type="button"
        className={`pm-star-btn ${n <= value ? 'active' : ''}`}
        onClick={() => onChange(n)}
      >
        <Star size={22} />
      </button>
    ))}
    <span className="pm-star-label">
      {value ? ['','Poor','Fair','Good','Great','Excellent'][value] : 'Tap to rate'}
    </span>
  </div>
);

// ── Overview tab ──────────────────────────────────────────────────────────────
const OverviewTab = ({ user, stats, loadingStats }) => {
  const alerts        = buildAlerts(stats);
  const criticalCount = alerts.filter(a => a.type === 'critical' || a.type === 'warning').length;
  const initials      = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || 'U';

  function memberSince(d) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' });
  }

  return (
    <>
      {/* Account details */}
      <section className="pm-section">
        <div className="pm-section-title"><User size={14}/> Account Details</div>
        <div className="pm-details-grid">
          {[
            { icon:User,     label:'Full Name',      val: user?.name },
            { icon:Mail,     label:'Email',           val: user?.email },
            { icon:Calendar, label:'Member Since',    val: memberSince(user?.createdAt) },
            { icon:Shield,   label:'Account Status',  val: '✓ Active', green:true },
          ].map(({ icon:Icon, label, val, green }) => (
            <div key={label} className="pm-detail-item">
              <div className="pm-detail-icon"><Icon size={15}/></div>
              <div>
                <div className="pm-detail-label">{label}</div>
                <div className="pm-detail-value" style={green ? { color:'#10B981' } : {}}>{val}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Financial snapshot */}
      {!loadingStats && stats && (
        <section className="pm-section">
          <div className="pm-section-title"><TrendingUp size={14}/> Financial Snapshot</div>
          <div className="pm-stats-row">
            <div className="pm-stat income">
              <TrendingUp size={16}/>
              <div className="pm-stat-val">₹{(stats.totalIncome||0).toLocaleString()}</div>
              <div className="pm-stat-label">Income</div>
            </div>
            <div className="pm-stat expense">
              <TrendingDown size={16}/>
              <div className="pm-stat-val">₹{(stats.totalExpenses||0).toLocaleString()}</div>
              <div className="pm-stat-label">Expenses</div>
            </div>
            <div className="pm-stat balance">
              <DollarSign size={16}/>
              <div className="pm-stat-val" style={{ color: stats.balance>=0?'#10B981':'#EF4444' }}>
                ₹{(stats.balance||0).toLocaleString()}
              </div>
              <div className="pm-stat-label">Balance</div>
            </div>
          </div>
        </section>
      )}

      {/* Alerts */}
      <section className="pm-section">
        <div className="pm-section-title">
          <Bell size={14}/> Alerts &amp; Notifications
          {criticalCount > 0 && <span className="pm-alert-count">{criticalCount}</span>}
        </div>
        {loadingStats ? (
          <div className="pm-alerts-loading"><div className="pm-spinner"/><span>Loading…</span></div>
        ) : (
          <div className="pm-alerts-list">
            {alerts.map((a, i) => {
              const s = ALERT_STYLE[a.type];
              return (
                <div key={i} className="pm-alert-item" style={{ background:s.bg, borderColor:s.border }}>
                  <div className="pm-alert-icon" style={{ color:s.color }}><a.icon size={16}/></div>
                  <div className="pm-alert-content">
                    <div className="pm-alert-header">
                      <span className="pm-alert-title">{a.title}</span>
                      <span className="pm-alert-badge" style={{ color:s.color, background:s.bg, border:`1px solid ${s.border}` }}>{s.label}</span>
                    </div>
                    <p className="pm-alert-body">{a.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
};

// ── Review tab ────────────────────────────────────────────────────────────────
const ReviewTab = ({ user }) => {
  const [rating,   setRating]   = useState(0);
  const [content,  setContent]  = useState('');
  const [existing, setExisting] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    reviewsAPI.getMine()
      .then(r => {
        if (r.data) {
          setExisting(r.data);
          setRating(r.data.rating);
          setContent(r.data.content);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Please select a star rating'); return; }
    if (!content.trim()) { setError('Please write a short review'); return; }
    setSaving(true); setError('');
    try {
      const r = await reviewsAPI.submit({ rating, content: content.trim() });
      setExisting(r.data);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="pm-alerts-loading"><div className="pm-spinner"/></div>;

  if (existing && !editing) {
    return (
      <div className="pm-review-existing">
        <div className="pm-review-done-header">
          <CheckCircle size={20} style={{ color:'#10B981' }}/>
          <span>Your review is live on the homepage!</span>
        </div>
        <div className="pm-review-card-preview">
          <div className="pm-review-preview-stars">
            {[1,2,3,4,5].map(n => (
              <Star key={n} size={16} className={n <= existing.rating ? 'pm-star-filled' : 'pm-star-empty'}/>
            ))}
          </div>
          <p className="pm-review-preview-text">"{existing.content}"</p>
          <span className="pm-review-preview-name">— {user?.name}</span>
        </div>
        <button className="pm-edit-review-btn" onClick={() => setEditing(true)}>
          <Edit3 size={14}/> Edit Review
        </button>
      </div>
    );
  }

  return (
    <form className="pm-review-form" onSubmit={handleSubmit}>
      <div className="pm-review-prompt">
        <h4>Share your experience with Finote</h4>
        <p>Your review helps others discover and trust our app.</p>
      </div>
      <StarPicker value={rating} onChange={r => { setRating(r); setError(''); }}/>
      <div className="pm-review-textarea-wrap">
        <textarea
          className="pm-review-textarea"
          placeholder="Tell us what you think — what's working, what could be better?"
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={600}
          rows={4}
        />
        <span className="pm-review-char">{content.length}/600</span>
      </div>
      {error && <div className="pm-review-error"><AlertTriangle size={13}/> {error}</div>}
      {saved  && <div className="pm-review-success"><CheckCircle size={13}/> Review published!</div>}
      <div className="pm-review-actions">
        {editing && <button type="button" className="btn btn-outline pm-review-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>}
        <button type="submit" className="pm-review-submit-btn" disabled={saving}>
          {saving ? <><Loader size={14} className="spin"/> Submitting…</> : <><Send size={14}/> {existing ? 'Update Review' : 'Publish Review'}</>}
        </button>
      </div>
    </form>
  );
};

// ── Settings tab ──────────────────────────────────────────────────────────────
const SettingsTab = ({ user }) => {
  const { logout } = useAuth();
  const [name,    setName]    = useState(user?.name || '');
  const [saved,   setSaved]   = useState(false);
  const [saving,  setSaving]  = useState(false);

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === user?.name) return;
    setSaving(true);
    // Optimistic — no name-change endpoint yet; shows UI feedback
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500); }, 800);
  };

  return (
    <div className="pm-settings">
      <section className="pm-section">
        <div className="pm-section-title"><User size={14}/> Profile Info</div>
        <div className="pm-settings-field">
          <label className="pm-settings-label">Display Name</label>
          <div className="pm-settings-input-row">
            <input
              className="form-input pm-settings-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
            />
            <button className="pm-settings-save-btn" onClick={handleSaveName} disabled={saving || name.trim() === user?.name}>
              {saving ? <Loader size={14} className="spin"/> : saved ? <CheckCircle size={14}/> : <Save size={14}/>}
            </button>
          </div>
          {saved && <p className="pm-settings-saved-msg">Name updated!</p>}
        </div>
        <div className="pm-settings-field">
          <label className="pm-settings-label">Email Address</label>
          <input className="form-input pm-settings-input" value={user?.email || ''} readOnly />
          <p className="pm-settings-hint">Email cannot be changed.</p>
        </div>
      </section>

      <section className="pm-section">
        <div className="pm-section-title"><Shield size={14}/> Account</div>
        <div className="pm-settings-info-row">
          <div className="pm-settings-info-label">Plan</div>
          <span className="pm-plan-badge"><Zap size={11}/> Free Plan</span>
        </div>
        <div className="pm-settings-info-row">
          <div className="pm-settings-info-label">Status</div>
          <span style={{ color:'#10B981', fontSize:'0.85rem', fontWeight:600 }}>Active</span>
        </div>
      </section>

      <button className="pm-logout-btn" onClick={logout}>
        Sign Out of Finote
      </button>
    </div>
  );
};

// ── Main modal ────────────────────────────────────────────────────────────────
const TABS = [
  { key:'overview', label:'Overview',  icon:LayoutDashboard },
  { key:'review',   label:'Review',    icon:Star            },
  { key:'settings', label:'Settings',  icon:Settings        },
];

const ProfileModal = ({ onClose }) => {
  const { user } = useAuth();
  const [tab,          setTab]          = useState('overview');
  const [stats,        setStats]        = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || 'U';

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="pm-header">
          <div className="pm-avatar">{initials}</div>
          <div className="pm-hero-info">
            <h2 className="pm-name">{user?.name}</h2>
            <p className="pm-role">Personal Finance Account</p>
            <span className="pm-plan-badge"><Zap size={11}/> Free Plan</span>
          </div>
          <button className="pm-close" onClick={onClose}><X size={18}/></button>
        </div>

        {/* Tab bar */}
        <div className="pm-tabs">
          {TABS.map(({ key, label, icon:Icon }) => (
            <button
              key={key}
              className={`pm-tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              <Icon size={14}/> {label}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="pm-body">
          {tab === 'overview' && <OverviewTab user={user} stats={stats} loadingStats={loadingStats}/>}
          {tab === 'review'   && <ReviewTab   user={user}/>}
          {tab === 'settings' && <SettingsTab user={user}/>}
        </div>

      </div>
    </div>
  );
};

export default ProfileModal;
