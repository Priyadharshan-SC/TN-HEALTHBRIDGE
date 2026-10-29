import React from 'react';
import {
  Building2,
  ShieldCheck,
  Server,
  Lock,
  Activity,
  CheckCircle2,
  Key
} from 'lucide-react';
import { useHospital } from '../../layouts/HospitalLayout';

export default function HospitalSettingsView() {
  const { hospital } = useHospital();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '850px' }}>
      {/* Title */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
          Facility Adapter Configuration ({hospital.name})
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
          Connection boundaries, cryptographic identity, and ABDM interoperability parameters for this node.
        </p>
      </div>

      {/* Node Profile */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
          Facility Registration Metadata
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', marginBottom: '2px' }}>Facility ID</span>
            <strong>{hospital.id}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', marginBottom: '2px' }}>Short Code</span>
            <code>{hospital.code}</code>
          </div>
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', marginBottom: '2px' }}>Facility Type</span>
            <strong>{hospital.typeLabel}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', marginBottom: '2px' }}>Jurisdiction District</span>
            <strong>{hospital.district}, Tamil Nadu</strong>
          </div>
        </div>
      </div>

      {/* Adapter Interface Specification */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
          Secure Provider Adapter Endpoints
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#64748b' }}>
          Endpoint invoked by the TN HealthBridge gateway on-the-fly when authorized by verified patient consent.
        </p>

        <div style={{ background: '#0f172a', color: '#e2e8f0', padding: '16px', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace', lineHeight: 1.6 }}>
          <div><span style={{ color: '#38bdf8' }}>GET</span> /api/v1/providers/{hospital.id}/adapter/records/{`{local_patient_id}`}?consent_id={'{consent_id}'}</div>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '6px' }}>&bull; Requires valid ABDM consent in GRANTED state</div>
          <div style={{ color: '#94a3b8', fontSize: '11px' }}>&bull; Returns raw clinical payload in-memory (zero central persistence)</div>
        </div>
      </div>
    </div>
  );
}

