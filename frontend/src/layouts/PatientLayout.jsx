import React, { createContext, useContext, useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Activity,
  ShieldCheck,
  Building2,
  Clock,
  Layers,
  RefreshCw,
  Bell,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  listAllPortalPatients,
  getPatientProfile,
  listPatientConsents,
  getPatientHospitals,
  getPatientRecords,
  getPatientSharingHistory,
  decidePatientConsent,
  revokePatientConsent
} from '../services/apiClient';

export const PatientContext = createContext(null);

export default function PatientLayout() {
  const [allPatients, setAllPatients] = useState([]);
  const [selectedUpid, setSelectedUpid] = useState('');
  const [profile, setProfile] = useState(null);
  const [consents, setConsents] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [records, setRecords] = useState([]);
  const [sharingHistory, setSharingHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadPatientsList();
  }, []);

  const loadPatientsList = async () => {
    try {
      const pts = await listAllPortalPatients();
      setAllPatients(pts);
      const target = selectedUpid || (pts.length > 0 ? pts[0].universal_patient_id : '');
      if (target) {
        setSelectedUpid(target);
        await loadPatientData(target);
      }
    } catch (e) {
      console.error('Error loading patients list:', e);
    }
  };

  const loadPatientData = async (targetUpid = selectedUpid) => {
    if (!targetUpid) return;
    setLoading(true);
    try {
      const [profRes, consentRes, hospRes, recRes, shareRes] = await Promise.all([
        getPatientProfile(targetUpid).catch(() => null),
        listPatientConsents(targetUpid).catch(() => []),
        getPatientHospitals(targetUpid).catch(() => []),
        getPatientRecords(targetUpid).catch(() => []),
        getPatientSharingHistory(targetUpid).catch(() => []),
      ]);
      setProfile(profRes);
      setConsents(consentRes);
      setHospitals(hospRes);
      setRecords(recRes);
      setSharingHistory(shareRes);
    } catch (err) {
      console.error('Failed to load patient data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Background auto-refresh for real-time consent requests & transfers
  useEffect(() => {
    if (!selectedUpid) return;
    const interval = setInterval(() => {
      Promise.all([
        getPatientProfile(selectedUpid).catch(() => null),
        listPatientConsents(selectedUpid).catch(() => []),
        getPatientHospitals(selectedUpid).catch(() => []),
        getPatientRecords(selectedUpid).catch(() => []),
        getPatientSharingHistory(selectedUpid).catch(() => []),
      ]).then(([profRes, consentRes, hospRes, recRes, shareRes]) => {
        if (profRes) setProfile(profRes);
        setConsents(consentRes);
        setHospitals(hospRes);
        setRecords(recRes);
        setSharingHistory(shareRes);
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedUpid]);

  const handleConsentDecision = async (consentId, decision, notes = '') => {
    setActionLoading(true);
    try {
      await decidePatientConsent(consentId, decision, notes || `Patient decided ${decision}`, selectedUpid);
      setFeedback({
        type: 'success',
        text: `Consent request ${consentId} was successfully marked as ${decision}.`
      });
      await loadPatientData(selectedUpid);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update consent' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeConsent = async (consentId, reason = '') => {
    setActionLoading(true);
    try {
      await revokePatientConsent(consentId, reason || 'Consent revoked by patient via Patient Portal', selectedUpid);
      setFeedback({
        type: 'success',
        text: `Consent ${consentId} has been revoked immediately. Future data releases are blocked.`
      });
      await loadPatientData(selectedUpid);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to revoke consent' });
    } finally {
      setActionLoading(false);
    }
  };

  const pendingConsentsCount = consents.filter((c) => c.artefact.status === 'REQUESTED').length;

  const navItems = [
    { to: '/patient/overview', label: 'My Overview', icon: Layers },
    { to: '/patient/health-records', label: 'My Health Records', icon: Activity, count: records.length },
    { to: '/patient/consent-requests', label: 'Consent Requests', icon: ShieldCheck, badge: pendingConsentsCount },
    { to: '/patient/connected-hospitals', label: 'Connected Hospitals', icon: Building2, count: hospitals.length },
    { to: '/patient/sharing-history', label: 'Sharing History', icon: Clock },
    { to: '/patient/profile', label: 'My Profile', icon: User },
  ];

  return (
    <PatientContext.Provider
      value={{
        selectedUpid,
        setSelectedUpid,
        profile,
        consents,
        hospitals,
        records,
        sharingHistory,
        loading,
        actionLoading,
        loadPatientData,
        handleConsentDecision,
        handleRevokeConsent,
        feedback,
        setFeedback,
      }}
    >
      <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header */}
        <header style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          {/* Main Top Bar */}
          <div style={{
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <User size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
                    TN HealthBridge
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                    Personal Health Portal & Consent Vault
                  </div>
                </div>
              </Link>

              <span style={{ height: '20px', width: '1px', background: '#cbd5e1' }}></span>

              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '12px',
                background: '#e0f2fe',
                color: '#0369a1'
              }}>
                PATIENT PORTAL
              </span>
            </div>

            {/* Right Controls: Patient Switcher & Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Patient Account Dropdown */}
              {allPatients.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Active Patient:</span>
                  <select
                    value={selectedUpid}
                    onChange={(e) => {
                      const newUpid = e.target.value;
                      setSelectedUpid(newUpid);
                      loadPatientData(newUpid);
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#0369a1',
                      background: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    {allPatients.map((p) => (
                      <option key={p.universal_patient_id} value={p.universal_patient_id}>
                        {p.full_name} ({p.universal_patient_id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => loadPatientData(selectedUpid)}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={12} className={loading ? 'spin-icon' : ''} />
                <span>Sync</span>
              </button>

              <Link
                to="/"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '5px 12px',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  color: '#475569',
                  textDecoration: 'none',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Layers size={13} />
                <span>Portals Hub</span>
              </Link>
            </div>
          </div>

          {/* Patient Sub Navigation Tabs */}
          <div style={{ padding: '0 24px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 14px',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#0284c7' : '#64748b',
                    borderBottom: isActive ? '2px solid #0284c7' : '2px solid transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  })}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span style={{
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: '#ea580c',
                      color: '#ffffff',
                      fontSize: '10.5px',
                      fontWeight: 700
                    }}>
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.badge === undefined && (
                    <span style={{
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: '#f1f5f9',
                      color: '#64748b',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      {item.count}
                    </span>
                  )}
                </NavLink>
              );
            })}
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

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '24px', maxWidth: '1200px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <ErrorBoundary fallbackTitle="Patient Portal Error">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatient must be used within a PatientLayout');
  }
  return context;
}

