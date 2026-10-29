import React from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Building2,
  Activity,
  ArrowRight,
  Clock,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';
import { usePatient } from '../../layouts/PatientLayout';

export default function PatientOverviewView() {
  const {
    profile,
    consents,
    hospitals,
    records,
    handleConsentDecision,
    actionLoading
  } = usePatient();

  const pendingConsents = consents.filter((c) => c.artefact.status === 'REQUESTED');
  const activeConsents = consents.filter((c) => c.artefact.status === 'GRANTED');

  const getInterpretationBadge = (interp) => {
    const norm = (interp || '').toLowerCase();
    if (norm.includes('normal') || norm.includes('negative') || norm.includes('not detected')) {
      return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
    }
    if (norm.includes('positive') || norm.includes('detected') || norm.includes('critical') || norm.includes('hypertension') || norm.includes('low') || norm.includes('elevated')) {
      return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
    }
    if (norm.includes('pre-') || norm.includes('warning') || norm.includes('mildly')) {
      return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
    }
    return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {(!profile || !profile.universal_patient_id) && (
        <div style={{
          background: '#eff6ff',
          borderRadius: '12px',
          border: '1px solid #bfdbfe',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e40af' }}>
              Clean Zero-Data Mode (Awaiting Patient Registration)
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#3b82f6' }}>
              No patient is currently active. Register a patient in any connected hospital (e.g., City Hospital 1) to automatically create their federated identity profile, or select a registered patient from the header dropdown.
            </p>
          </div>
          <Link
            to="/hospital/city-hospital-1/patients"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#0284c7',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            Register Patient &rarr;
          </Link>
        </div>
      )}

      {/* Patient Profile Header Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <User size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                {profile?.full_name || 'Patient'}
              </h2>
              <span style={{
                padding: '2px 8px',
                borderRadius: '12px',
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '11px',
                fontWeight: 700
              }}>
                VERIFIED IDENTITY
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              UPID: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, color: '#0369a1' }}>{profile?.universal_patient_id}</code>
              &nbsp;&bull;&nbsp; ABHA: <strong>{profile?.abha_address || 'Not registered'}</strong>
              &nbsp;&bull;&nbsp; DOB: {profile?.dob} &bull; Gender: {profile?.gender}
            </div>
          </div>
        </div>

        <Link
          to="/patient/profile"
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#334155',
            fontSize: '12.5px',
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          View Profile Details
        </Link>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Connected Hospitals</span>
            <Building2 size={18} color="#0284c7" />
          </div>
          <strong style={{ fontSize: '24px', color: '#0f172a' }}>{hospitals.length}</strong>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Authoritative provider stores</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', color: '#b45309', fontWeight: 600 }}>Pending Consent Requests</span>
            <ShieldCheck size={18} color="#f59e0b" />
          </div>
          <strong style={{ fontSize: '24px', color: pendingConsents.length > 0 ? '#b45309' : '#0f172a' }}>
            {pendingConsents.length}
          </strong>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            {pendingConsents.length > 0 ? 'Requires your decision' : 'All requests up to date'}
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 600 }}>Active Authorizations</span>
            <Check size={18} color="#16a34a" />
          </div>
          <strong style={{ fontSize: '24px', color: '#15803d' }}>{activeConsents.length}</strong>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Granted data transfers</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Available Health Records</span>
            <Activity size={18} color="#0284c7" />
          </div>
          <strong style={{ fontSize: '24px', color: '#0f172a' }}>{records.length}</strong>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Retrieved on-demand via adapter</div>
        </div>
      </div>

      {/* Pending Consent Action Section */}
      {pendingConsents.length > 0 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #fde68a',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '3px 8px',
                borderRadius: '4px',
                background: '#f59e0b',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700
              }}>
                ACTION REQUIRED
              </span>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#92400e' }}>
                Pending Cross-Hospital Consent Requests
              </h3>
            </div>
            <Link to="/patient/consent-requests" style={{ fontSize: '12.5px', color: '#b45309', fontWeight: 600, textDecoration: 'none' }}>
              View All ({pendingConsents.length}) &rarr;
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingConsents.map((c) => {
              const art = c.artefact;
              return (
                <div
                  key={art.consent_id}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #fef3c7',
                    background: '#fffbeb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: '1 1 450px' }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
                      {art.hiu.name || art.hiu.id} requests records from {art.hip.name || art.hip.id}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#78350f', lineHeight: 1.5 }}>
                      Purpose: <strong>{art.purpose.text}</strong> &bull; Categories: {(art.hi_types || ['DiagnosticReport', 'Observation']).join(', ')} &bull; Valid until: {art.consent_expiry?.slice(0, 10)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#b45309', marginTop: '4px' }}>
                      Consent ID: <code>{art.consent_id}</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleConsentDecision(art.consent_id, 'GRANT')}
                      disabled={actionLoading}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '6px',
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Check size={14} />
                      <span>Grant Consent</span>
                    </button>
                    <button
                      onClick={() => handleConsentDecision(art.consent_id, 'DENY')}
                      disabled={actionLoading}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '6px',
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <X size={14} />
                      <span>Deny</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Health Records Preview */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Recent Diagnostic Observations & Lab Reports
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Federated records retrieved live from your connected hospital repositories.
            </p>
          </div>
          <Link
            to="/patient/health-records"
            style={{
              fontSize: '12.5px',
              color: '#0284c7',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>View All ({records.length})</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {records.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            No clinical records found. Once your connected hospitals record observations, they will appear here.
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>Hospital</th>
                  <th style={{ padding: '10px 14px' }}>Investigation</th>
                  <th style={{ padding: '10px 14px' }}>Result</th>
                  <th style={{ padding: '10px 14px' }}>Interpretation</th>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Practitioner</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 5).map((r, idx) => {
                  const badge = getInterpretationBadge(r.interpretation);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0369a1' }}>
                        {r.source_provider_name}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.test_name}</td>
                      <td style={{ padding: '10px 14px' }}><strong>{r.value}</strong> {r.unit}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`
                        }}>
                          {r.interpretation || 'Normal'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12px' }}>
                        {r.effective_datetime?.slice(0, 10)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569', fontSize: '12px' }}>
                        {r.attending_practitioner || 'Attending Staff'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

