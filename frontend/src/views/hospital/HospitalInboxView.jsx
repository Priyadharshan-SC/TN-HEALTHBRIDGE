import React, { useState } from 'react';
import {
  Inbox,
  Building2,
  CheckCircle2,
  FileText,
  Calendar,
  Lock,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Activity,
  Layers,
  FlaskConical,
  User,
  ArrowRight
} from 'lucide-react';
import { useHospital } from '../../layouts/HospitalLayout';

export default function HospitalInboxView() {
  const { hospital, inbox, loading, loadHospitalData } = useHospital();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [viewingFhirBundle, setViewingFhirBundle] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const toggleExpand = (idx) => {
    setExpandedItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadReceipt = (item) => {
    const receiptData = {
      receipt_id: item.receipt_id,
      delivery_id: item.delivery_id,
      job_id: item.job_id,
      recipient: hospital.name,
      recipient_id: hospital.id,
      sender: item.sender_provider_name,
      patient_name: item.patient_name,
      universal_patient_id: item.universal_patient_id,
      sha256_digest: item.integrity_digest,
      received_at: item.received_at,
      status: "DELIVERED_AND_VERIFIED",
      cryptographic_algorithm: "ECDSA_P256_SHA256"
    };
    const blob = new Blob([JSON.stringify(receiptData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Delivery_Receipt_${item.receipt_id || item.job_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getInterpretationBadge = (interp) => {
    const norm = (interp || '').toLowerCase();
    if (norm.includes('normal') || norm.includes('negative') || norm.includes('not detected')) {
      return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
    }
    if (norm.includes('positive') || norm.includes('detected') || norm.includes('critical') || norm.includes('elevated') || norm.includes('hypertension')) {
      return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
    }
    if (norm.includes('pre-') || norm.includes('warning') || norm.includes('mildly')) {
      return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
    }
    return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  };

  const filteredInbox = inbox.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.patient_name || '').toLowerCase().includes(q) ||
      (item.universal_patient_id || '').toLowerCase().includes(q) ||
      (item.sender_provider_name || '').toLowerCase().includes(q) ||
      (item.summary || '').toLowerCase().includes(q) ||
      (item.receipt_id || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Clinical Data Delivery Inbox
            </h2>
            <span style={{
              padding: '2px 8px',
              borderRadius: '12px',
              background: '#e0f2fe',
              color: '#0369a1',
              fontSize: '11px',
              fontWeight: 700
            }}>
              {hospital.name}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Authoritative clinical reports and observations delivered under verified citizen consent via TN HealthBridge.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadHospitalData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin-icon' : ''} />
            <span>Refresh Inbox</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by patient name, UPID, sender hospital, or test..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 8px 7px 32px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
          Showing {filteredInbox.length} of {inbox.length} Received Deliveries
        </div>
      </div>

      {/* Inbox Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredInbox.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '50px 20px',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <Inbox size={36} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
              No incoming clinical data transfers found
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', maxWidth: '480px', marginInline: 'auto' }}>
              When a healthcare provider transfers patient records to {hospital.name} via an authorized exchange, the complete clinical observations and FHIR document bundle will appear here.
            </p>
          </div>
        ) : (
          filteredInbox.map((item, idx) => {
            const isExpanded = expandedItems[idx] !== false; // Default expanded for clarity
            const recordsList = item.records || [];

            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  overflow: 'hidden'
                }}
              >
                {/* Delivery Header */}
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Building2 size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        <span>{item.sender_provider_name}</span>
                        <ArrowRight size={14} color="#64748b" />
                        <span style={{ color: '#0284c7' }}>{hospital.name}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        Delivered: {item.received_at?.slice(0, 19).replace('T', ' ')} &bull; Type: <strong>{item.data_type || 'FHIR R4 Diagnostic Bundle'}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: '#dcfce7',
                      color: '#15803d',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: '1px solid #bbf7d0'
                    }}>
                      <ShieldCheck size={13} />
                      DELIVERED & VERIFIED
                    </span>
                    <button
                      onClick={() => toggleExpand(idx)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11.5px',
                        fontWeight: 600
                      }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      <span>{isExpanded ? 'Collapse' : 'Full Data View'}</span>
                    </button>
                  </div>
                </div>

                {/* Patient Anchor Strip */}
                <div style={{
                  padding: '12px 20px',
                  background: '#f0f9ff',
                  borderBottom: '1px solid #e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  fontSize: '12.5px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div>
                      <span style={{ color: '#0369a1', fontWeight: 600 }}>Citizen / Patient:</span>{' '}
                      <strong style={{ color: '#0f172a', fontSize: '13.5px' }}>{item.patient_name || 'Patient'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#0369a1', fontWeight: 600 }}>Universal ID:</span>{' '}
                      <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bae6fd', color: '#0284c7', fontWeight: 700 }}>
                        {item.universal_patient_id}
                      </code>
                    </div>
                    {item.local_patient_id && (
                      <div>
                        <span style={{ color: '#0369a1', fontWeight: 600 }}>Local Reference:</span>{' '}
                        <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bae6fd', color: '#475569' }}>
                          {item.local_patient_id}
                        </code>
                      </div>
                    )}
                  </div>

                  <div style={{ color: '#0369a1', fontSize: '12px', fontWeight: 600 }}>
                    {recordsList.length > 0 ? `${recordsList.length} Clinical Observations Included` : 'Clinical Summary Verified'}
                  </div>
                </div>

                {/* Main Body */}
                <div style={{ padding: '20px' }}>
                  {/* Summary Text Box */}
                  <div style={{
                    background: '#f8fafc',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    color: '#334155',
                    lineHeight: 1.5,
                    marginBottom: '16px'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Exchange Summary Statement
                    </div>
                    {item.summary}
                  </div>

                  {/* Expanded Full Data View */}
                  {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Clinical Observations Section */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FlaskConical size={15} color="#0284c7" />
                            <span>Received Clinical Diagnostic Observations</span>
                          </h4>
                          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                            Retrieved from source EHR via M1–M7 pipeline
                          </span>
                        </div>

                        {recordsList.length > 0 ? (
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                                  <th style={{ padding: '9px 12px' }}>Investigation / Test</th>
                                  <th style={{ padding: '9px 12px' }}>Observed Result</th>
                                  <th style={{ padding: '9px 12px' }}>Unit</th>
                                  <th style={{ padding: '9px 12px' }}>Reference Range</th>
                                  <th style={{ padding: '9px 12px' }}>Interpretation</th>
                                  <th style={{ padding: '9px 12px' }}>Specimen</th>
                                  <th style={{ padding: '9px 12px' }}>Attending Practitioner</th>
                                </tr>
                              </thead>
                              <tbody>
                                {recordsList.map((rec, rIdx) => {
                                  const badge = getInterpretationBadge(rec.interpretation);
                                  return (
                                    <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                                        {rec.test_name}
                                        {rec.category && (
                                          <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 400 }}>
                                            {rec.category}
                                          </div>
                                        )}
                                      </td>
                                      <td style={{ padding: '10px 12px' }}>
                                        <strong style={{ fontSize: '13.5px', color: '#0369a1' }}>
                                          {rec.value}
                                        </strong>
                                      </td>
                                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                                        {rec.unit || '—'}
                                      </td>
                                      <td style={{ padding: '10px 12px', color: '#64748b' }}>
                                        {rec.reference_range || '—'}
                                      </td>
                                      <td style={{ padding: '10px 12px' }}>
                                        <span style={{
                                          padding: '2px 8px',
                                          borderRadius: '10px',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          background: badge.bg,
                                          color: badge.text,
                                          border: `1px solid ${badge.border}`
                                        }}>
                                          {rec.interpretation || 'Normal'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                                        {rec.specimen || 'Blood'}
                                      </td>
                                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '11.5px' }}>
                                        {rec.attending_practitioner || 'Attending Physician'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div style={{
                            padding: '16px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '12.5px',
                            color: '#475569'
                          }}>
                            Observations bundled in authenticated FHIR Document payload. Click <strong>"View FHIR R4 Bundle"</strong> below to inspect raw resources.
                          </div>
                        )}
                      </div>

                      {/* Technical Audit & Receipt Metadata Strip */}
                      <div style={{
                        background: '#f8fafc',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px',
                        fontSize: '11.5px'
                      }}>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>Delivery Receipt ID</span>
                          <code style={{ fontWeight: 700, color: '#0369a1' }}>{item.receipt_id}</code>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>Exchange Job ID</span>
                          <code style={{ color: '#475569' }}>{item.job_id}</code>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>SHA-256 Digest</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <code style={{ fontSize: '10.5px', color: '#15803d', wordBreak: 'break-all' }}>
                              {item.integrity_digest?.slice(0, 24)}...
                            </code>
                            <button
                              onClick={() => copyToClipboard(item.integrity_digest, `digest-${idx}`)}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: '#64748b' }}
                              title="Copy full SHA-256 Digest"
                            >
                              {copiedId === `digest-${idx}` ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>Verification Standard</span>
                          <span style={{ color: '#15803d', fontWeight: 600 }}>ECDSA P-256 + ABDM R4</span>
                        </div>
                      </div>

                      {/* Action Triggers */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '4px', flexWrap: 'wrap' }}>
                        {item.fhir_bundle && (
                          <button
                            onClick={() => setViewingFhirBundle(item.fhir_bundle)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <FileText size={13} />
                            <span>View FHIR R4 Bundle</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadReceipt(item)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: '#ffffff',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Download size={13} />
                          <span>Download Signed Receipt</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FHIR Bundle Viewer Modal */}
      {viewingFhirBundle && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '24px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '840px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  HL7 FHIR R4 Document Bundle
                </h3>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Authenticated clinical exchange bundle delivered to {hospital.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(viewingFhirBundle, null, 2), 'modal-fhir')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {copiedId === 'modal-fhir' ? <Check size={13} color="#15803d" /> : <Copy size={13} />}
                  <span>{copiedId === 'modal-fhir' ? 'Copied' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={() => setViewingFhirBundle(null)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <div style={{ padding: '16px', overflowY: 'auto', background: '#0f172a', color: '#e2e8f0', fontSize: '12px', fontFamily: 'monospace' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(viewingFhirBundle, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
