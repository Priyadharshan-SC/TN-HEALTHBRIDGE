import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Building2,
  FlaskConical,
  Send,
  ArrowLeft,
  Activity,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { useHospital } from '../../layouts/HospitalLayout';

export default function HospitalPatientDetailView() {
  const { providerSlug, patientId } = useParams();
  const { hospital, patients, records, allPatients } = useHospital();
  const navigate = useNavigate();

  const patient = patients.find((p) => p.local_patient_id === patientId);

  // Find universal mapping info
  let upid = null;
  let abha = null;
  let allMappings = [];

  for (const u of allPatients) {
    const m = (u.mappings || []).find(
      (map) => map.provider_id === hospital.id && map.local_patient_id === patientId
    );
    if (m) {
      upid = u.universal_patient_id;
      abha = u.abha_address;
      allMappings = u.mappings || [];
      break;
    }
  }

  if (!upid && patient) {
    const matchDemo = allPatients.find(
      (u) => u.full_name?.toLowerCase() === patient.full_name?.toLowerCase() && u.dob === patient.dob
    );
    if (matchDemo) {
      upid = matchDemo.universal_patient_id;
      abha = matchDemo.abha_address;
      allMappings = matchDemo.mappings || [];
    }
  }

  const patientRecords = records.filter((r) => r.local_patient_id === patientId);

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

  if (!patient) {
    return (
      <div style={{ background: '#ffffff', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Patient Record Not Found</h3>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          No local patient record matching '{patientId}' was found at {hospital.name}.
        </p>
        <Link
          to={`/hospital/${hospital.slug}/patients`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0284c7', fontWeight: 600, fontSize: '13px', marginTop: '14px' }}
        >
          <ArrowLeft size={14} /> Back to Patient Directory
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Breadcrumb & Actions Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <Link
          to={`/hospital/${hospital.slug}/patients`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#64748b',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={14} /> Back to Local Patients
        </Link>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            to={`/hospital/${hospital.slug}/clinical-records?patientId=${patientId}`}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '12.5px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={13} />
            <span>Add Lab Record</span>
          </Link>

          {upid && (
            <Link
              to={`/hospital/${hospital.slug}/exchange-requests?upid=${encodeURIComponent(upid)}`}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                background: '#0284c7',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Send size={13} />
              <span>Request Cross-Hospital Records</span>
            </Link>
          )}
        </div>
      </div>

      {/* Patient Profile Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '18px', marginBottom: '18px' }}>
          <div style={{
            width: '54px',
            height: '54px',
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
                {patient.full_name}
              </h2>
              <span style={{
                padding: '2px 8px',
                borderRadius: '12px',
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '11px',
                fontWeight: 700
              }}>
                ACTIVE INTAKE
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
              Local Facility ID: <strong style={{ color: '#0284c7' }}>{patient.local_patient_id}</strong> &bull; Registered at: <strong>{hospital.name}</strong>
            </div>
          </div>
        </div>

        {/* Demographics & Verification Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '13px' }}>
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', marginBottom: '2px' }}>
              Universal Patient Identifier (UPID)
            </span>
            <code style={{ fontSize: '12.5px', fontWeight: 700, color: '#0284c7' }}>
              {upid || 'Resolving Universal Mapping...'}
            </code>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', marginBottom: '2px' }}>
              ABDM ABHA Address
            </span>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>
              {abha || patient.abha_address || 'Not Registered'}
            </strong>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', marginBottom: '2px' }}>
              Date of Birth & Gender
            </span>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>
              {patient.dob} &bull; {patient.gender}
            </strong>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', marginBottom: '2px' }}>
              Phone Reference
            </span>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>
              {patient.phone || '+91 98*** **000'}
            </strong>
          </div>
        </div>
      </div>

      {/* Grid: Cross-Hospital Mappings & Local Records */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Cross-Hospital Network Associations */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Building2 size={18} color="#0284c7" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Cross-Hospital Network Mappings
            </h3>
          </div>
          <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748b' }}>
            Verified institutional mappings under TN HealthBridge universal identity. Clinical payloads remain isolated in their respective hospital datastores.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allMappings.length > 0 ? (
              allMappings.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
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
                    <strong>{m.provider_name || m.provider_id}</strong>
                    <span style={{ color: '#64748b', marginLeft: '8px' }}>Local ID: <code>{m.local_patient_id}</code></span>
                  </div>
                  <span style={{ padding: '2px 7px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', fontSize: '10.5px', fontWeight: 700 }}>
                    {m.verification_status || 'VERIFIED'}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '12px', color: '#64748b', padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: '6px' }}>
                Registered only at {hospital.name} ({patient.local_patient_id}).
              </div>
            )}
          </div>
        </div>

        {/* Local Clinical Records at this Hospital */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FlaskConical size={18} color="#059669" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Local Clinical Records at {hospital.name} ({patientRecords.length})
              </h3>
            </div>
            <Link
              to={`/hospital/${hospital.slug}/clinical-records?patientId=${patientId}`}
              style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}
            >
              + Add Record
            </Link>
          </div>
          <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748b' }}>
            Authoritative clinical observations stored in {hospital.name}'s local repository.
          </p>

          {patientRecords.length === 0 ? (
            <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '6px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
              No clinical records recorded locally at {hospital.name} for this patient yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {patientRecords.map((r) => {
                const badge = getInterpretationBadge(r.interpretation);
                return (
                  <div
                    key={r.record_id}
                    style={{
                      padding: '10px 14px',
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
                      <strong style={{ color: '#0f172a' }}>{r.test_name}</strong>
                      <span style={{ color: '#475569', marginLeft: '8px' }}>
                        <strong>{r.value}</strong> {r.unit}
                      </span>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {r.effective_datetime?.slice(0, 10)} &bull; {r.attending_practitioner}
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      background: badge.bg,
                      color: badge.text,
                      border: `1px solid ${badge.border}`
                    }}>
                      {r.interpretation}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

