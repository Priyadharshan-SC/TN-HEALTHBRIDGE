import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  User,
  Eye,
  X
} from 'lucide-react';
import { listAllConsents } from '../../services/apiClient';

export default function AdminConsentsView() {
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConsent, setSelectedConsent] = useState(null);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAllConsents();
      setConsents(data);
    } catch (err) {
      console.error('Failed to load consents:', err);
      setError(err.message || 'Failed to retrieve consents');
    } finally {
      setLoading(false);
    }
  };

  const filteredConsents = consents.filter((c) => {
    const art = c.artefact;
    if (statusFilter !== 'ALL' && art.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = art.consent_id?.toLowerCase().includes(q);
      const matchPt = (art.patient?.id || '').toLowerCase().includes(q);
      const matchHip = (art.hip?.name || art.hip?.id || '').toLowerCase().includes(q);
      const matchHiu = (art.hiu?.name || art.hiu?.id || '').toLowerCase().includes(q);
      const matchPurpose = (art.purpose?.text || '').toLowerCase().includes(q);
      if (!matchId && !matchPt && !matchHip && !matchHiu && !matchPurpose) return false;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'GRANTED':
        return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', icon: CheckCircle2 };
      case 'REQUESTED':
        return { bg: '#fef3c7', text: '#b45309', border: '#fde68a', icon: Clock };
      case 'REVOKED':
        return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca', icon: AlertTriangle };
      case 'DENIED':
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', icon: XCircle };
      default:
        return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0', icon: Clock };
    }
  };

  const totalCount = consents.length;
  const grantedCount = consents.filter((c) => c.artefact.status === 'GRANTED').length;
  const requestedCount = consents.filter((c) => c.artefact.status === 'REQUESTED').length;
  const revokedCount = consents.filter((c) => c.artefact.status === 'REVOKED').length;
  const deniedCount = consents.filter((c) => c.artefact.status === 'DENIED').length;

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
            ABDM Consent Governance & Registry
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Authoritative registry of patient-controlled data release authorizations under ABDM electronic consent gates.
          </p>
        </div>
        <button
          onClick={loadConsents}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '6px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Registered Consents</div>
          <strong style={{ fontSize: '22px', color: '#0f172a', display: 'block', marginTop: '4px' }}>{totalCount}</strong>
        </div>
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>Active Granted Consents</div>
          <strong style={{ fontSize: '22px', color: '#15803d', display: 'block', marginTop: '4px' }}>{grantedCount}</strong>
        </div>
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 600 }}>Pending Action (Requested)</div>
          <strong style={{ fontSize: '22px', color: '#b45309', display: 'block', marginTop: '4px' }}>{requestedCount}</strong>
        </div>
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>Revoked by Patient</div>
          <strong style={{ fontSize: '22px', color: '#b91c1c', display: 'block', marginTop: '4px' }}>{revokedCount}</strong>
        </div>
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Denied Consents</div>
          <strong style={{ fontSize: '22px', color: '#475569', display: 'block', marginTop: '4px' }}>{deniedCount}</strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '14px 18px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'GRANTED', 'REQUESTED', 'REVOKED', 'DENIED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid',
                borderColor: statusFilter === st ? '#0284c7' : '#e2e8f0',
                background: statusFilter === st ? '#f0f9ff' : '#ffffff',
                color: statusFilter === st ? '#0284c7' : '#64748b',
                cursor: 'pointer'
              }}
            >
              {st === 'ALL' ? 'All Consents' : st}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '300px' }}>
          <input
            type="text"
            placeholder="Search consent ID, patient, hospital..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Consents Table */}
      <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Consent Reference</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Patient Subject</th>
                <th style={{ padding: '12px 16px' }}>Source Hospital (HIP)</th>
                <th style={{ padding: '12px 16px' }}>Requesting HIU</th>
                <th style={{ padding: '12px 16px' }}>Purpose</th>
                <th style={{ padding: '12px 16px' }}>Expiry Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    Loading authoritative consent registry...
                  </td>
                </tr>
              ) : filteredConsents.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    No consent artefacts found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredConsents.map((c) => {
                  const art = c.artefact;
                  const badge = getStatusBadge(art.status);
                  const Icon = badge.icon;

                  return (
                    <tr key={art.consent_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <code style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', background: '#f0f9ff', padding: '2px 6px', borderRadius: '4px' }}>
                          {art.consent_id}
                        </code>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`
                        }}>
                          <Icon size={12} />
                          {art.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                        {art.patient?.id || 'UPID-GLOBAL'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        <strong>{art.hip?.name || art.hip?.id}</strong>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#0369a1', fontWeight: 600 }}>
                        {art.hiu?.name || art.hiu?.id}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569', fontSize: '12px' }}>
                        {art.purpose?.text || 'Care Consultation'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                        {art.consent_expiry?.slice(0, 10)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedConsent(c)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '5px',
                            background: '#f1f5f9',
                            color: '#334155',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Drawer for Consent Artefact Details */}
      {selectedConsent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  ABDM Consent Artefact: {selectedConsent.artefact.consent_id}
                </h3>
              </div>
              <button onClick={() => setSelectedConsent(null)} style={{ cursor: 'pointer', background: 'none', border: 'none' }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px', marginBottom: '16px' }}>
              <div><span style={{ color: '#64748b' }}>Current Status:</span> <strong>{selectedConsent.artefact.status}</strong></div>
              <div><span style={{ color: '#64748b' }}>Patient Reference:</span> <strong>{selectedConsent.artefact.patient?.id}</strong></div>
              <div><span style={{ color: '#64748b' }}>Source HIP:</span> <strong>{selectedConsent.artefact.hip?.name || selectedConsent.artefact.hip?.id}</strong></div>
              <div><span style={{ color: '#64748b' }}>Recipient HIU:</span> <strong>{selectedConsent.artefact.hiu?.name || selectedConsent.artefact.hiu?.id}</strong></div>
              <div><span style={{ color: '#64748b' }}>Purpose:</span> <strong>{selectedConsent.artefact.purpose?.text}</strong></div>
              <div><span style={{ color: '#64748b' }}>Valid Expiry:</span> <strong>{selectedConsent.artefact.consent_expiry}</strong></div>
            </div>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              Lifecycle Transition Audit History
            </h4>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', marginBottom: '16px' }}>
              {selectedConsent.lifecycle_history?.map((evt, idx) => (
                <div key={idx} style={{ padding: '6px 0', borderBottom: idx < selectedConsent.lifecycle_history.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                  <strong>{evt.from_status || 'INIT'} &rarr; {evt.to_status}</strong> &bull; Actor: {evt.actor} &bull; Time: {evt.timestamp?.slice(0, 19).replace('T', ' ')}
                  {evt.reason && <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>Note: {evt.reason}</div>}
                </div>
              ))}
            </div>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              Cryptographic Signature & Metadata
            </h4>
            <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '12px', borderRadius: '6px', fontSize: '11px', overflowX: 'auto' }}>
              {JSON.stringify(selectedConsent.artefact, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

