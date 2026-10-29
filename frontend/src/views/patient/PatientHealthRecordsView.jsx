import React, { useState } from 'react';
import {
  Activity,
  Filter,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Info
} from 'lucide-react';
import { usePatient } from '../../layouts/PatientLayout';

export default function PatientHealthRecordsView() {
  const { records, hospitals, loading } = usePatient();
  const [selectedHospital, setSelectedHospital] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredRecords = records.filter((r) => {
    if (selectedHospital !== 'ALL' && r.source_provider_id !== selectedHospital) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTest = (r.test_name || '').toLowerCase().includes(q);
      const matchHosp = (r.source_provider_name || '').toLowerCase().includes(q);
      const matchInterp = (r.interpretation || '').toLowerCase().includes(q);
      if (!matchTest && !matchHosp && !matchInterp) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Info Banner */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Federated Health Records & Diagnostic Reports
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Retrieved on-demand directly from your authorized hospital and laboratory repositories.
            </p>
          </div>
          <span style={{
            fontSize: '11.5px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '12px',
            background: '#e0f2fe',
            color: '#0369a1',
            border: '1px solid #bae6fd'
          }}>
            Live Federated Adapter View
          </span>
        </div>

        <div style={{
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '12px 16px',
          fontSize: '12px',
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          lineHeight: 1.5
        }}>
          <Info size={16} color="#0284c7" style={{ flexShrink: 0 }} />
          <span>
            <strong>Zero Central Persistence Guarantee:</strong> TN HealthBridge does not store your raw medical charts permanently in any central database. Each record is fetched live from the authoritative hospital when you view it or authorize an exchange.
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Filter by Hospital:</span>
          <select
            value={selectedHospital}
            onChange={(e) => setSelectedHospital(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#334155',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Connected Facilities</option>
            {hospitals.map((h) => (
              <option key={h.provider_id} value={h.provider_id}>
                {h.provider_name} ({h.local_patient_id})
              </option>
            ))}
          </select>
        </div>

        <input
          type="text"
          placeholder="Search test, hospital, or interpretation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '12.5px',
            width: '280px',
            outline: 'none'
          }}
        />
      </div>

      {/* Records Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Source Facility</th>
                <th style={{ padding: '12px 16px' }}>Investigation / Test</th>
                <th style={{ padding: '12px 16px' }}>Result Value</th>
                <th style={{ padding: '12px 16px' }}>Clinical Interpretation</th>
                <th style={{ padding: '12px 16px' }}>Date Processed</th>
                <th style={{ padding: '12px 16px' }}>Attending Practitioner</th>
                <th style={{ padding: '12px 16px' }}>Retrieval Security</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    Retrieving health records across connected hospitals...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    {records.length === 0
                      ? 'No clinical records found at your connected facilities.'
                      : 'No records match your selected filter.'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => {
                  const badge = getInterpretationBadge(r.interpretation);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0369a1' }}>
                        {r.source_provider_name}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                        {r.test_name}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <strong>{r.value}</strong> {r.unit}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 9px',
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
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                        {r.effective_datetime?.slice(0, 10)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569', fontSize: '12px' }}>
                        {r.attending_practitioner || 'Attending Physician'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                          Verified &bull; On-Demand
                        </span>
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

