import React from 'react';
import {
  User,
  ShieldCheck,
  Building2,
  Lock,
  QrCode,
  Calendar,
  Phone,
  Mail,
  CheckCircle2
} from 'lucide-react';
import { usePatient } from '../../layouts/PatientLayout';

export default function PatientProfileView() {
  const { profile, hospitals } = usePatient();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Profile Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '20px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <User size={32} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                {profile?.full_name || 'Patient'}
              </h2>
              <span style={{
                padding: '3px 9px',
                borderRadius: '12px',
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '11px',
                fontWeight: 700
              }}>
                ACTIVE ABDM IDENTITY
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Tamil Nadu State Health Identity & Electronic Consent Subject
            </div>
          </div>
        </div>

        {/* Identity Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', marginBottom: '4px' }}>
              Universal Patient Identifier (UPID)
            </span>
            <code style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>
              {profile?.universal_patient_id}
            </code>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', marginBottom: '4px' }}>
              Ayushman Bharat Health Account (ABHA Address)
            </span>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>
              {profile?.abha_address || 'Not Linked'}
            </strong>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', marginBottom: '4px' }}>
              Date of Birth & Gender
            </span>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>
              {profile?.dob} &bull; {profile?.gender}
            </strong>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', marginBottom: '4px' }}>
              Registered Phone (Masked)
            </span>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>
              {profile?.phone_masked || '+91 98*** **000'}
            </strong>
          </div>
        </div>
      </div>

      {/* Linked Facilities Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
          Linked Facility Identifiers ({hospitals.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {hospitals.map((h, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 16px',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '13px'
              }}
            >
              <div>
                <strong>{h.provider_name}</strong>
                <span style={{ color: '#64748b', marginLeft: '8px' }}>Local Patient ID: <code>{h.local_patient_id}</code></span>
              </div>
              <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700 }}>
                {h.verification_status || 'VERIFIED'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

