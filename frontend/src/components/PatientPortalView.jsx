import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  FileText,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Lock,
  Eye,
  Check,
  X,
  Activity,
  Calendar,
  Layers,
  Info
} from 'lucide-react';
import {
  getPatientProfile,
  listPatientConsents,
  decidePatientConsent,
  revokePatientConsent,
  getPatientHospitals,
  getPatientRecords,
  getPatientSharingHistory,
  listAllPortalPatients,
} from '../services/apiClient';

export default function PatientPortalView() {
  const [activeTab, setActiveTab] = useState('overview');
  const [allPatients, setAllPatients] = useState([]);
  const [selectedUpid, setSelectedUpid] = useState('');
  const [profile, setProfile] = useState(null);
  const [consents, setConsents] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [records, setRecords] = useState([]);
  const [sharingHistory, setSharingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  useEffect(() => {
    loadPatientsList();
    const interval = setInterval(() => {
      if (selectedUpid) {
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
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedUpid]);

  const loadPatientsList = async () => {
    try {
      const pts = await listAllPortalPatients();
      setAllPatients(pts);
      const target = selectedUpid || (pts.length > 0 ? pts[0].universal_patient_id : '');
      if (target) {
        setSelectedUpid(target);
        await loadPortalData(target);
      } else {
        await loadPortalData();
      }
    } catch (e) {
      console.error('Error loading patients list:', e);
      await loadPortalData();
    }
  };

  const loadPortalData = async (targetUpid = selectedUpid) => {
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
      console.error('Error loading patient portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentDecision = async (consentId, decision) => {
    setActionLoading(true);
    try {
      await decidePatientConsent(consentId, decision, `Patient submitted ${decision} decision`, selectedUpid);
      setFeedbackMsg({ type: 'success', text: `Consent ${consentId} successfully marked as ${decision}.` });
      await loadPortalData(selectedUpid);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeConsent = async (consentId) => {
    if (!window.confirm(`Are you sure you want to revoke consent ${consentId}? New releases will be blocked immediately.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await revokePatientConsent(consentId, 'Revoked by patient via Patient Portal', selectedUpid);
      setFeedbackMsg({ type: 'success', text: `Consent ${consentId} revoked successfully. Future access is blocked.` });
      await loadPortalData(selectedUpid);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="page-wrapper patient-portal-wrapper">
      {/* Patient Account Switcher */}
      {allPatients.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          padding: '10px 16px',
          borderRadius: '10px',
          marginBottom: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', fontWeight: 700, fontSize: '13px' }}>
              <User size={16} />
              <span>Select Active Patient Account:</span>
            </div>
            <select
              value={selectedUpid}
              onChange={(e) => {
                const newUpid = e.target.value;
                setSelectedUpid(newUpid);
                loadPortalData(newUpid);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #0284c7',
                fontSize: '13px',
                fontWeight: 700,
                color: '#0284c7',
                background: '#f0f9ff',
                cursor: 'pointer'
              }}
            >
              {allPatients.map(p => (
                <option key={p.universal_patient_id} value={p.universal_patient_id}>
                  {p.full_name} ({p.universal_patient_id}) — {p.connected_hospitals_count} Hospital{p.connected_hospitals_count === 1 ? '' : 's'} Linked
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => loadPatientsList()}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={12} />
            <span>Refresh Patients Directory</span>
          </button>
        </div>
      )}

      {/* Top Patient Identity Banner */}
      <div className="patient-banner-card" style={{
        background: 'linear-gradient(135deg, #075985 0%, #0369a1 100%)',
        color: '#ffffff',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(3, 105, 161, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(255, 255, 255, 0.4)'
            }}>
              <User size={34} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
                  {profile?.full_name || 'Arun Kumar'}
                </h1>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.25)',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  Authenticated Patient
                </span>
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
                Universal ID (UPID): <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{profile?.universal_patient_id || 'UPID-ARUN-001'}</code>
                &nbsp;|&nbsp; ABHA: {profile?.abha_address || 'arun.kumar@abdm'}
                &nbsp;|&nbsp; DOB: {profile?.dob || '1985-05-14'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={loadPortalData}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: feedbackMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: feedbackMsg.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${feedbackMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          fontWeight: 600
        }}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Patient Sub Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '24px',
        gap: '4px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview', label: 'My Overview', icon: Layers },
          { id: 'records', label: 'My Health Records', icon: Activity },
          { id: 'consents', label: `Consent Requests (${consents.filter(c => c.artefact.status === 'REQUESTED').length})`, icon: ShieldCheck },
          { id: 'hospitals', label: 'Connected Hospitals', icon: Building2 },
          { id: 'sharing', label: 'Sharing History', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '3px solid #0284c7' : '3px solid transparent',
                color: isActive ? '#0284c7' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '-2px',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="drawer-kpi-card" style={{ padding: '16px', borderRadius: '10px', background: '#fff', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Connected Hospitals</div>
                  <strong style={{ fontSize: '20px', color: '#0f172a' }}>{hospitals.length || 4}</strong>
                </div>
              </div>
            </div>

            <div className="drawer-kpi-card" style={{ padding: '16px', borderRadius: '10px', background: '#fff', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Pending Consents</div>
                  <strong style={{ fontSize: '20px', color: '#0f172a' }}>
                    {consents.filter(c => c.artefact.status === 'REQUESTED').length}
                  </strong>
                </div>
              </div>
            </div>

            <div className="drawer-kpi-card" style={{ padding: '16px', borderRadius: '10px', background: '#fff', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Active Consents</div>
                  <strong style={{ fontSize: '20px', color: '#0f172a' }}>
                    {consents.filter(c => c.artefact.status === 'GRANTED').length}
                  </strong>
                </div>
              </div>
            </div>

            <div className="drawer-kpi-card" style={{ padding: '16px', borderRadius: '10px', background: '#fff', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Federated Records</div>
                  <strong style={{ fontSize: '20px', color: '#0f172a' }}>{records.length || 3}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Non-Persistence Notice Card */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <Lock size={20} style={{ color: '#0284c7', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>Decentralized Clinical Data Protection</strong>
              <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                TN HealthBridge does not permanently store your clinical charts or laboratory results in a central database. 
                Your diagnostic data resides securely at your authoritative hospitals. When you view records or authorize an exchange, 
                our middleware retrieves the records securely and on-the-fly via verified federated adapters.
              </p>
            </div>
          </div>

          {/* Quick Pending Consents Section */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Pending Consent Authorizations Requiring Your Action
            </h3>
            {consents.filter(c => c.artefact.status === 'REQUESTED').length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                No pending consent requests. All your clinical data transfers are currently up to date.
              </p>
            ) : (
              consents.filter(c => c.artefact.status === 'REQUESTED').map(c => (
                <div key={c.artefact.consent_id} style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #fde68a',
                  background: '#fffbeb',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ flex: '1 1 500px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', background: '#f59e0b', color: '#fff', borderRadius: '4px' }}>
                        ACTION REQUIRED
                      </span>
                      <strong style={{ fontSize: '14.5px', color: '#92400e' }}>
                        {c.artefact.hiu.name || c.artefact.hiu.id} requests records from {c.artefact.hip.name || c.artefact.hip.id}
                      </strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px', fontSize: '12.5px', color: '#78350f', background: 'rgba(254, 243, 199, 0.5)', padding: '8px 12px', borderRadius: '6px' }}>
                      <div><strong>Purpose:</strong> {c.artefact.purpose.text}</div>
                      <div><strong>Requested Categories:</strong> {(c.artefact.hi_types || ['DiagnosticReport', 'Observation']).join(', ')}</div>
                      <div><strong>Date Range:</strong> {c.artefact.permission?.date_range?.from_date?.slice(0, 10) || '2020-01-01'} to {c.artefact.permission?.date_range?.to_date?.slice(0, 10) || 'Present'}</div>
                      <div><strong>Expiry Date:</strong> {c.artefact.consent_expiry?.slice(0, 10)}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#b45309', marginTop: '4px' }}>
                      Consent Ref: <code>{c.artefact.consent_id}</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleConsentDecision(c.artefact.consent_id, 'GRANT')}
                      disabled={actionLoading}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        background: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Check size={15} />
                      <span>Grant Consent</span>
                    </button>
                    <button
                      onClick={() => handleConsentDecision(c.artefact.consent_id, 'DENY')}
                      disabled={actionLoading}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <X size={15} />
                      <span>Deny</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY HEALTH RECORDS */}
      {activeTab === 'records' && (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Federated Health Records & Diagnostic Reports
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                Retrieved on-demand from your authorized healthcare providers.
              </p>
            </div>
            <span style={{ fontSize: '12px', background: '#e0f2fe', color: '#0284c7', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
              Live Federated Adapter View
            </span>
          </div>

          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '10px' }}>Source Hospital</th>
                  <th style={{ padding: '10px' }}>Test / Observation</th>
                  <th style={{ padding: '10px' }}>Result</th>
                  <th style={{ padding: '10px' }}>Interpretation</th>
                  <th style={{ padding: '10px' }}>Date</th>
                  <th style={{ padding: '10px' }}>Attending Practitioner</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                      No clinical records found.
                    </td>
                  </tr>
                ) : (
                  records.map((r, idx) => {
                    const norm = (r.interpretation || '').toLowerCase();
                    let badgeStyle = { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
                    if (norm.includes('normal') || norm.includes('negative') || norm.includes('not detected')) {
                      badgeStyle = { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
                    } else if (norm.includes('positive') || norm.includes('detected') || norm.includes('critical') || norm.includes('hypertension') || norm.includes('low') || norm.includes('elevated')) {
                      badgeStyle = { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
                    } else if (norm.includes('pre-') || norm.includes('warning') || norm.includes('mildly')) {
                      badgeStyle = { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
                    }

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', fontWeight: 600, color: '#0369a1' }}>
                          {r.source_provider_name}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 600 }}>
                          {r.test_name}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <strong>{r.value}</strong> {r.unit}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '3px 9px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: badgeStyle.bg,
                            color: badgeStyle.text,
                            border: `1px solid ${badgeStyle.border}`,
                          }}>
                            {r.interpretation || 'Evaluated'}
                          </span>
                        </td>
                        <td style={{ padding: '10px', fontSize: '12.5px', color: '#64748b' }}>
                          {r.effective_datetime?.slice(0, 10)}
                        </td>
                        <td style={{ padding: '10px', fontSize: '12.5px', color: '#475569' }}>
                          {r.attending_practitioner || 'Provider Staff'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONSENT REQUESTS */}
      {activeTab === 'consents' && (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            ABDM Electronic Consent Lifecycle Management
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {consents.length === 0 ? (
              <p style={{ color: '#64748b' }}>No consent artefacts on record.</p>
            ) : (
              consents.map((c) => {
                const art = c.artefact;
                const isPending = art.status === 'REQUESTED';
                const isGranted = art.status === 'GRANTED';
                const isRevoked = art.status === 'REVOKED';

                return (
                  <div
                    key={art.consent_id}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: isPending ? '#fffbeb' : '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>
                          {art.consent_id}
                        </code>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: isGranted ? '#dcfce7' : isPending ? '#fef3c7' : '#fee2e2',
                          color: isGranted ? '#15803d' : isPending ? '#b45309' : '#b91c1c'
                        }}>
                          {art.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Expiry: {art.consent_expiry?.slice(0, 10)}
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', color: '#334155', marginBottom: '10px' }}>
                      <strong>{art.hiu.name || art.hiu.id}</strong> requests access to records held by{' '}
                      <strong>{art.hip.name || art.hip.id}</strong> for purpose: <em>{art.purpose.text}</em>.
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Data Range: {art.permission?.date_range?.from_date?.slice(0, 10)} to {art.permission?.date_range?.to_date?.slice(0, 10)}
                      </span>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleConsentDecision(art.consent_id, 'GRANT')}
                              disabled={actionLoading}
                              style={{ padding: '5px 12px', borderRadius: '5px', background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                            >
                              Grant Consent
                            </button>
                            <button
                              onClick={() => handleConsentDecision(art.consent_id, 'DENY')}
                              disabled={actionLoading}
                              style={{ padding: '5px 12px', borderRadius: '5px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                            >
                              Deny
                            </button>
                          </>
                        )}
                        {isGranted && (
                          <button
                            onClick={() => handleRevokeConsent(art.consent_id)}
                            disabled={actionLoading}
                            style={{ padding: '5px 12px', borderRadius: '5px', background: '#e11d48', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          >
                            Revoke Consent
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CONNECTED HOSPITALS */}
      {activeTab === 'hospitals' && (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            Connected Healthcare Providers & Verified Identifiers
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {hospitals.map((h) => (
              <div key={h.provider_id} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '15px', color: '#0369a1' }}>{h.provider_name}</strong>
                  <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                    {h.verification_status}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: '6px' }}>
                  Local Patient ID: <code style={{ fontWeight: 700, color: '#0284c7' }}>{h.local_patient_id}</code>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Mapping Method: {h.mapping_method} | Verified: {h.verified_at?.slice(0, 10) || 'Active'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SHARING HISTORY */}
      {activeTab === 'sharing' && (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            Data Access & Interoperability Sharing History
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sharingHistory.map((s) => (
              <div key={s.event_id} style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>{s.source_provider_name} $\rightarrow$ {s.recipient_provider_name}</strong>
                  <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                    {s.status}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#475569' }}>
                  Purpose: <em>{s.purpose}</em> | Data: {s.data_type}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                  {s.timestamp} | {s.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
