import React from 'react';
import {
  Building2,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Layers,
  Activity,
  Info
} from 'lucide-react';
import { usePatient } from '../../layouts/PatientLayout';

export default function PatientConnectedHospitalsView() {
  const { hospitals, profile, loading } = usePatient();

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
          Connected Healthcare Providers & Patient Identifiers
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
          Authoritative hospitals, diagnostic laboratories, and health centers linked to your Universal Patient Identity (UPID: <code>{profile?.universal_patient_id}</code>).
        </p>

        <div style={{
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '12px 16px',
          fontSize: '12px',
          color: '#475569',
          marginTop: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Info size={16} color="#0284c7" style={{ flexShrink: 0 }} />
          <span>
            Each hospital maintains an isolated, authoritative clinical record for you under its local hospital patient ID. TN HealthBridge does not replicate or combine records into a central database.
          </span>
        </div>
      </div>

      {/* Hospitals Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {hospitals.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', background: '#ffffff', padding: '40px', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
            No hospitals currently linked to this universal identity.
          </div>
        ) : (
          hospitals.map((h, idx) => (
            <div
              key={idx}
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                        {h.provider_name}
                      </h4>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Provider Code: {h.provider_id}</span>
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {h.verification_status || 'VERIFIED'}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '12.5px', marginBottom: '14px' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ color: '#64748b' }}>Local Patient ID:</span>{' '}
                    <strong style={{ color: '#0284c7' }}>{h.local_patient_id}</strong>
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ color: '#64748b' }}>Mapping Method:</span>{' '}
                    <strong>{h.mapping_method}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Verified On:</span>{' '}
                    <span>{h.verified_at?.slice(0, 10) || 'Active Registry'}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '12px' }}>
                <span style={{ color: '#64748b' }}>Available Records:</span>
                <strong style={{ color: '#0f172a' }}>{h.records_count} clinical observations</strong>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

