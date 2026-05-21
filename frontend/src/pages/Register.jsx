import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  TrendingUp, Eye, EyeOff, Mail, Lock, User, ArrowRight,
  CheckCircle, BarChart3, Shield, Brain, Sparkles,
} from 'lucide-react';

const FEATURES = [
  { icon: BarChart3, title: 'Smart Analytics', desc: 'Real-time spending insights & trends' },
  { icon: Brain,     title: 'AI Powered',     desc: 'Groq AI parses your bills & advises' },
  { icon: Shield,    title: 'Secure',          desc: 'Bank-grade encryption for your data' },
  { icon: Sparkles,  title: 'Auto-categorize',desc: 'OCR receipts → instant transactions' },
];

const StrengthBar = ({ password }) => {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/]
    .filter(r => r.test(password)).length;
  const colors = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  if (!password) return null;
  return (
    <div className="auth-strength">
      <div className="auth-strength-bars">
        {[1,2,3,4].map(i => (
          <div
            key={i}
            className="auth-strength-bar"
            style={{ background: i <= score ? colors[score] : 'var(--soft-border)' }}
          />
        ))}
      </div>
      <span className="auth-strength-label" style={{ color: colors[score] }}>
        {labels[score]}
      </span>
    </div>
  );
};

const Register = () => {
  const [formData, setFormData]  = useState({ name:'', email:'', password:'', confirmPassword:'' });
  const [showPass, setShowPass]  = useState(false);
  const [loading, setLoading]    = useState(false);
  const [error, setError]        = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    const result = await register(formData.name, formData.email, formData.password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  const perks = [
    'Free forever — no credit card needed',
    'AI-powered bill scanning',
    'Smart spending alerts',
  ];

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
            <h2 className="auth-left-title">Your financial journey starts here</h2>
            <p className="auth-left-sub">
              Join thousands who trust Finote to manage their money smarter.
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

          <div className="auth-perks-list">
            {perks.map(p => (
              <div key={p} className="auth-perk-item">
                <CheckCircle size={14} className="auth-perk-check" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className="auth-split-right">
        <div className="auth-form-box">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Create your account</h1>
            <p className="auth-form-sub">Start tracking your finances for free</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form-inner">
            <div className="auth-field">
              <label className="auth-label">Full Name</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input
                  type="text"
                  name="name"
                  className="auth-input"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </div>
            </div>

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
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  autoComplete="new-password"
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
              <StrengthBar password={formData.password} />
            </div>

            <div className="auth-field">
              <label className="auth-label">Confirm Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type={showPass ? 'text' : 'password'}
                  name="confirmPassword"
                  className="auth-input"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <><span className="auth-spinner" /> Creating account…</>
              ) : (
                <>Create Account <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="auth-switch-text">
            Already have an account?{' '}
            <Link to="/login" className="auth-switch-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
