import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FlaskConical,
  Inbox,
  Send,
  Building2,
  ArrowRight,
  Activity,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { useHospital } from '../../layouts/HospitalLayout';

export default function HospitalOverviewView() {
  const { hospital, patients, records, inbox } = useHospital();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hospital Banner */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            background: hospital.badgeColor,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px'
          }}>
            {hospital.iconEmoji}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                {hospital.name} Workspace
              </h2>
              <span style={{
                padding: '2px 8px',
                borderRadius: '10px',
                background: '#f1f5f9',
                color: '#334155',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {hospital.code}
              </span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              {hospital.officialName} &bull; {hospital.location}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            to={`/hospital/${hospital.slug}/patients`}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#0284c7',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={14} />
            <span>Register Patient</span>
          </Link>
          <Link
            to={`/hospital/${hospital.slug}/exchange-requests`}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Send size={13} />
            <span>Request Records</span>
          </Link>
        </div>
      </div>

      {/* Operational KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Local Patients</span>
            <Users size={18} color="#0284c7" />
          </div>
          <strong style={{ fontSize: '24px', color: '#0f172a' }}>{patients.length}</strong>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Registered in local datastore</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Clinical Lab Reports</span>
            <FlaskConical size={18} color="#059669" />
          </div>
          <strong style={{ fontSize: '24px', color: '#0f172a' }}>{records.length}</strong>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Observations stored at facility</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 600 }}>Inbound Exchanges Delivered</span>
            <Inbox size={18} color="#16a34a" />
          </div>
          <strong style={{ fontSize: '24px', color: '#15803d' }}>{inbox.length}</strong>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Received via M7 delivery</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Facility Adapter Status</span>
            <CheckCircle2 size={18} color="#0284c7" />
          </div>
          <strong style={{ fontSize: '18px', color: '#15803d' }}>Active &bull; Verified</strong>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Zero-persistence adapter online</div>
        </div>
      </div>

      {/* Recent Deliveries Inbox Preview */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Recent Clinical Data Exchanges Received
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Transfers authorized by patients and delivered to {hospital.name} inbox.
            </p>
          </div>
          <Link
            to={`/hospital/${hospital.slug}/inbox`}
            style={{
              fontSize: '12.5px',
              color: '#0284c7',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>View Inbox ({inbox.length})</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {inbox.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            No incoming clinical exchanges received yet. Initiate an authorized exchange to receive records.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {inbox.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 18px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0369a1' }}>
                    {item.sender_provider_name} &rarr; {hospital.name}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#334155', marginTop: '2px' }}>
                    Patient: <strong>{item.patient_name}</strong> ({item.universal_patient_id}) &bull; {item.summary}
                  </div>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700 }}>
                  DELIVERED & VERIFIED
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

