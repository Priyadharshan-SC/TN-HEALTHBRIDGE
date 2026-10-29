import React from 'react';
import {
  Clock,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Calendar,
  Lock,
  FileText
} from 'lucide-react';
import { usePatient } from '../../layouts/PatientLayout';

export default function PatientSharingHistoryView() {
  const { sharingHistory, loading } = usePatient();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
          Data Sharing & Transfer Audit History
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
          Immutable log of all clinical data exchanges executed across healthcare facilities for your identity.
        </p>
      </div>

      {/* History Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Event ID</th>
                <th style={{ padding: '12px 16px' }}>Date & Time</th>
                <th style={{ padding: '12px 16px' }}>Source Provider</th>
                <th style={{ padding: '12px 16px' }}>Recipient Provider</th>
                <th style={{ padding: '12px 16px' }}>Clinical Purpose</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sharingHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    No data sharing events recorded yet. When a hospital exchanges data with your consent, it will be logged here.
                  </td>
                </tr>
              ) : (
                sharingHistory.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <code style={{ fontSize: '11.5px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                        {item.event_id || item.transfer_id || `TXN-${idx + 1}`}
                      </code>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {item.timestamp?.slice(0, 19).replace('T', ' ') || '2026-10-28 10:00:00'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#334155' }}>
                      {item.source_provider_name || item.source_provider_id}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0369a1' }}>
                      {item.recipient_provider_name || item.recipient_provider_id}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {item.purpose || 'Care Management'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: '#dcfce7',
                        color: '#15803d',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        {item.status || 'COMPLETED'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

