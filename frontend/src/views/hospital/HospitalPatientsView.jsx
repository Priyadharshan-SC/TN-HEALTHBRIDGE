import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Building2,
  ChevronRight
} from 'lucide-react';
import { useHospital } from '../../layouts/HospitalLayout';

export default function HospitalPatientsView() {
  const {
    hospital,
    patients,
    records,
    allPatients,
    handleRegisterPatient,
    setFeedback
  } = useHospital();

  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newPatient, setNewPatient] = useState({
    local_patient_id: '',
    full_name: '',
    dob: '',
    gender: 'MALE',
    phone: '',
    abha_address: '',
  });

  const getPatientUniversalIdentity = (localPatientId) => {
    for (const u of allPatients) {
      const m = (u.mappings || []).find(
        (map) => map.provider_id === hospital.id && map.local_patient_id === localPatientId
      );
      if (m) {
        return {
          upid: u.universal_patient_id,
          allMappings: u.mappings || [],
          abha: u.abha_address,
        };
      }
    }
    const matchDemo = allPatients.find((u) => {
      const lp = patients.find((pt) => pt.local_patient_id === localPatientId);
      return lp && u.full_name?.toLowerCase() === lp.full_name?.toLowerCase() && u.dob === lp.dob;
    });
    if (matchDemo) {
      return {
        upid: matchDemo.universal_patient_id,
        allMappings: matchDemo.mappings || [],
        abha: matchDemo.abha_address,
      };
    }
    return null;
  };

  const onSubmitRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const regId = newPatient.local_patient_id.trim();
      await handleRegisterPatient({
        ...newPatient,
        local_patient_id: regId,
        created_at: new Date().toISOString(),
        active: true,
      });
      setFeedback({
        type: 'success',
        text: `Patient ${regId} registered at ${hospital.name} and mapped to TN HealthBridge UPID.`
      });
      setNewPatient({ local_patient_id: '', full_name: '', dob: '', gender: 'MALE', phone: '', abha_address: '' });
      navigate(`/hospital/${hospital.slug}/patients/${regId}`);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to register patient' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.local_patient_id.toLowerCase().includes(q) ||
      p.full_name.toLowerCase().includes(q) ||
      (p.dob || '').includes(q)
    );
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1.1fr', gap: '24px' }}>
      {/* Patient Directory Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
              Local Patient Directory ({hospital.name})
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Authoritative patient population registered in this facility's local system.
            </p>
          </div>
          <span style={{ fontSize: '12px', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '10px', fontWeight: 600 }}>
            {patients.length} Active
          </span>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <input
            type="text"
            placeholder="Search local patient ID, name, or DOB..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '10px 12px' }}>Local ID</th>
                <th style={{ padding: '10px 12px' }}>Universal ID (UPID)</th>
                <th style={{ padding: '10px 12px' }}>Patient Name</th>
                <th style={{ padding: '10px 12px' }}>DOB & Gender</th>
                <th style={{ padding: '10px 12px' }}>Local Recs</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    {patients.length === 0
                      ? 'No patients registered yet. Use the registration form to add a patient.'
                      : 'No patients found matching your search.'}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => {
                  const uInfo = getPatientUniversalIdentity(p.local_patient_id);
                  const ptRecCount = records.filter((r) => r.local_patient_id === p.local_patient_id).length;

                  return (
                    <tr key={p.local_patient_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0284c7' }}>
                        {p.local_patient_id}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {uInfo?.upid ? (
                          <code style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 5px', borderRadius: '4px', fontWeight: 700 }}>
                            {uInfo.upid}
                          </code>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Auto-Mapping...</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                        {p.full_name}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>
                        {p.dob} &bull; {p.gender}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: ptRecCount > 0 ? '#0369a1' : '#94a3b8' }}>
                        {ptRecCount} {ptRecCount === 1 ? 'record' : 'records'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <Link
                          to={`/hospital/${hospital.slug}/patients/${p.local_patient_id}`}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '5px',
                            background: '#f1f5f9',
                            color: '#334155',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>Profile</span>
                          <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Local Patient Intake Form */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <UserPlus size={18} color="#0284c7" />
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            Register Local Patient
          </h4>
        </div>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
          Intakes patient into {hospital.name}'s database and synchronizes universal identity without duplicate UPIDs.
        </p>

        <form onSubmit={onSubmitRegister}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
              Local Patient ID (e.g. {hospital.code}-9001)
            </label>
            <input
              type="text"
              placeholder={`e.g. ${hospital.code}-5001`}
              value={newPatient.local_patient_id}
              onChange={(e) => setNewPatient({ ...newPatient, local_patient_id: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Anandha Kumar"
              value={newPatient.full_name}
              onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                DOB
              </label>
              <input
                type="date"
                value={newPatient.dob}
                onChange={(e) => setNewPatient({ ...newPatient, dob: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Gender
              </label>
              <select
                value={newPatient.gender}
                onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              >
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
              Phone Number (Optional)
            </label>
            <input
              type="text"
              placeholder="+91 98400 12345"
              value={newPatient.phone}
              onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
              ABHA Address (Optional, e.g. name@abdm)
            </label>
            <input
              type="text"
              placeholder="e.g. anand.k@abdm"
              value={newPatient.abha_address}
              onChange={(e) => setNewPatient({ ...newPatient, abha_address: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              background: '#0284c7',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none'
            }}
          >
            {submitting ? 'Registering & Linking...' : 'Register Patient & Link UPID'}
          </button>
        </form>
      </div>
    </div>
  );
}

