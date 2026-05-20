import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  TrendingUp, Eye, EyeOff, Mail, Lock, ArrowRight,
  BarChart3, Shield, Brain, Sparkles,
} from 'lucide-react';

const FEATURES = [
  { icon: BarChart3, title: 'Smart Analytics', desc: 'Real-time spending insights & trends' },
  { icon: Brain,     title: 'AI Powered',     desc: 'Groq AI parses your bills & advises' },
  { icon: Shield,    title: 'Secure',          desc: 'Bank-grade encryption for your data' },
  { icon: Sparkles,  title: 'Auto-categorize',desc: 'OCR receipts → instant transactions' },
];

const Login = () => {
  const [formData, setFormData]   = useState({ email: '', password: '' });
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(formData.email, formData.password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className="auth-split-left">
        <div className="auth-split-left-inner">
          <Link to="/" className="auth-logo-link">
            <div className="auth-logo-icon"><TrendingUp size={22} /></div>
            <span className="auth-logo-text">Finote</span>
          </Link>

          <div className="auth-left-hero">
            <h2 className="auth-left-title">Take control of your finances</h2>
            <p className="auth-left-sub">
              Track, analyse and grow — all in one intelligent dashboard.
            </p>
          </div>

          <div className="auth-features-list">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="auth-feature-item">
                <div className="auth-feature-icon"><Icon size={18} /></div>
                <div>
                  <div className="auth-feature-title">{title}</div>
                  <div className="auth-feature-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-left-badge">
            <div className="auth-left-avatars">
              {['SK','MR','AP','DJ'].map(a => <div key={a} className="auth-mini-avatar">{a}</div>)}
            </div>
            <span className="auth-left-badge-text">Joined by 2,000+ users this month</span>
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className="auth-split-right">
        <div className="auth-form-box">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Welcome back</h1>
            <p className="auth-form-sub">Sign in to continue to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form-inner">
            <div className="auth-field">
              <label className="auth-label">Email address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  type="email"
                  name="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  className="auth-input"
                  placeholder="Your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <><span className="auth-spinner" /> Signing in…</>
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="auth-switch-text">
            Don't have an account?{' '}
            <Link to="/register" className="auth-switch-link">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
