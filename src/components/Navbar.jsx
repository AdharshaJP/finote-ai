import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Sun, Moon, LogOut, ChevronDown, Menu, User, Settings, TrendingUp, Bell } from 'lucide-react';
import ProfileModal from './ProfileModal.jsx';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/budgets': 'Budget Planner',
  '/ai-insights': 'AI Insights',
  '/ai-predict': 'Spending Predictions',
  '/afford': 'Afford Checker',
  '/assistant': 'AI Assistant',
};

const Navbar = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [profileOpen, setProfileOpen] = useState(false);
  const profileBtnRef = useRef(null);
  const dropdownRef = useRef(null);

  const pageTitle = PAGE_TITLES[location.pathname] || 'Finote';
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const openDropdown = () => {
    if (profileBtnRef.current) {
      const rect = profileBtnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setDropdownOpen(v => !v);
  };

  const handleViewProfile = () => {
    setDropdownOpen(false);
    setProfileOpen(true);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        profileBtnRef.current && !profileBtnRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          <button className="navbar-menu-btn" onClick={onMenuToggle} title="Toggle sidebar">
            <Menu size={20} />
          </button>
          <div className="navbar-page-title">
            <TrendingUp size={16} className="navbar-title-icon" />
            <h2>{pageTitle}</h2>
          </div>
        </div>

        <div className="navbar-right">
          <button onClick={toggleTheme} className="navbar-icon-btn" title="Toggle theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button className="navbar-icon-btn" title="Notifications" onClick={handleViewProfile}>
            <Bell size={18} />
            <span className="navbar-notif-dot" />
          </button>

          {/* Profile button */}
          <button
            ref={profileBtnRef}
            className="navbar-profile-btn"
            onClick={openDropdown}
          >
            <div className="navbar-avatar">{initials}</div>
            <div className="navbar-user-text">
              <span className="navbar-user-name">{user?.name}</span>
              <span className="navbar-user-role">Personal Account</span>
            </div>
            <ChevronDown size={14} className={`navbar-chevron ${dropdownOpen ? 'open' : ''}`} />
          </button>
        </div>

        {/* Dropdown — fixed position to escape navbar stacking context */}
        {dropdownOpen && (
          <div
            ref={dropdownRef}
            className="navbar-dropdown"
            style={{ top: dropdownPos.top, right: dropdownPos.right }}
          >
            <div className="navbar-dropdown-header">
              <div className="navbar-dropdown-avatar-lg">{initials}</div>
              <div>
                <div className="navbar-dropdown-name">{user?.name}</div>
                <div className="navbar-dropdown-email">{user?.email}</div>
                <span className="navbar-dropdown-badge">Free Plan</span>
              </div>
            </div>

            <div className="navbar-dropdown-divider" />

            <button className="navbar-dropdown-item" onClick={handleViewProfile}>
              <div className="navbar-dropdown-item-icon"><User size={14} /></div>
              <div>
                <div className="navbar-dropdown-item-label">View Profile</div>
                <div className="navbar-dropdown-item-sub">Account details &amp; alerts</div>
              </div>
            </button>

            <button className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
              <div className="navbar-dropdown-item-icon"><Settings size={14} /></div>
              <div>
                <div className="navbar-dropdown-item-label">Settings</div>
                <div className="navbar-dropdown-item-sub">Preferences &amp; security</div>
              </div>
            </button>

            <div className="navbar-dropdown-divider" />

            <button
              className="navbar-dropdown-item danger"
              onClick={() => { logout(); setDropdownOpen(false); }}
            >
              <div className="navbar-dropdown-item-icon danger"><LogOut size={14} /></div>
              <div>
                <div className="navbar-dropdown-item-label">Sign Out</div>
                <div className="navbar-dropdown-item-sub">See you later!</div>
              </div>
            </button>
          </div>
        )}
      </nav>

      {/* Profile modal */}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </>
  );
};

export default Navbar;
