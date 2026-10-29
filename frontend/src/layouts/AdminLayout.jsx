import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Home,
  Building2,
  Users,
  UserCheck,
  ArrowLeftRight,
  ShieldCheck,
  FileText,
  Activity,
  Layers,
  ChevronRight,
  Bell,
  Search,
  ExternalLink,
  Shield
} from 'lucide-react';
import ProfileModal from '../components/ProfileModal';
import ErrorBoundary from '../components/ErrorBoundary';

export default function AdminLayout() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: "Dr. K. Senthil Nathan",
    initials: "SN",
    role: "State Interoperability Administrator",
    accountType: "System Admin Account",
    email: "interop.admin@healthbridge.tn.gov.in",
    phone: "+91 98400 12345",
    organization: "TN Health Systems Project (TNHSP)",
    department: "Directorate of Medical Services",
    apiKeys: {
      publicKey: "tn_hb_live_8f3a9201bc678d91"
    }
  });

  const navItems = [
    { to: '/admin/overview', label: 'Overview', icon: Home },
    { to: '/admin/organizations', label: 'Organizations (6)', icon: Building2 },
    { to: '/admin/users', label: 'Authorized Users', icon: Users },
    { to: '/admin/patients', label: 'Universal Patient Identity', icon: UserCheck },
    { to: '/admin/transfers', label: 'Transfer History', icon: ArrowLeftRight },
    { to: '/admin/consents', label: 'ABDM Consents', icon: ShieldCheck },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
    { to: '/admin/settings', label: 'System Health & Settings', icon: Activity },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc', color: '#1e293b' }}>
      {/* Top Admin Header */}
      <header style={{
        height: '60px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        {/* Brand & Portal Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Shield size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
                TN HealthBridge
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                State Interoperability Gateway
              </div>
            </div>
          </Link>

          <span style={{ height: '20px', width: '1px', background: '#cbd5e1' }}></span>

          <span style={{
            fontSize: '11.5px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '12px',
            background: '#0f172a',
            color: '#ffffff',
            letterSpacing: '0.02em'
          }}>
            PLATFORM ADMIN PORTAL
          </span>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{
            fontSize: '11.5px',
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: '12px',
            background: '#f0fdf4',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
            State Core Online
          </span>

          <Link
            to="/"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#f1f5f9',
              color: '#334155',
              textDecoration: 'none',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={13} />
            <span>Portal Switcher</span>
          </Link>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px 4px 6px',
              borderRadius: '20px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700
            }}>
              {userProfile.initials}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{userProfile.name}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Admin</div>
            </div>
          </button>
        </div>
      </header>

      {/* Admin Body Container */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left Vertical Dark-Slate Sidebar */}
        <aside style={{
          width: '240px',
          background: '#0f172a',
          color: '#94a3b8',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid #1e293b',
          flexShrink: 0
        }}>
          {/* Navigation Links */}
          <div style={{ padding: '16px 10px' }}>
            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 700, padding: '0 12px 10px 12px' }}>
              Platform Administration
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#ffffff' : '#94a3b8',
                      background: isActive ? '#0284c7' : 'transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease'
                    })}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div style={{ padding: '16px', borderTop: '1px solid #1e293b', fontSize: '11.5px', color: '#64748b' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#cbd5e1' }}>TN HealthBridge Core</strong>
              <div>Version 2.0.4-Enterprise</div>
            </div>
            <Link
              to="/"
              style={{
                color: '#38bdf8',
                textDecoration: 'none',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              &larr; Return to Portals Hub
            </Link>
          </div>
        </aside>

        {/* Main Routed Content Area */}
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <ErrorBoundary fallbackTitle="Admin Portal Error">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {isProfileModalOpen && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          profile={userProfile}
          onSave={(p) => setUserProfile(p)}
        />
      )}
    </div>
  );
}

