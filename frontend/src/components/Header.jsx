import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  User, 
  Key, 
  Building2, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  ArrowRight,
  ShieldCheck,
  Server
} from 'lucide-react';
import { checkHealth } from '../services/apiClient';

export default function Header({ 
  searchQuery, 
  setSearchQuery, 
  userProfile, 
  onOpenProfile, 
  onNavigate,
  currentPortal = 'admin',
  setCurrentPortal 
}) {
  const [backendStatus, setBackendStatus] = useState({ online: false, checking: true, details: null });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [notifications] = useState([
    {
      id: 1,
      title: 'TXN-1008 Delivery Failure',
      desc: 'Destination timeout during TLS handshake to Metro Hospital',
      time: '10:42 AM',
      type: 'error',
      navTarget: 'transfers'
    },
    {
      id: 2,
      title: 'Consent Breakout Authorization',
      desc: 'Dr. Priya S requested explicit access for PAT-2050',
      time: '10:38 AM',
      type: 'warning',
      navTarget: 'audit-logs'
    },
    {
      id: 3,
      title: 'Node Interop Certificate Verified',
      desc: 'ORG-001 City Hospital endpoint mutual TLS verified',
      time: '09:00 AM',
      type: 'success',
      navTarget: 'org-access'
    }
  ]);

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll FastAPI backend health
  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      const health = await checkHealth();
      if (active) {
        if (health && health.status === 'healthy') {
          setBackendStatus({ online: true, checking: false, details: health });
        } else {
          setBackendStatus({ online: false, checking: false, details: null });
        }
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleMarkAllRead = () => {
    setUnreadCount(0);
  };

  const handleSelectNotification = (n) => {
    setIsNotificationsOpen(false);
    if (n.navTarget) {
      onNavigate?.(n.navTarget);
    }
  };

  // Quick search matching
  const searchMatches = searchQuery.trim() ? [
    { type: 'Patient', name: 'Arun Kumar (PAT-2048)', nav: 'patient-identity' },
    { type: 'Patient', name: 'Priya S (PAT-2050)', nav: 'patient-identity' },
    { type: 'Transaction', name: 'TXN-1021 (Lab Report)', nav: 'transfers' },
    { type: 'Transaction', name: 'TXN-1008 (Observation)', nav: 'transfers' },
    { type: 'Organization', name: 'City Hospital (ORG-001)', nav: 'organizations' },
    { type: 'Organization', name: 'Central Laboratory (ORG-002)', nav: 'organizations' },
    { type: 'System', name: 'System Status (M1–M7)', nav: 'system-status' }
  ].filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  return (
    <header className="app-header">
      {/* Brand Logo & Platform Title */}
      <div className="header-brand" onClick={() => onNavigate?.('overview')} style={{ cursor: 'pointer' }}>
        <div className="brand-logo-container">
          <svg className="brand-logo-icon" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="16" stroke="#075985" strokeWidth="2.5" />
            <circle cx="18" cy="18" r="10" stroke="#075985" strokeWidth="1.8" strokeDasharray="3 2" />
            <path d="M18 9V27M9 18H27" stroke="#0EA5E9" strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="18" cy="18" r="3.5" fill="#0EA5E9" />
          </svg>
        </div>
        <div className="brand-text-container">
          <h1 className="brand-title">TN HealthBridge</h1>
          <span className="brand-subtitle">Healthcare Interoperability Platform</span>
        </div>
      </div>

      {/* Top Portal Switcher Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setCurrentPortal?.('admin')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: currentPortal === 'admin' ? 700 : 500,
            background: currentPortal === 'admin' ? '#0284c7' : 'transparent',
            color: currentPortal === 'admin' ? '#ffffff' : '#475569',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <ShieldCheck size={14} />
          <span>Admin Portal</span>
        </button>

        <button
          onClick={() => setCurrentPortal?.('patient')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: currentPortal === 'patient' ? 700 : 500,
            background: currentPortal === 'patient' ? '#0284c7' : 'transparent',
            color: currentPortal === 'patient' ? '#ffffff' : '#475569',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <User size={14} />
          <span>Patient Portal</span>
        </button>

        <button
          onClick={() => setCurrentPortal?.('provider')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: currentPortal === 'provider' ? 700 : 500,
            background: currentPortal === 'provider' ? '#0284c7' : 'transparent',
            color: currentPortal === 'provider' ? '#ffffff' : '#475569',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <Building2 size={14} />
          <span>Hospital Nodes (6)</span>
        </button>
      </div>

      <div className="header-actions">
        {/* Backend Connectivity Status */}
        <div 
          className="header-backend-pill"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: backendStatus.online ? '#ecfdf5' : '#fef2f2',
            color: backendStatus.online ? '#065f46' : '#991b1b',
            border: `1px solid ${backendStatus.online ? '#a7f3d0' : '#fecaca'}`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}
          title={backendStatus.online 
            ? `FastAPI Backend Online (${backendStatus.details?.service} v${backendStatus.details?.version}) — Click to view docs` 
            : 'FastAPI Backend Offline at http://127.0.0.1:8000 — Click to retry'}
          onClick={() => {
            if (backendStatus.online) {
              window.open('http://127.0.0.1:8000/docs', '_blank');
            } else {
              checkHealth().then((h) => {
                if (h && h.status === 'healthy') {
                  setBackendStatus({ online: true, checking: false, details: h });
                }
              });
            }
          }}
        >
          <span 
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: backendStatus.online ? '#10b981' : '#ef4444',
              boxShadow: backendStatus.online ? '0 0 0 2px #d1fae5' : '0 0 0 2px #fee2e2'
            }}
          />
          <Server size={14} style={{ opacity: 0.8 }} />
          <span>{backendStatus.online ? `FastAPI: Online (v${backendStatus.details?.version || '0.2.0'})` : 'FastAPI: Offline'}</span>
        </div>

        {/* Global Search Bar */}
        <div className="header-search-wrapper" ref={searchRef}>
          <div className="header-search-box">
            <Search className="search-icon" size={17} />
            <input
              type="text"
              placeholder="Search by patient ID, transaction ID, organization..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
            />
          </div>

          {/* Quick Search Dropdown Modal */}
          {isSearchOpen && searchMatches.length > 0 && (
            <div className="header-search-dropdown">
              <div className="search-dropdown-header">
                <span>Matching Records</span>
              </div>
              {searchMatches.map((item, idx) => (
                <div 
                  key={idx} 
                  className="search-dropdown-item"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                    setCurrentPortal?.('admin');
                    onNavigate?.(item.nav);
                  }}
                >
                  <span className="search-match-type">{item.type}</span>
                  <span className="search-match-name">{item.name}</span>
                  <ArrowRight size={13} className="search-match-arrow" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <div className="header-notif-wrapper" ref={notifRef}>
          <button 
            className="notif-btn"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount}</span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotificationsOpen && (
            <div className="notif-dropdown-panel">
              <div className="notif-panel-header">
                <span className="notif-panel-title">Notifications</span>
                {unreadCount > 0 && (
                  <button className="notif-mark-read-btn" onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                )}
              </div>

              <div className="notif-items-list">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`notif-item ${n.type}`}
                    onClick={() => handleSelectNotification(n)}
                  >
                    <div className="notif-icon-box">
                      {n.type === 'error' && <AlertTriangle size={16} className="text-red-500" />}
                      {n.type === 'warning' && <Info size={16} className="text-amber-500" />}
                      {n.type === 'success' && <CheckCircle2 size={16} className="text-green-500" />}
                    </div>
                    <div className="notif-content">
                      <strong className="notif-title">{n.title}</strong>
                      <p className="notif-desc">{n.desc}</p>
                      <span className="notif-time">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="notif-panel-footer">
                <button 
                  className="notif-view-all-btn"
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    setCurrentPortal?.('admin');
                    onNavigate?.('audit-logs');
                  }}
                >
                  View All Audit Events &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Account / Profile */}
        <div className="header-profile-wrapper" ref={profileRef}>
          <div 
            className="user-profile-trigger" 
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          >
            <div className="user-avatar-circle">
              <span>{userProfile?.initials || 'MP'}</span>
            </div>
            <div className="user-info">
              <span className="user-name">{userProfile?.name || 'Middleware Provider'}</span>
              <span className="user-role">{userProfile?.accountType || 'Provider Account'}</span>
            </div>
            <ChevronDown size={16} className={`user-dropdown-arrow ${isProfileMenuOpen ? 'open' : ''}`} />
          </div>

          {/* Profile Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="profile-dropdown-menu">
              <div className="dropdown-user-header">
                <div className="dropdown-avatar">
                  <span>{userProfile?.initials || 'MP'}</span>
                </div>
                <div className="dropdown-user-text">
                  <strong className="dropdown-fullname">{userProfile?.name}</strong>
                  <span className="dropdown-role">{userProfile?.role}</span>
                  <span className="dropdown-email">{userProfile?.email}</span>
                </div>
              </div>

              <div className="dropdown-divider" />

              <div className="dropdown-items-list">
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenProfile();
                  }}
                >
                  <User size={16} className="item-icon" />
                  <span>My Profile & Settings</span>
                </button>

                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenProfile();
                  }}
                >
                  <Key size={16} className="item-icon" />
                  <span>API Keys & Credentials</span>
                </button>

                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setCurrentPortal?.('admin');
                    onNavigate?.('org-access');
                  }}
                >
                  <Building2 size={16} className="item-icon" />
                  <span>Switch Connected Facility</span>
                </button>

                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenProfile();
                  }}
                >
                  <ShieldCheck size={16} className="item-icon" />
                  <span>Security & MFA Status</span>
                </button>
              </div>

              <div className="dropdown-divider" />

              <button 
                className="dropdown-item sign-out-item"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  alert('Session refreshed.');
                }}
              >
                <LogOut size={16} className="item-icon" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
