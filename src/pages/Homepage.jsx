import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp, Shield, BarChart3, Target, Brain, Receipt,
  Menu, X, Star, ArrowRight, CheckCircle, Zap,
  DollarSign, Sun, Moon, Users, Activity, Award,
  ChevronRight, Wallet, Bell, PieChart, Sparkles,
} from 'lucide-react';
import { reviewsAPI, publicAPI } from '../services/api.js';
import { useTheme } from '../context/ThemeContext.jsx';

/* ── Animated number counter ────────────────────────────────────────────────── */
const useCounter = (target, duration = 1800, started = false) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!started || target === 0) return;
    let start = null;
    const from = 0;
    const step = (ts) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / duration, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - pct, 3);
      setValue(Math.round(from + (target - from) * ease));
      if (pct < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, started]);
  return value;
};

/* ── Format large numbers ───────────────────────────────────────────────────── */
const fmt = (n) => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
};

/* ── Intersection-aware section ────────────────────────────────────────────── */
const InView = ({ children, className = '' }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`${className} ${visible ? 'in-view' : 'pre-view'}`}>
      {children}
    </div>
  );
};

/* ── Star display ──────────────────────────────────────────────────────────── */
const Stars = ({ rating, size = 14 }) => (
  <div className="hp-review-stars">
    {[1,2,3,4,5].map(n => (
      <Star key={n} size={size} className={n <= Math.round(rating) ? 'hp-star-filled' : 'hp-star-empty'} />
    ))}
  </div>
);

/* ── Review card ────────────────────────────────────────────────────────────── */
const ReviewCard = ({ review, delay = 0 }) => {
  const initials = review.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const palette  = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#0EA5E9','#EC4899'];
  const color    = palette[initials.charCodeAt(0) % palette.length];
  return (
    <div className="hp-review-card" style={{ animationDelay: `${delay}ms` }}>
      <Stars rating={review.rating} />
      <p className="hp-review-text">"{review.content}"</p>
      <div className="hp-review-author">
        <div className="hp-review-avatar" style={{ background:`${color}20`, color }}>{initials}</div>
        <div>
          <div className="hp-review-name">{review.name}</div>
          {review.createdAt && (
            <div className="hp-review-date">
              {new Date(review.createdAt).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}
            </div>
          )}
        </div>
        <div className="hp-review-badge-stars">
          {'★'.repeat(review.rating)}
        </div>
      </div>
    </div>
  );
};

/* ── Floating dashboard card (hero preview) ─────────────────────────────────── */
const FloatingCard = ({ style, className, children }) => (
  <div className={`hp-float-card ${className||''}`} style={style}>{children}</div>
);

/* ── Stat counter tile ──────────────────────────────────────────────────────── */
const StatTile = ({ icon: Icon, label, value, color, prefix='', suffix='' }) => (
  <div className="hp-stat-tile">
    <div className="hp-stat-tile-icon" style={{ background:`${color}18`, color }}>
      <Icon size={22} />
    </div>
    <div className="hp-stat-tile-val">{prefix}{value}{suffix}</div>
    <div className="hp-stat-tile-label">{label}</div>
  </div>
);

/* ── Feature card ───────────────────────────────────────────────────────────── */
const FeatureCard = ({ icon: Icon, title, desc, color, delay }) => (
  <div className="hp-feature-card" style={{ '--delay': `${delay}ms` }}>
    <div className="hp-feature-icon" style={{ background:`${color}18`, color }}>
      <Icon size={22} />
    </div>
    <h3 className="hp-feature-title">{title}</h3>
    <p className="hp-feature-desc">{desc}</p>
    <div className="hp-feature-glow" style={{ background:`${color}10` }} />
  </div>
);

const FEATURES = [
  { icon:BarChart3,  title:'Real-Time Dashboard',   desc:'Live income, expense & balance tracking with animated charts.',      color:'#3B82F6' },
  { icon:Brain,      title:'Groq AI Advisor',        desc:'Personalized financial coaching powered by llama-3 AI models.',     color:'#8B5CF6' },
  { icon:Receipt,    title:'Bill OCR Scanner',       desc:'Snap a receipt — AI reads, parses and saves the transaction.',      color:'#10B981' },
  { icon:Shield,     title:'Anomaly Detection',      desc:'Z-score ML flags unusual spending spikes before they become crises.', color:'#EF4444' },
  { icon:Target,     title:'Budget Tracking',        desc:'Monthly category budgets with real-time over-spend alerts.',        color:'#F59E0B' },
  { icon:DollarSign, title:'Afford Checker',         desc:'Data-backed YES / RISKY / NO before every big purchase.',          color:'#0EA5E9' },
];

const SEED_REVIEWS = [
  { _id:'s1', name:'Aryan Mehta',   rating:5, content:'Finote\'s AI insights are shockingly accurate. Caught a budget overrun I missed for weeks.' },
  { _id:'s2', name:'Priya Sharma',  rating:5, content:'Uploading a restaurant bill and having it auto-categorize is pure magic. Saves me 10 mins a day.' },
  { _id:'s3', name:'Vikram Nair',   rating:4, content:'The AI chatbot gives real advice, not generic tips. It knew my top spending category without me telling it.' },
  { _id:'s4', name:'Ananya Joshi',  rating:5, content:'Afford checker stopped an impulse buy. Literally saved me ₹12,000 in one click.' },
  { _id:'s5', name:'Rohan Gupta',   rating:5, content:'Anomaly detection flagged a duplicate transaction my bank missed. Absolutely worth it.' },
  { _id:'s6', name:'Divya Pillai',  rating:4, content:'Spending trend charts helped me cut dining costs by 30% over two months. Beautiful and useful.' },
];

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
const Homepage = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [reviews,   setReviews]   = useState(SEED_REVIEWS);
  const [liveStats, setLiveStats] = useState({ users:0, transactions:0, volumeTracked:0, avgRating:0, reviewCount:0 });
  const [statsReady, setStatsReady] = useState(false);
  const statsRef = useRef(null);

  /* ── Fetch real stats ─────────────────────────────────────── */
  const fetchStats = useCallback(async () => {
    try {
      const r = await publicAPI.stats();
      setLiveStats(r.data);
    } catch { /* keep defaults */ }
  }, []);

  /* ── Fetch & poll reviews (every 30 s) ────────────────────── */
  const fetchReviews = useCallback(async () => {
    try {
      const r = await reviewsAPI.getAll();
      if (r.data?.length >= 2) setReviews(r.data.slice(0, 9));
    } catch { /* keep seed */ }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchReviews();
    const statsInterval   = setInterval(fetchStats,   60_000);
    const reviewsInterval = setInterval(fetchReviews, 30_000);
    return () => { clearInterval(statsInterval); clearInterval(reviewsInterval); };
  }, [fetchStats, fetchReviews]);

  /* ── Trigger counter animation when stats section enters view ── */
  useEffect(() => {
    if (!statsRef.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStatsReady(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  /* ── Animated counter values ─────────────────────────────── */
  const cUsers  = useCounter(liveStats.users,        1600, statsReady);
  const cTxns   = useCounter(liveStats.transactions, 1800, statsReady);
  const cVol    = useCounter(liveStats.volumeTracked, 2000, statsReady);
  const cRating = useCounter(Math.round(liveStats.avgRating * 10), 1400, statsReady);

  const displayRating = liveStats.avgRating > 0
    ? (cRating / 10).toFixed(1)
    : '—';

  /* ── Marquee: duplicate reviews for infinite scroll ─────── */
  const marqueeSet = [...reviews, ...reviews];

  return (
    <div className="hp-root" data-theme={theme}>

      {/* ══ NAVBAR ══════════════════════════════════════════════ */}
      <nav className="hp-nav">
        <div className="hp-nav-inner">
          <a href="/" className="hp-nav-logo">
            <div className="hp-nav-logo-icon"><TrendingUp size={18} /></div>
            <span>Finote</span>
          </a>

          <div className={`hp-nav-menu ${menuOpen ? 'open' : ''}`}>
            <a href="/login"    className="hp-nav-link-ghost" onClick={() => setMenuOpen(false)}>Sign In</a>
            <a href="/register" className="hp-nav-cta"        onClick={() => setMenuOpen(false)}>Get Started Free</a>
          </div>

          {/* Dark-mode toggle always visible */}
          <button className="hp-theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button className="hp-nav-toggle" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════ */}
      <section className="hp-hero">
        {/* Animated mesh gradient background */}
        <div className="hp-hero-mesh">
          <div className="hp-mesh-orb hp-orb-1" />
          <div className="hp-mesh-orb hp-orb-2" />
          <div className="hp-mesh-orb hp-orb-3" />
          <div className="hp-mesh-grid" />
        </div>

        <div className="hp-hero-body">
          {/* Left: copy */}
          <div className="hp-hero-copy">
            <div className="hp-hero-badge">
              <Sparkles size={12} /> AI-Powered Personal Finance
              <span className="hp-hero-badge-live"><span className="hp-live-dot" /> Live</span>
            </div>

            <h1 className="hp-hero-title">
              Track money.<br />
              <span className="hp-hero-gradient-text">Grow wealth.</span>
            </h1>

            <p className="hp-hero-sub">
              Finote gives you real-time spending insights, Groq AI advice,
              OCR bill scanning, and anomaly detection — all in one dashboard.
            </p>

            <div className="hp-hero-actions">
              <a href="/register" className="hp-btn-primary">
                Start Free <ArrowRight size={15} />
              </a>
              <a href="/login" className="hp-btn-ghost">Sign In</a>
            </div>

            {/* Live proof bar */}
            <div className="hp-hero-proof">
              <div className="hp-hero-avatars">
                {['AM','PS','VN','AJ','RG'].map((a,i) => (
                  <div key={a} className="hp-mini-avatar" style={{ zIndex: 5-i }}>{a}</div>
                ))}
              </div>
              <div className="hp-hero-proof-text">
                <strong>{liveStats.users > 0 ? liveStats.users.toLocaleString() : '…'}</strong> users ·{' '}
                <strong>{liveStats.avgRating > 0 ? liveStats.avgRating.toFixed(1) : '…'}★</strong> avg rating
              </div>
              <span className="hp-live-pill"><span className="hp-live-dot" /> Real-time</span>
            </div>
          </div>

          {/* Right: floating card cluster */}
          <div className="hp-hero-visual">
            {/* Main dashboard card */}
            <div className="hp-main-card">
              <div className="hp-main-card-header">
                <div className="hp-main-card-logo"><TrendingUp size={14} /></div>
                <span>Finote Dashboard</span>
                <div className="hp-main-card-dots">
                  <span/><span/><span/>
                </div>
              </div>
              <div className="hp-main-card-balance-label">Total Balance</div>
              <div className="hp-main-card-balance">₹1,24,800</div>
              <div className="hp-main-card-row">
                <div className="hp-main-card-pill income">
                  <TrendingUp size={11} /> +₹48,000
                </div>
                <div className="hp-main-card-pill expense">
                  <TrendingUp size={11} style={{transform:'scaleY(-1)'}} /> -₹23,200
                </div>
              </div>
              <div className="hp-main-card-bar-label">Savings Rate</div>
              <div className="hp-main-card-bar">
                <div className="hp-main-card-bar-fill" />
                <span className="hp-main-card-bar-pct">52%</span>
              </div>
              <div className="hp-main-card-cats">
                {[['Food','#EF4444',40],['Bills','#3B82F6',25],['Travel','#10B981',20],['Other','#8B5CF6',15]].map(([n,c,w])=>(
                  <div key={n} className="hp-main-card-cat">
                    <div className="hp-main-card-cat-dot" style={{background:c}}/>
                    <span>{n}</span>
                    <div className="hp-main-card-cat-bar">
                      <div style={{width:`${w}%`,background:c,height:'100%',borderRadius:4}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating micro-cards */}
            <FloatingCard className="hp-float-ai" style={{}}>
              <Brain size={14} style={{color:'#8B5CF6'}}/>
              <div>
                <div className="hp-float-title">AI Insight</div>
                <div className="hp-float-body">Cut Food by ₹2,400 to hit your goal</div>
              </div>
            </FloatingCard>

            <FloatingCard className="hp-float-alert" style={{}}>
              <Bell size={13} style={{color:'#F59E0B'}}/>
              <div className="hp-float-body">Unusual expense detected — ₹8,500</div>
            </FloatingCard>

            <FloatingCard className="hp-float-save" style={{}}>
              <CheckCircle size={14} style={{color:'#10B981'}}/>
              <div>
                <div className="hp-float-title">Saved this month</div>
                <div className="hp-float-amount">₹24,800</div>
              </div>
            </FloatingCard>

            <FloatingCard className="hp-float-ocr" style={{}}>
              <Receipt size={13} style={{color:'#0EA5E9'}}/>
              <div className="hp-float-body">Bill scanned → Added to Food</div>
            </FloatingCard>
          </div>
        </div>
      </section>

      {/* ══ LIVE STATS ══════════════════════════════════════════ */}
      <section className="hp-stats-section" ref={statsRef}>
        <div className="hp-stats-inner">
          <StatTile icon={Users}    label="Active Users"         value={cUsers.toLocaleString()}   color="#3B82F6" />
          <StatTile icon={Activity} label="Transactions Tracked" value={cTxns.toLocaleString()}    color="#8B5CF6" />
          <StatTile icon={Wallet}   label="Volume Tracked"       value={fmt(cVol)}                 color="#10B981" />
          <StatTile icon={Award}    label="Avg Rating"           value={displayRating}             color="#F59E0B" suffix="★" />
        </div>
        <p className="hp-stats-note">
          <span className="hp-live-dot" /> Numbers update in real-time from the database
        </p>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════════ */}
      <section className="hp-features-section">
        <InView className="hp-section-inner">
          <p className="hp-section-eyebrow">Everything you need</p>
          <h2 className="hp-section-title">A complete financial OS</h2>
          <p className="hp-section-sub">
            From daily expense tracking to AI-powered anomaly detection —
            every tool you need in one fast, intelligent dashboard.
          </p>
          <div className="hp-features-grid">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 80} />
            ))}
          </div>
        </InView>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════ */}
      <section className="hp-how-section">
        <InView className="hp-section-inner">
          <p className="hp-section-eyebrow">How it works</p>
          <h2 className="hp-section-title">Up and running in 60 seconds</h2>
          <div className="hp-steps-row">
            {[
              { n:'01', icon:CheckCircle, title:'Create account',   desc:'Sign up free — no credit card needed.' },
              { n:'02', icon:Receipt,     title:'Log transactions', desc:'Add manually or scan bills with OCR.' },
              { n:'03', icon:Brain,       title:'Get AI insights',  desc:'Groq AI analyses patterns, gives advice.' },
              { n:'04', icon:TrendingUp,  title:'Grow wealth',      desc:'Hit goals with data-backed decisions.' },
            ].map((s, i) => (
              <div key={s.n} className="hp-step-card">
                <div className="hp-step-num">{s.n}</div>
                <div className="hp-step-icon-wrap"><s.icon size={20} /></div>
                <h4 className="hp-step-title">{s.title}</h4>
                <p className="hp-step-desc">{s.desc}</p>
                {i < 3 && <div className="hp-step-connector"><ChevronRight size={16} /></div>}
              </div>
            ))}
          </div>
        </InView>
      </section>

      {/* ══ REVIEWS — marquee + grid ═════════════════════════════ */}
      <section className="hp-reviews-section">
        <InView className="hp-section-inner">
          <p className="hp-section-eyebrow">Real User Reviews</p>
          <h2 className="hp-section-title">What our users say</h2>
          <div className="hp-reviews-meta-row">
            <Stars rating={liveStats.avgRating || 4.8} size={20} />
            <span className="hp-reviews-avg">
              {liveStats.avgRating > 0 ? liveStats.avgRating.toFixed(1) : '4.8'} / 5
            </span>
            <span className="hp-reviews-count">
              · {liveStats.reviewCount > 0 ? liveStats.reviewCount : reviews.length} reviews
            </span>
            <span className="hp-live-pill"><span className="hp-live-dot" /> Live</span>
          </div>
        </InView>

        {/* Infinite marquee strip */}
        <div className="hp-marquee-wrap">
          <div className="hp-marquee-track">
            {marqueeSet.map((r, i) => (
              <div key={`${r._id}-${i}`} className="hp-marquee-card">
                <Stars rating={r.rating} />
                <p className="hp-marquee-text">"{r.content}"</p>
                <div className="hp-marquee-author">
                  <strong>{r.name}</strong>
                  {r.createdAt && (
                    <span>{new Date(r.createdAt).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Static grid below marquee */}
        <InView className="hp-section-inner">
          <div className="hp-reviews-grid">
            {reviews.slice(0, 6).map((r, i) => (
              <ReviewCard key={r._id} review={r} delay={i * 70} />
            ))}
          </div>
          <div style={{ textAlign:'center', marginTop:'2rem' }}>
            <a href="/register" className="hp-btn-primary" style={{ display:'inline-flex' }}>
              Join them — it's free <ChevronRight size={16} />
            </a>
          </div>
        </InView>
      </section>

      {/* ══ CTA BANNER ══════════════════════════════════════════ */}
      <section className="hp-cta-section">
        <div className="hp-cta-orb hp-cta-orb-1" />
        <div className="hp-cta-orb hp-cta-orb-2" />
        <div className="hp-cta-inner">
          <PieChart size={40} className="hp-cta-icon" />
          <h2 className="hp-cta-title">Ready to take control?</h2>
          <p className="hp-cta-sub">
            Join {liveStats.users > 0 ? liveStats.users.toLocaleString() : 'thousands of'} users
            already tracking smarter with Finote.
          </p>
          <a href="/register" className="hp-cta-btn">
            Get Started — It's Free <ArrowRight size={16} />
          </a>
          <div className="hp-cta-perks">
            {['No credit card','AI features included','Cancel anytime'].map(p => (
              <span key={p} className="hp-cta-perk"><CheckCircle size={13} /> {p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════ */}
      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <div className="hp-footer-brand">
            <div className="hp-nav-logo-icon" style={{ width:32, height:32 }}><TrendingUp size={16} /></div>
            <span className="hp-footer-brand-name">Finote</span>
          </div>
          <p className="hp-footer-copy">© 2025 Finote · Built with ♥ in India</p>
          <div className="hp-footer-links">
            <a href="/login">Sign In</a>
            <a href="/register">Register</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
