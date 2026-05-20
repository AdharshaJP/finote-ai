import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, CreditCard, Target, TrendingUp,
  Brain, DollarSign, MessageCircle, ChevronDown,
  ChevronRight, Sparkles, BarChart3, X, LogOut, Receipt, FileText, Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const mainMenu = [
  { path: '/dashboard', icon: Home, label: 'Dashboard' },
  { path: '/transactions', icon: CreditCard, label: 'Transactions' },
  { path: '/budgets', icon: Target, label: 'Budgets' },
  { path: '/bills', icon: FileText, label: 'My Bills' },
];

const aiMenu = [
  { path: '/ai-insights', icon: Brain, label: 'AI Insights', badge: 'Smart' },
  { path: '/ai-predict', icon: BarChart3, label: 'Predictions', badge: 'New' },
  { path: '/afford', icon: DollarSign, label: 'Afford Check' },
  { path: '/assistant', icon: MessageCircle, label: 'AI Assistant' },
  { path: '/upload-bill', icon: Upload, label: 'Upload Bill', badge: 'OCR' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [aiExpanded, setAiExpanded] = useState(true);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`sidebar ${isOpen ? 'sidebar-mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <TrendingUp size={20} />
            </div>
            <span className="sidebar-logo-text">Finote</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* Main section */}
          <div className="sidebar-section-label">Main</div>
          {mainMenu.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-link-icon"><item.icon size={18} /></span>
              <span className="sidebar-link-label">{item.label}</span>
            </Link>
          ))}

          {/* AI Tools section */}
          <div className="sidebar-section-divider" />
          <button
            className="sidebar-section-toggle"
            onClick={() => setAiExpanded(v => !v)}
          >
            <div className="sidebar-section-toggle-left">
              <Sparkles size={14} />
              <span>AI Tools</span>
            </div>
            {aiExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {aiExpanded && aiMenu.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-link-icon"><item.icon size={18} /></span>
              <span className="sidebar-link-label">{item.label}</span>
              {item.badge && (
                <span className="sidebar-badge">{item.badge}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* User profile at bottom */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
          <button className="sidebar-logout-btn" onClick={logout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
