import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useHospital } from '../../layouts/HospitalLayout';
import { listTransfers, downloadReceipt } from '../../services/apiClient';

export default function HospitalTransfersView() {
  const { hospital } = useHospital();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFacilityTransfers();
  }, [hospital.id]);

  const loadFacilityTransfers = async () => {
    setLoading(true);
    try {
      const res = await listTransfers({ pageSize: 50 });
      const facTransfers = (res.jobs || []).filter(
        (t) => t.source_provider_id === hospital.id || t.recipient_hiu_id === hospital.id
      );
      setTransfers(facTransfers);
    } catch (err) {
      console.error('Failed to load facility transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (jobId) => {
    try {
      const blob = await downloadReceipt(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${jobId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Could not download receipt: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
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
            Facility Transfer Logs ({hospital.name})
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Audited history of incoming and outgoing clinical data transfers concerning {hospital.name}.
          </p>
        </div>
        <button
          onClick={loadFacilityTransfers}
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
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={13} className={loading ? 'spin-icon' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Job ID</th>
                <th style={{ padding: '12px 16px' }}>Direction</th>
                <th style={{ padding: '12px 16px' }}>Counterparty</th>
                <th style={{ padding: '12px 16px' }}>Patient</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    Loading transfer history...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    No transfer transactions recorded yet for this facility.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => {
                  const isOutbound = t.source_provider_id === hospital.id;
                  const counterparty = isOutbound ? t.recipient_hiu_id : t.source_provider_id;

                  return (
                    <tr key={t.job_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <code style={{ fontSize: '11.5px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {t.job_id}
                        </code>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: isOutbound ? '#fee2e2' : '#dcfce7',
                          color: isOutbound ? '#b91c1c' : '#15803d'
                        }}>
                          {isOutbound ? 'OUTBOUND (Source)' : 'INBOUND (Recipient)'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#334155' }}>
                        {counterparty}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {t.patient_reference}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: t.status === 'DELIVERED' ? '#dcfce7' : '#fee2e2',
                          color: t.status === 'DELIVERED' ? '#15803d' : '#b91c1c'
                        }}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                        {t.created_at?.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDownload(t.job_id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '5px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Download size={11} /> Receipt
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
    </div>
  );
}

