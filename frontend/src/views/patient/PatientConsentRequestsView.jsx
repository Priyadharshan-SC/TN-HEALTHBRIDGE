import React, { useState } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  Clock,
  Building2,
  Calendar,
  Lock,
  RefreshCw
} from 'lucide-react';
import { usePatient } from '../../layouts/PatientLayout';

export default function PatientConsentRequestsView() {
  const {
    consents,
    handleConsentDecision,
    handleRevokeConsent,
    actionLoading,
    loadPatientData,
    selectedUpid
  } = usePatient();

  const [revokeConfirmId, setRevokeConfirmId] = useState(null);

  const pendingConsents = consents.filter((c) => c.artefact.status === 'REQUESTED');
  const activeConsents = consents.filter((c) => c.artefact.status === 'GRANTED');
  const pastConsents = consents.filter((c) => c.artefact.status === 'REVOKED' || c.artefact.status === 'DENIED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
            ABDM Electronic Consent Authorization & Lifecycle
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            You hold exclusive control over which healthcare providers can access your medical records. No data can be transferred without your verified electronic consent.
          </p>
        </div>
        <button
          onClick={() => loadPatientData(selectedUpid)}
          disabled={actionLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: '6px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#475569',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={13} className={actionLoading ? 'spin-icon' : ''} />
          <span>Refresh Consents</span>
        </button>
      </div>

      {/* SECTION 1: PENDING CONSENT REQUESTS */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Pending Authorization Requests ({pendingConsents.length})
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Hospitals or clinics requesting access to your diagnostic and lab records.
              </p>
            </div>
          </div>
        </div>

        {pendingConsents.length === 0 ? (
          <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            No pending consent requests at this time. All cross-hospital transfers are up to date.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {pendingConsents.map((c) => {
              const art = c.artefact;
              return (
                <div
                  key={art.consent_id}
                  style={{
                    padding: '18px 20px',
                    borderRadius: '10px',
                    border: '1px solid #fde68a',
                    background: '#fffbeb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  <div style={{ flex: '1 1 500px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', background: '#f59e0b', color: '#fff', borderRadius: '4px' }}>
                        DECISION REQUIRED
                      </span>
                      <strong style={{ fontSize: '15px', color: '#92400e' }}>
                        {art.hiu.name || art.hiu.id} requests access from {art.hip.name || art.hip.id}
                      </strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px', fontSize: '12.5px', color: '#78350f', background: 'rgba(254, 243, 199, 0.6)', padding: '10px 14px', borderRadius: '6px', margin: '8px 0' }}>
                      <div><strong>Purpose of Access:</strong> {art.purpose?.text}</div>
                      <div><strong>Requested Records:</strong> {(art.hi_types || ['DiagnosticReport', 'Observation']).join(', ')}</div>
                      <div><strong>Date Range:</strong> {art.permission?.date_range?.from_date?.slice(0, 10) || 'All'} to {art.permission?.date_range?.to_date?.slice(0, 10) || 'Present'}</div>
                      <div><strong>Consent Expiry:</strong> {art.consent_expiry?.slice(0, 10)}</div>
                    </div>

                    <div style={{ fontSize: '11px', color: '#b45309' }}>
                      ABDM Consent Reference: <code>{art.consent_id}</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleConsentDecision(art.consent_id, 'GRANT')}
                      disabled={actionLoading}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '6px',
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Check size={16} />
                      <span>Grant Consent</span>
                    </button>
                    <button
                      onClick={() => handleConsentDecision(art.consent_id, 'DENY')}
                      disabled={actionLoading}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '6px',
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <X size={16} />
                      <span>Deny</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: ACTIVE GRANTED CONSENTS */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Active Authorized Consents ({activeConsents.length})
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Active data sharing permissions. You can revoke authorization at any time to immediately block future transfers.
            </p>
          </div>
        </div>

        {activeConsents.length === 0 ? (
          <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            No active granted consents found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeConsents.map((c) => {
              const art = c.artefact;
              const isConfirmingRevoke = revokeConfirmId === art.consent_id;

              return (
                <div
                  key={art.consent_id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <code style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>{art.consent_id}</code>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700 }}>
                        ACTIVE &bull; GRANTED
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#334155' }}>
                      <strong>{art.hiu.name || art.hiu.id}</strong> can access records from <strong>{art.hip.name || art.hip.id}</strong> for <em>{art.purpose?.text}</em>.
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                      Valid until: {art.consent_expiry?.slice(0, 10)} &bull; Permitted Range: {art.permission?.date_range?.from_date?.slice(0, 10)} to {art.permission?.date_range?.to_date?.slice(0, 10)}
                    </div>
                  </div>

                  <div>
                    {isConfirmingRevoke ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>Confirm Revocation?</span>
                        <button
                          onClick={() => {
                            handleRevokeConsent(art.consent_id);
                            setRevokeConfirmId(null);
                          }}
                          disabled={actionLoading}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '5px',
                            background: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Yes, Revoke Now
                        </button>
                        <button
                          onClick={() => setRevokeConfirmId(null)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '5px',
                            background: '#f1f5f9',
                            color: '#475569',
                            border: 'none',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRevokeConfirmId(art.consent_id)}
                        disabled={actionLoading}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          background: '#fff',
                          border: '1px solid #fca5a5',
                          color: '#dc2626',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <AlertTriangle size={13} />
                        <span>Revoke Consent</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: PAST CONSENT HISTORY */}
      {pastConsents.length > 0 && (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: '#64748b' }}>
            Historical Consents (Revoked / Denied)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pastConsents.map((c) => {
              const art = c.artefact;
              const isRevoked = art.status === 'REVOKED';

              return (
                <div
                  key={art.consent_id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12.5px'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: '#475569', marginRight: '8px' }}>{art.consent_id}</span>
                    <span>{art.hiu.name || art.hiu.id} &rarr; {art.hip.name || art.hip.id} ({art.purpose?.text})</span>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: isRevoked ? '#fee2e2' : '#f1f5f9',
                    color: isRevoked ? '#b91c1c' : '#475569',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {art.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

