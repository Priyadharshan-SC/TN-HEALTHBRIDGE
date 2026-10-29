import React, { createContext, useContext, useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  Users,
  FlaskConical,
  Send,
  Inbox,
  ArrowLeftRight,
  Settings,
  Layers,
  RefreshCw,
  Activity,
  CheckCircle2,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';
import { HOSPITALS, getProviderBySlug } from '../config/providers';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  listProviderPatients,
  registerProviderPatient,
  listProviderRecords,
  createProviderRecord,
  listProviderInbox,
  listAllPortalPatients,
  createDynamicConsentRequest,
  executeFederatedExchange
} from '../services/apiClient';

export const HospitalContext = createContext(null);

export default function HospitalLayout() {
  const { providerSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const hospital = getProviderBySlug(providerSlug);

  const [patients, setPatients] = useState([]);
  const [records, setRecords] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadHospitalData();
  }, [hospital.id]);

  const loadHospitalData = async () => {
    setLoading(true);
    try {
      const [pts, recs, inb, allPts] = await Promise.all([
        listProviderPatients(hospital.id).catch(() => []),
        listProviderRecords(hospital.id).catch(() => []),
        listProviderInbox(hospital.id).catch(() => []),
        listAllPortalPatients().catch(() => []),
      ]);
      setPatients(pts);
      setRecords(recs);
      setInbox(inb);
      setAllPatients(allPts);
    } catch (err) {
      console.error('Failed to load hospital data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Background sync every 10 seconds for real-time inbound exchanges
  useEffect(() => {
    const interval = setInterval(() => {
      Promise.all([
        listProviderPatients(hospital.id).catch(() => []),
        listProviderRecords(hospital.id).catch(() => []),
        listProviderInbox(hospital.id).catch(() => []),
        listAllPortalPatients().catch(() => []),
      ]).then(([pts, recs, inb, allPts]) => {
        setPatients(pts);
        setRecords(recs);
        setInbox(inb);
        setAllPatients(allPts);
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [hospital.id]);

  const handleRegisterPatient = async (payload) => {
    const res = await registerProviderPatient(hospital.id, payload);
    await loadHospitalData();
    return res;
  };

  const handleCreateRecord = async (payload) => {
    const res = await createProviderRecord(hospital.id, payload);
    await loadHospitalData();
    return res;
  };

  const navItems = [
    { to: `/hospital/${hospital.slug}/overview`, label: 'Facility Overview', icon: Activity },
    { to: `/hospital/${hospital.slug}/patients`, label: 'Local Patient Directory', icon: Users, count: patients.length },
    { to: `/hospital/${hospital.slug}/clinical-records`, label: 'Clinical Lab Reports', icon: FlaskConical, count: records.length },
    { to: `/hospital/${hospital.slug}/exchange-requests`, label: 'Cross-Hospital Exchange', icon: Send },
    { to: `/hospital/${hospital.slug}/inbox`, label: 'Clinical Delivery Inbox', icon: Inbox, count: inbox.length },
    { to: `/hospital/${hospital.slug}/transfers`, label: 'Facility Transfer Logs', icon: ArrowLeftRight },
    { to: `/hospital/${hospital.slug}/settings`, label: 'Facility Adapter Settings', icon: Settings },
  ];

  return (
    <HospitalContext.Provider
      value={{
        hospital,
        patients,
        records,
        inbox,
        allPatients,
        loading,
        feedback,
        setFeedback,
        loadHospitalData,
        handleRegisterPatient,
        handleCreateRecord,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc', color: '#1e293b' }}>
        {/* Top Header */}
        <header style={{
          height: '62px',
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
          {/* Facility Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: hospital.badgeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '18px'
              }}>
                {hospital.iconEmoji}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
                    {hospital.name}
                  </span>
                  <code style={{ fontSize: '11px', padding: '1px 5px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 700 }}>
                    {hospital.code}
                  </code>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {hospital.officialName}
                </div>
              </div>
            </Link>

            <span style={{ height: '20px', width: '1px', background: '#cbd5e1' }}></span>

            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '10px',
              background: '#f1f5f9',
              color: '#334155'
            }}>
              {hospital.typeLabel}
            </span>
          </div>

          {/* Right Controls: Hospital Switcher & Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Hospital Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Switch Facility:</span>
              <select
                value={hospital.slug}
                onChange={(e) => {
                  const targetSlug = e.target.value;
                  const currentSubPath = location.pathname.split('/').slice(3).join('/') || 'overview';
                  navigate(`/hospital/${targetSlug}/${currentSubPath}`);
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#0f172a',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                {HOSPITALS.map((h) => (
                  <option key={h.id} value={h.slug}>
                    {h.iconEmoji} {h.name} ({h.code})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadHospitalData}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={12} className={loading ? 'spin-icon' : ''} />
              <span>Sync</span>
            </button>

            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '10px',
              background: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a' }}></span>
              Adapter Online
            </span>

            <Link
              to="/"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '5px 10px',
                borderRadius: '6px',
                background: '#f1f5f9',
                color: '#475569',
                textDecoration: 'none',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Layers size={13} />
              <span>Portals Hub</span>
            </Link>
          </div>
        </header>

        {/* Feedback Alert Bar */}
        {feedback && (
          <div style={{
            padding: '10px 24px',
            background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: feedback.type === 'success' ? '#166534' : '#991b1b',
            borderBottom: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            fontWeight: 600
          }}>
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}>
              &times;
            </button>
          </div>
        )}

        {/* Hospital Layout Body */}
        <div style={{ display: 'flex', flex: 1 }}>
          {/* Left Navigation Sidebar */}
          <aside style={{
            width: '230px',
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div>
              <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 700, padding: '0 8px 10px 8px' }}>
                Hospital Workflows
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
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#0284c7' : '#475569',
                        background: isActive ? '#f0f9ff' : 'transparent',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease'
                      })}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </div>
                      {item.count !== undefined && (
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '10px',
                          background: '#f1f5f9',
                          color: '#64748b',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          {item.count}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Footer */}
            <div style={{ padding: '12px 8px', borderTop: '1px solid #f1f5f9', fontSize: '11.5px', color: '#64748b' }}>
              <div>Authorized Facility Node</div>
              <strong style={{ color: '#0f172a' }}>{hospital.code} &bull; {hospital.district}</strong>
            </div>
          </aside>

          {/* Main Routed Content Area */}
          <main style={{ flex: 1, minWidth: 0, padding: '24px 32px', overflowY: 'auto' }}>
            <ErrorBoundary fallbackTitle="Hospital Workflow Error">
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </HospitalContext.Provider>
  );
}

export function useHospital() {
  const context = useContext(HospitalContext);
  if (!context) {
    throw new Error('useHospital must be used within a HospitalLayout');
  }
  return context;
}

