import React from 'react';
import { 
  Home, 
  ArrowLeftRight, 
  UserCheck, 
  Building2, 
  Users, 
  FileText, 
  Activity, 
  HelpCircle,
  ShieldCheck,
  User
} from 'lucide-react';

export default function Sidebar({ 
  activeNav = 'overview', 
  setActiveNav,
  currentPortal = 'admin',
  setCurrentPortal 
}) {
  const adminNavItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
    { id: 'patient-identity', label: 'Patient Identity', icon: UserCheck },
    { id: 'organizations', label: 'Organizations', icon: Building2 },
    { id: 'org-access', label: 'Organization Access', icon: Users },
    { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
    { id: 'system-status', label: 'System Status', icon: Activity },
  ];

  return (
    <aside className="app-sidebar">
      {/* Portal Selection Quick Switcher */}
      <div style={{ padding: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 700, marginBottom: '8px' }}>
          Portal Mode
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={() => setCurrentPortal('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: currentPortal === 'admin' ? 700 : 500,
              background: currentPortal === 'admin' ? '#0284c7' : 'rgba(255,255,255,0.05)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <ShieldCheck size={14} />
            <span>Admin Portal</span>
          </button>
          <button
            onClick={() => setCurrentPortal('patient')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: currentPortal === 'patient' ? 700 : 500,
              background: currentPortal === 'patient' ? '#0284c7' : 'rgba(255,255,255,0.05)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <User size={14} />
            <span>Patient Portal</span>
          </button>
          <button
            onClick={() => setCurrentPortal('provider')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: currentPortal === 'provider' ? 700 : 500,
              background: currentPortal === 'provider' ? '#0284c7' : 'rgba(255,255,255,0.05)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <Building2 size={14} />
            <span>Hospital Nodes (6)</span>
          </button>
        </div>
      </div>

      {currentPortal === 'admin' && (
        <nav className="sidebar-nav">
          <div style={{ padding: '8px 12px 4px 12px', fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
            Admin Menu
          </div>
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveNav?.(item.id)}
              >
                <Icon size={18} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {currentPortal === 'patient' && (
        <div style={{ padding: '16px 12px', color: '#cbd5e1', fontSize: '12px' }}>
          <strong style={{ color: '#fff', display: 'block', marginBottom: '6px' }}>Patient Workspace</strong>
          <p style={{ margin: 0, lineHeight: 1.4, color: '#94a3b8' }}>
            Logged in as <strong>Arun Kumar</strong> (<code>UPID-ARUN-001</code>). Navigate tabs on main dashboard.
          </p>
        </div>
      )}

      {currentPortal === 'provider' && (
        <div style={{ padding: '16px 12px', color: '#cbd5e1', fontSize: '12px' }}>
          <strong style={{ color: '#fff', display: 'block', marginBottom: '6px' }}>Provider Workspace</strong>
          <p style={{ margin: 0, lineHeight: 1.4, color: '#94a3b8' }}>
            Switch between the 6 federated hospital nodes via top workspace selector.
          </p>
        </div>
      )}

      <div className="sidebar-footer">
        <button className="sidebar-nav-item footer-item" onClick={() => alert('TN HealthBridge Interoperability Help & Support Desk\nEmail: interop.support@healthbridge.tn.gov.in\nHelpline: 1800-425-TN-HEALTH')}>
          <HelpCircle size={18} className="nav-icon" />
          <span className="nav-label">Help & Support</span>
        </button>
      </div>
    </aside>
  );
}
