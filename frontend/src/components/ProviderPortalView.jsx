import React, { useState, useEffect } from 'react';
import {
  Building2,
  FlaskConical,
  User,
  Plus,
  Send,
  Inbox,
  Activity,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Search,
  FileText,
  AlertCircle,
  X,
  Check
} from 'lucide-react';
import {
  listOrganizations,
  listProviderPatients,
  registerProviderPatient,
  listProviderRecords,
  createProviderRecord,
  listProviderInbox,
  executeFederatedExchange,
  listAllPortalPatients,
  createDynamicConsentRequest
} from '../services/apiClient';

const PROVIDERS = [
  { id: 'HOSPITAL_A', name: 'City Hospital 1', code: 'CH1', type: 'HOSPITAL' },
  { id: 'LAB_C', name: 'Central Laboratory', code: 'CL', type: 'LABORATORY' },
  { id: 'HOSPITAL_B', name: 'Metro Hospital', code: 'MH', type: 'HOSPITAL' },
  { id: 'HOSPITAL_D', name: 'Sunrise Hospital', code: 'SH', type: 'HOSPITAL' },
  { id: 'LAB_E', name: 'Elite Diagnostics', code: 'ED', type: 'LABORATORY' },
  { id: 'CLINIC_F', name: 'Green Valley Clinic', code: 'GVC', type: 'CLINIC' },
];

const CLINICAL_PRESETS = {
  sugar: {
    label: 'Sugar / Diabetes',
    icon: '🩸',
    items: [
      {
        name: 'FBS (Fasting Blood Glucose)',
        test_name: 'Fasting Blood Glucose',
        value: '105',
        unit: 'mg/dL',
        specimen: 'Blood',
        reference_range: '70 - 100 mg/dL',
        interpretation: 'Elevated',
        category: 'LABORATORY',
        description: 'Hospital A standard mass concentration'
      },
      {
        name: 'Fasting Glucose (mmol/L)',
        test_name: 'Fasting Glucose (mmol/L)',
        value: '5.4',
        unit: 'mmol/L',
        specimen: 'Serum',
        reference_range: '3.9 - 5.6 mmol/L',
        interpretation: 'Normal',
        category: 'LABORATORY',
        description: 'Elite Labs SI molar units'
      },
      {
        name: 'HbA1c (Glycated Hb)',
        test_name: 'Hemoglobin A1c',
        value: '6.8',
        unit: '%',
        specimen: 'Blood',
        reference_range: '< 5.7 %',
        interpretation: 'Pre-diabetic',
        category: 'LABORATORY',
        description: 'Metro Hospital glycation marker'
      },
      {
        name: 'Random Blood Sugar (RBS)',
        test_name: 'Random Blood Sugar',
        value: '148',
        unit: 'mg/dL',
        specimen: 'Blood',
        reference_range: '70 - 140 mg/dL',
        interpretation: 'Mildly Elevated',
        category: 'LABORATORY',
        description: 'Green Valley CHC routine screening'
      }
    ]
  },
  tb: {
    label: 'Tuberculosis (TB)',
    icon: '🫁',
    items: [
      {
        name: 'GeneXpert MTB/RIF (Detected)',
        test_name: 'GeneXpert MTB/RIF',
        value: 'Detected',
        unit: '',
        specimen: 'Sputum',
        reference_range: 'Not Detected',
        interpretation: 'Critical',
        category: 'DIAGNOSTIC',
        description: 'Central Lab CBNAAT molecular assay'
      },
      {
        name: 'GeneXpert MTB/RIF (Negative)',
        test_name: 'GeneXpert MTB/RIF',
        value: 'Not Detected',
        unit: '',
        specimen: 'Sputum',
        reference_range: 'Not Detected',
        interpretation: 'Normal',
        category: 'DIAGNOSTIC',
        description: 'Respiratory molecular clearance'
      },
      {
        name: 'Sputum AFB Smear (1+ Positive)',
        test_name: 'Sputum AFB Smear',
        value: '1+ (Positive)',
        unit: '',
        specimen: 'Sputum',
        reference_range: 'Negative',
        interpretation: 'Positive',
        category: 'LABORATORY',
        description: 'City Hospital acid-fast microscopy'
      },
      {
        name: 'Sputum AFB Smear (Negative)',
        test_name: 'Sputum AFB Smear',
        value: 'Negative',
        unit: '',
        specimen: 'Sputum',
        reference_range: 'Negative',
        interpretation: 'Normal',
        category: 'LABORATORY',
        description: 'Primary care sputum smear'
      }
    ]
  },
  bp: {
    label: 'Blood Pressure (BP)',
    icon: '🩺',
    items: [
      {
        name: 'Systolic BP (mm[Hg])',
        test_name: 'Systolic Blood Pressure',
        value: '125',
        unit: 'mm[Hg]',
        specimen: '',
        reference_range: '90 - 120 mm[Hg]',
        interpretation: 'Pre-hypertensive',
        category: 'OBSERVATION',
        description: 'Canonical UCUM mm[Hg] systolic measure'
      },
      {
        name: 'Diastolic BP (mm[Hg])',
        test_name: 'Diastolic Blood Pressure',
        value: '82',
        unit: 'mm[Hg]',
        specimen: '',
        reference_range: '60 - 80 mm[Hg]',
        interpretation: 'Normal',
        category: 'OBSERVATION',
        description: 'Diastolic blood pressure'
      },
      {
        name: 'Blood Pressure (Systolic) (mmHg)',
        test_name: 'Blood Pressure (Systolic)',
        value: '138',
        unit: 'mmHg',
        specimen: '',
        reference_range: '< 120 mmHg',
        interpretation: 'Stage 1 Hypertension',
        category: 'OBSERVATION',
        description: 'Metro Hospital clinical vital'
      },
      {
        name: 'Blood Pressure Composite (120/80)',
        test_name: 'Blood Pressure',
        value: '120/80',
        unit: 'mm[Hg]',
        specimen: '',
        reference_range: '120/80 mm[Hg]',
        interpretation: 'Normal',
        category: 'OBSERVATION',
        description: 'Combined systolic/diastolic vital panel'
      }
    ]
  },
  dengue: {
    label: 'Dengue Panel',
    icon: '🦟',
    items: [
      {
        name: 'Dengue NS1 Antigen (Positive)',
        test_name: 'Dengue NS1 Antigen',
        value: 'Positive',
        unit: '',
        specimen: 'Serum',
        reference_range: 'Negative',
        interpretation: 'Positive',
        category: 'DIAGNOSTIC',
        description: 'Acute phase NS1 rapid immunoassay'
      },
      {
        name: 'Dengue NS1 Antigen (Negative)',
        test_name: 'Dengue NS1 Antigen',
        value: 'Negative',
        unit: '',
        specimen: 'Serum',
        reference_range: 'Negative',
        interpretation: 'Normal',
        category: 'DIAGNOSTIC',
        description: 'Negative NS1 antigen screen'
      },
      {
        name: 'Dengue IgM Antibody (Positive)',
        test_name: 'Dengue IgM Antibody',
        value: 'Positive',
        unit: '',
        specimen: 'Serum',
        reference_range: 'Negative',
        interpretation: 'Positive',
        category: 'LABORATORY',
        description: 'Convalescent serology antibody'
      },
      {
        name: 'Platelet Count (85,000 /uL)',
        test_name: 'Platelet Count',
        value: '85000',
        unit: '/uL',
        specimen: 'Blood',
        reference_range: '150,000 - 450,000 /uL',
        interpretation: 'Low',
        category: 'LABORATORY',
        description: 'Central Lab thrombocytopenia marker'
      },
      {
        name: 'Platelet Count (92 10*3/uL)',
        test_name: 'Platelet Count',
        value: '92',
        unit: '10*3/uL',
        specimen: 'Blood',
        reference_range: '150 - 450 10*3/uL',
        interpretation: 'Low',
        category: 'LABORATORY',
        description: 'Elite Labs SI hematology units'
      }
    ]
  },
  malaria: {
    label: 'Malaria Screening',
    icon: '🦠',
    items: [
      {
        name: 'Malaria Rapid Ag: Positive (P. vivax)',
        test_name: 'Malaria Rapid Diagnostic Test (RDT)',
        value: 'Positive (P. vivax)',
        unit: '',
        specimen: 'Blood',
        reference_range: 'Negative',
        interpretation: 'Positive',
        category: 'DIAGNOSTIC',
        description: 'Rapid dipstick antigen detection'
      },
      {
        name: 'Malaria Rapid Ag: Negative',
        test_name: 'Malaria Rapid Diagnostic Test (RDT)',
        value: 'Negative',
        unit: '',
        specimen: 'Blood',
        reference_range: 'Negative',
        interpretation: 'Normal',
        category: 'DIAGNOSTIC',
        description: 'Negative malaria rapid screening'
      },
      {
        name: 'Malaria Blood Smear (Trophozoites)',
        test_name: 'Malaria Blood Smear',
        value: 'P. vivax trophozoites seen',
        unit: '',
        specimen: 'Blood',
        reference_range: 'No Parasites Detected',
        interpretation: 'Positive',
        category: 'LABORATORY',
        description: 'Microscopic peripheral smear evaluation'
      },
      {
        name: 'Malaria Blood Smear (Negative)',
        test_name: 'Malaria Blood Smear',
        value: 'No Parasites Seen',
        unit: '',
        specimen: 'Blood',
        reference_range: 'No Parasites Detected',
        interpretation: 'Normal',
        category: 'LABORATORY',
        description: 'Negative microscopic blood film'
      }
    ]
  }
};

const HOSPITAL_RECOMMENDED_PRESETS = {
  HOSPITAL_A: {
    label: 'City Hospital 1 (FBS 105 mg/dL)',
    category: 'sugar',
    presetIndex: 0
  },
  HOSPITAL_B: {
    label: 'Metro Hospital (HbA1c 6.8%)',
    category: 'sugar',
    presetIndex: 2
  },
  LAB_C: {
    label: 'Central Lab (GeneXpert TB Detected)',
    category: 'tb',
    presetIndex: 0
  },
  HOSPITAL_D: {
    label: 'Sunrise Apex (Systolic BP 125 mm[Hg])',
    category: 'bp',
    presetIndex: 0
  },
  LAB_E: {
    label: 'Elite Labs (Fasting Glucose 5.4 mmol/L)',
    category: 'sugar',
    presetIndex: 1
  },
  CLINIC_F: {
    label: 'Green Valley (Malaria Rapid Ag Positive)',
    category: 'malaria',
    presetIndex: 0
  }
};

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

export default function ProviderPortalView() {
  const [selectedProviderId, setSelectedProviderId] = useState('HOSPITAL_B'); // Default to Metro Hospital
  const [activeTab, setActiveTab] = useState('request-exchange'); // 'patients', 'records', 'request-exchange', 'inbox'

  const [patients, setPatients] = useState([]);
  const [records, setRecords] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // New Patient Form State
  const [newPatient, setNewPatient] = useState({
    local_patient_id: '',
    full_name: '',
    dob: '',
    gender: 'MALE',
    phone: '',
    abha_address: '',
  });
  const [selectedPatientLocalId, setSelectedPatientLocalId] = useState(null);

  // New Record Form State
  const [activeCategory, setActiveCategory] = useState('sugar');
  const [newRecord, setNewRecord] = useState({
    local_patient_id: '',
    category: 'LABORATORY',
    test_name: '',
    value: '',
    unit: 'mg/dL',
    specimen: 'Blood',
    reference_range: '70 - 100 mg/dL',
    interpretation: 'Normal',
    attending_practitioner: 'Attending Physician',
    notes: '',
  });

  const applyPreset = (preset) => {
    setNewRecord(prev => ({
      ...prev,
      local_patient_id: prev.local_patient_id || (patients.length > 0 ? patients[0].local_patient_id : ''),
      test_name: preset.test_name,
      value: preset.value,
      unit: preset.unit,
      specimen: preset.specimen || 'Blood',
      reference_range: preset.reference_range || '',
      interpretation: preset.interpretation || 'Normal',
      category: preset.category || 'LABORATORY',
    }));
  };

  const applyQualitativeValue = (val, interp) => {
    setNewRecord(prev => ({
      ...prev,
      value: val,
      interpretation: interp || (val === 'Positive' || val === 'Detected' ? 'Positive' : 'Normal')
    }));
  };

  // Federated Exchange Request Form State
  const [allPatients, setAllPatients] = useState([]);
  const [exchangeForm, setExchangeForm] = useState({
    source_provider_id: 'HOSPITAL_A',
    universal_patient_id: '',
    consent_id: '',
    purpose: 'Care Management and Consultation',
  });
  const [exchangeResult, setExchangeResult] = useState(null);

  const selectedProvider = PROVIDERS.find(p => p.id === selectedProviderId) || PROVIDERS[0];

  useEffect(() => {
    loadProviderData();
    const interval = setInterval(() => {
      // Periodic background sync to reflect cross-hospital registrations and transfer statuses
      Promise.all([
        listProviderPatients(selectedProviderId).catch(() => []),
        listProviderRecords(selectedProviderId).catch(() => []),
        listProviderInbox(selectedProviderId).catch(() => []),
        listAllPortalPatients().catch(() => []),
      ]).then(([pts, recs, inb, allPts]) => {
        setPatients(pts);
        setRecords(recs);
        setInbox(inb);
        setAllPatients(allPts);
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedProviderId]);

  const getPatientUniversalIdentity = (localPatientId) => {
    for (const u of allPatients) {
      const m = (u.mappings || []).find(
        map => map.provider_id === selectedProviderId && map.local_patient_id === localPatientId
      );
      if (m) {
        return {
          upid: u.universal_patient_id,
          verification_status: m.verification_status || 'VERIFIED',
          abha_address: u.abha_address,
          allMappings: u.mappings || [],
          universalPatient: u,
        };
      }
    }
    const matchDemo = allPatients.find(u => {
      const lp = patients.find(pt => pt.local_patient_id === localPatientId);
      return lp && u.full_name?.toLowerCase() === lp.full_name?.toLowerCase() && u.dob === lp.dob;
    });
    if (matchDemo) {
      return {
        upid: matchDemo.universal_patient_id,
        verification_status: 'VERIFIED',
        abha_address: matchDemo.abha_address,
        allMappings: matchDemo.mappings || [],
        universalPatient: matchDemo,
      };
    }
    return null;
  };

  const loadProviderData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [pts, recs, inb, allPts] = await Promise.all([
        listProviderPatients(selectedProviderId).catch(() => []),
        listProviderRecords(selectedProviderId).catch(() => []),
        listProviderInbox(selectedProviderId).catch(() => []),
        listAllPortalPatients().catch(() => []),
      ]);
      setPatients(pts);
      setRecords(recs);
      setInbox(inb);
      setAllPatients(allPts);
      if (allPts.length > 0 && !exchangeForm.universal_patient_id) {
        setExchangeForm(prev => ({ ...prev, universal_patient_id: allPts[0].universal_patient_id }));
      }
    } catch (err) {
      console.error('Failed to load provider data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestConsent = async () => {
    if (!exchangeForm.universal_patient_id) {
      setFeedback({ type: 'error', text: 'Please select or specify a Universal Patient ID.' });
      return;
    }
    setLoading(true);
    try {
      const consentRec = await createDynamicConsentRequest(
        exchangeForm.source_provider_id,
        selectedProviderId,
        exchangeForm.universal_patient_id,
        exchangeForm.purpose
      );
      const cid = consentRec.artefact.consent_id;
      setExchangeForm(prev => ({ ...prev, consent_id: cid }));
      setFeedback({
        type: 'success',
        text: `Consent request '${cid}' dispatched to patient (${exchangeForm.universal_patient_id}). Patient can now grant it in the Patient Portal.`
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    try {
      const regId = newPatient.local_patient_id;
      await registerProviderPatient(selectedProviderId, {
        ...newPatient,
        created_at: new Date().toISOString(),
        active: true,
      });
      setFeedback({
        type: 'success',
        text: `Patient ${regId} registered locally at ${selectedProvider.name} and mapped to TN HealthBridge UPID.`
      });
      setSelectedPatientLocalId(regId);
      setNewPatient({ local_patient_id: '', full_name: '', dob: '', gender: 'MALE', phone: '', abha_address: '' });
      await loadProviderData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    try {
      const rawVal = String(newRecord.value).trim();
      if (!rawVal) {
        throw new Error('Please enter a clinical observation result value.');
      }
      const isNum = !isNaN(parseFloat(rawVal)) && isFinite(rawVal);
      const formattedValue = isNum ? parseFloat(rawVal) : rawVal;

      await createProviderRecord(selectedProviderId, {
        local_patient_id: newRecord.local_patient_id,
        category: newRecord.category || 'LABORATORY',
        test_name: newRecord.test_name,
        value: formattedValue,
        unit: newRecord.unit || '',
        specimen: newRecord.specimen || 'Blood',
        reference_range: newRecord.reference_range || '',
        interpretation: newRecord.interpretation || 'Normal',
        attending_practitioner: newRecord.attending_practitioner || 'Attending Physician',
        notes: newRecord.notes || '',
      });
      setFeedback({ type: 'success', text: `Clinical observation '${newRecord.test_name}' recorded successfully at ${selectedProvider.name}.` });
      setNewRecord(prev => ({
        ...prev,
        test_name: '',
        value: '',
        unit: '',
        specimen: 'Blood',
        reference_range: '',
        interpretation: 'Normal',
        notes: '',
      }));
      await loadProviderData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleExecuteExchange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    setExchangeResult(null);

    try {
      const res = await executeFederatedExchange({
        source_provider_id: exchangeForm.source_provider_id,
        destination_provider_id: selectedProviderId,
        universal_patient_id: exchangeForm.universal_patient_id,
        consent_id: exchangeForm.consent_id,
        purpose: exchangeForm.purpose,
      });
      setExchangeResult(res);
      setFeedback({
        type: 'success',
        text: `Exchange completed successfully! Delivery envelope accepted by ${selectedProvider.name}.`,
      });
      await loadProviderData();
    } catch (err) {
      setFeedback({ type: 'error', text: `Exchange blocked: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper provider-portal-wrapper">
      {/* 6-Provider Switcher Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
          Select Healthcare Provider Workspace (6 Federated Hospital Nodes):
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px'
        }}>
          {PROVIDERS.map((prov) => {
            const isSelected = prov.id === selectedProviderId;
            return (
              <button
                key={prov.id}
                onClick={() => setSelectedProviderId(prov.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  background: isSelected ? '#f0f9ff' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: isSelected ? '#0284c7' : '#e2e8f0',
                  color: isSelected ? '#fff' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '11px'
                }}>
                  {prov.code}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#0369a1' : '#1e293b' }}>
                    {prov.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {prov.type}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Provider Header Banner */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '18px 24px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Building2 size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                {selectedProvider.name}
              </h2>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                ONLINE &bull; REGISTERED NODE
              </span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
              Provider ID: <code>{selectedProvider.id}</code> &bull; Local Patients: {patients.length} &bull; Clinical Records: {records.length} &bull; Delivered Transfers: {inbox.length}
            </div>
          </div>
        </div>

        <button
          onClick={loadProviderData}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: '#fff',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#475569'
          }}
        >
          <RefreshCw size={13} className={loading ? 'spin-icon' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: feedback.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Provider Workspace Sub Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '20px',
        gap: '4px'
      }}>
        {[
          { id: 'request-exchange', label: 'Request Data Exchange (M7)', icon: Send },
          { id: 'inbox', label: `Delivered Inbox (${inbox.length})`, icon: Inbox },
          { id: 'patients', label: `Local Patients (${patients.length})`, icon: User },
          { id: 'records', label: `Clinical Records (${records.length})`, icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '3px solid #0284c7' : '3px solid transparent',
                color: isActive ? '#0284c7' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '-2px'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: REQUEST DATA EXCHANGE */}
      {activeTab === 'request-exchange' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Request Form */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Initiate Outgoing Cross-Hospital Data Request
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#64748b' }}>
              {selectedProvider.name} requests authorized clinical records from another hospital on behalf of a patient.
            </p>

            <form onSubmit={handleExecuteExchange}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '5px' }}>
                  Source Provider (Holding the Records)
                </label>
                <select
                  value={exchangeForm.source_provider_id}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, source_provider_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  {PROVIDERS.filter(p => p.id !== selectedProviderId).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '5px' }}>
                  Universal Patient ID (UPID)
                </label>
                {allPatients.length > 0 ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={exchangeForm.universal_patient_id}
                      onChange={(e) => setExchangeForm({ ...exchangeForm, universal_patient_id: e.target.value })}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      required
                    >
                      <option value="">-- Select Patient --</option>
                      {allPatients.map(p => (
                        <option key={p.universal_patient_id} value={p.universal_patient_id}>
                          {p.full_name} ({p.universal_patient_id}) — {p.connected_hospitals_count} linked hospitals
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Or custom UPID"
                      value={exchangeForm.universal_patient_id}
                      onChange={(e) => setExchangeForm({ ...exchangeForm, universal_patient_id: e.target.value })}
                      style={{ width: '130px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. UPID-ARUN-001"
                    value={exchangeForm.universal_patient_id}
                    onChange={(e) => setExchangeForm({ ...exchangeForm, universal_patient_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    required
                  />
                )}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    ABDM Authorizing Consent Identifier
                  </label>
                  <button
                    type="button"
                    onClick={handleRequestConsent}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      border: '1px solid #bae6fd',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Send size={11} /> Request Consent from Patient Now
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. CONSENT-REQ-XXXX (or click 'Request Consent from Patient Now')"
                  value={exchangeForm.consent_id}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, consent_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  required
                />
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  Click &quot;Request Consent from Patient Now&quot; to send a real dynamic consent request to the patient portal.
                </span>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '5px' }}>
                  Clinical Purpose
                </label>
                <input
                  type="text"
                  value={exchangeForm.purpose}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, purpose: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-search-blue"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <Send size={15} />
                <span>{loading ? 'Orchestrating M1–M7 Exchange...' : 'Execute Federated Exchange'}</span>
              </button>
            </form>
          </div>

          {/* Real-time Result / Non-persistence Card */}
          <div>
            <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>
                Federated Interoperability Execution Guarantee
              </h4>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>
                <li>Resolves UPID to source provider local patient reference.</li>
                <li>Verifies patient consent with authoritative ABDM release gates.</li>
                <li>Retrieves raw records on-the-fly via source provider adapter.</li>
                <li>Standardizes observations into FHIR R4 document bundle.</li>
                <li>Re-evaluates consent revocation immediately before transmission.</li>
                <li>Delivers to destination hospital inbox with signed SHA-256 receipt.</li>
                <li><strong>Zero Central Persistence:</strong> Discards raw clinical payload.</li>
              </ul>
            </div>

            {exchangeResult && (
              <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #bbf7d0', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                  <strong style={{ fontSize: '14px', color: '#15803d' }}>Exchange Completed Successfully</strong>
                </div>
                <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>
                  <div><strong>Job ID:</strong> <code>{exchangeResult.job?.job_id}</code></div>
                  <div><strong>Delivery Status:</strong> <span style={{ padding: '2px 6px', background: '#dcfce7', color: '#15803d', borderRadius: '4px', fontWeight: 700 }}>{exchangeResult.job?.status}</span></div>
                  <div><strong>Receipt ID:</strong> <code>{exchangeResult.receipt?.receipt_id}</code></div>
                  <div><strong>Digest:</strong> <code style={{ fontSize: '11px' }}>{exchangeResult.receipt?.payload_digest}</code></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INBOX */}
      {activeTab === 'inbox' && (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            Incoming Clinical Exchanges Received by {selectedProvider.name}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {inbox.length === 0 ? (
              <p style={{ color: '#64748b' }}>No exchanges received yet. Initiate an exchange to see delivered data.</p>
            ) : (
              inbox.map((item, idx) => (
                <div key={idx} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#0369a1' }}>{item.sender_provider_name} $\rightarrow$ {selectedProvider.name}</strong>
                      <span style={{ fontSize: '12.5px', color: '#475569', marginLeft: '10px' }}>Patient: <strong>{item.patient_name}</strong> ({item.universal_patient_id})</span>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700 }}>
                      DELIVERED & VERIFIED
                    </span>
                  </div>

                  <div style={{ fontSize: '12.5px', color: '#334155' }}>
                    {item.summary}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
                    Receipt: <code>{item.receipt_id}</code> &bull; Received: {item.received_at?.slice(0, 19).replace('T', ' ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LOCAL PATIENTS */}
      {activeTab === 'patients' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1.1fr', gap: '20px' }}>
            {/* Patients Table */}
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Local Patient Directory ({selectedProvider.name})
                </h3>
                <span style={{ fontSize: '12px', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  {patients.length} Registered
                </span>
              </div>
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <th style={{ padding: '10px' }}>Local ID</th>
                      <th style={{ padding: '10px' }}>Universal ID (UPID)</th>
                      <th style={{ padding: '10px' }}>Patient Name</th>
                      <th style={{ padding: '10px' }}>DOB / Gender</th>
                      <th style={{ padding: '10px' }}>Network Link</th>
                      <th style={{ padding: '10px' }}>Local Recs</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                          No patients registered yet. Register a patient using the intake form.
                        </td>
                      </tr>
                    ) : (
                      patients.map((p) => {
                        const uInfo = getPatientUniversalIdentity(p.local_patient_id);
                        const isSelected = selectedPatientLocalId === p.local_patient_id;
                        const recCount = records.filter(r => r.local_patient_id === p.local_patient_id).length;
                        const hospCount = uInfo?.allMappings?.length || 1;

                        return (
                          <tr
                            key={p.local_patient_id}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: isSelected ? '#f0f9ff' : 'transparent',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            <td style={{ padding: '10px', fontWeight: 700, color: '#0284c7' }}>
                              {p.local_patient_id}
                            </td>
                            <td style={{ padding: '10px' }}>
                              {uInfo?.upid ? (
                                <code style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                  {uInfo.upid}
                                </code>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Auto-Mapping...</span>
                              )}
                            </td>
                            <td style={{ padding: '10px', fontWeight: 600, color: '#1e293b' }}>
                              {p.full_name}
                            </td>
                            <td style={{ padding: '10px', fontSize: '12px', color: '#64748b' }}>
                              {p.dob} &bull; {p.gender}
                            </td>
                            <td style={{ padding: '10px' }}>
                              <span style={{
                                padding: '2px 7px',
                                borderRadius: '12px',
                                background: hospCount > 1 ? '#f0fdf4' : '#f8fafc',
                                color: hospCount > 1 ? '#15803d' : '#475569',
                                border: `1px solid ${hospCount > 1 ? '#bbf7d0' : '#e2e8f0'}`,
                                fontSize: '11px',
                                fontWeight: 700
                              }}>
                                {hospCount} {hospCount === 1 ? 'Hospital' : 'Hospitals'}
                              </span>
                            </td>
                            <td style={{ padding: '10px', fontSize: '12px', fontWeight: 600, color: recCount > 0 ? '#0369a1' : '#94a3b8' }}>
                              {recCount} {recCount === 1 ? 'record' : 'records'}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedPatientLocalId(p.local_patient_id)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '5px',
                                  background: isSelected ? '#0284c7' : '#f1f5f9',
                                  color: isSelected ? '#fff' : '#334155',
                                  border: 'none',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                {isSelected ? 'Viewing' : 'View Profile'}
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

            {/* Register Patient Form */}
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Register Local Patient
              </h4>
              <p style={{ margin: '0 0 14px 0', fontSize: '11.5px', color: '#64748b' }}>
                Intakes patient into local database and synchronizes with TN HealthBridge identity registry.
              </p>
              <form onSubmit={handleRegisterPatient}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Local ID (e.g. {selectedProvider.code}-9001)
                  </label>
                  <input
                    type="text"
                    value={newPatient.local_patient_id}
                    onChange={(e) => setNewPatient({ ...newPatient, local_patient_id: e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Full Name</label>
                  <input
                    type="text"
                    value={newPatient.full_name}
                    onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>DOB</label>
                    <input
                      type="date"
                      value={newPatient.dob}
                      onChange={(e) => setNewPatient({ ...newPatient, dob: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Gender</label>
                    <select
                      value={newPatient.gender}
                      onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    >
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98400 12345"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    ABHA Address (Optional, e.g. name@abdm)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. arun.kumar@abdm"
                    value={newPatient.abha_address}
                    onChange={(e) => setNewPatient({ ...newPatient, abha_address: e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn-search-blue"
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Register Patient & Link Identity
                </button>
              </form>
            </div>
          </div>

          {/* DYNAMIC PATIENT PROFILE VIEW */}
          {selectedPatientLocalId && (() => {
            const activePt = patients.find(p => p.local_patient_id === selectedPatientLocalId);
            if (!activePt) return null;
            const uInfo = getPatientUniversalIdentity(activePt.local_patient_id);
            const ptRecords = records.filter(r => r.local_patient_id === activePt.local_patient_id);

            return (
              <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #bae6fd', padding: '24px', boxShadow: '0 2px 10px rgba(2, 132, 199, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                          {activePt.full_name}
                        </h3>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700 }}>
                          VERIFIED IDENTITY
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>
                        Local ID: <strong style={{ color: '#0284c7' }}>{activePt.local_patient_id}</strong> &bull; Universal Patient ID (UPID): <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, color: '#0369a1' }}>{uInfo?.upid || 'Resolving...'}</code>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    {uInfo?.upid && (
                      <button
                        type="button"
                        onClick={() => {
                          setExchangeForm(prev => ({ ...prev, universal_patient_id: uInfo.upid }));
                          setActiveTab('request-exchange');
                        }}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '6px',
                          background: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Send size={13} />
                        <span>Request Cross-Hospital Records</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedPatientLocalId(null)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#64748b',
                        fontSize: '12.5px',
                        cursor: 'pointer'
                      }}
                    >
                      Close Profile
                    </button>
                  </div>
                </div>

                {/* Profile Grid: Demographics & Network Associations */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px', marginBottom: '20px' }}>
                  {/* Demographics Card */}
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      Demographics & Verification Metadata
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px' }}>
                      <div><span style={{ color: '#64748b' }}>Date of Birth:</span> <strong>{activePt.dob}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Gender:</span> <strong>{activePt.gender}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Phone:</span> <strong>{activePt.phone || 'Masked (+91 98*** **000)'}</strong></div>
                      <div><span style={{ color: '#64748b' }}>ABHA Address:</span> <strong>{uInfo?.abha_address || 'Not registered'}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Identity Status:</span> <strong style={{ color: '#16a34a' }}>ACTIVE & VERIFIED</strong></div>
                      <div><span style={{ color: '#64748b' }}>Registered Provider:</span> <strong>{selectedProvider.name}</strong></div>
                    </div>
                  </div>

                  {/* Cross-Hospital Network Associations */}
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      Federated Healthcare Provider Mappings
                    </h5>
                    <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: '#64748b' }}>
                      Verified associations under TN HealthBridge universal identity. Clinical payloads remain isolated in their source repositories.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {uInfo?.allMappings && uInfo.allMappings.length > 0 ? (
                        uInfo.allMappings.map((m, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              background: '#fff',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '12px'
                            }}
                          >
                            <div>
                              <strong>{m.provider_name || m.provider_id}</strong>
                              <span style={{ color: '#64748b', marginLeft: '8px' }}>Local ID: <code>{m.local_patient_id}</code></span>
                            </div>
                            <span style={{ padding: '1px 6px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontSize: '10px', fontWeight: 700 }}>
                              {m.verification_status || 'VERIFIED'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Registered only at {selectedProvider.name} ({activePt.local_patient_id}).
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Available Local Records at this Provider */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h5 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                      Available Local Records at {selectedProvider.name} ({ptRecords.length})
                    </h5>
                    <button
                      type="button"
                      onClick={() => {
                        setNewRecord(prev => ({ ...prev, local_patient_id: activePt.local_patient_id }));
                        setActiveTab('records');
                      }}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '4px',
                        background: '#f0f9ff',
                        color: '#0369a1',
                        border: '1px solid #bae6fd',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      + Add Record for this Patient
                    </button>
                  </div>

                  {ptRecords.length === 0 ? (
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                      No clinical observations or reports currently stored locally for this patient at {selectedProvider.name}.
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ overflowX: 'auto' }}>
                      <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '8px' }}>Test / Investigation</th>
                            <th style={{ padding: '8px' }}>Result</th>
                            <th style={{ padding: '8px' }}>Interpretation</th>
                            <th style={{ padding: '8px' }}>Specimen</th>
                            <th style={{ padding: '8px' }}>Effective Date</th>
                            <th style={{ padding: '8px' }}>Practitioner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ptRecords.map((r) => {
                            const badge = getInterpretationBadge(r.interpretation);
                            return (
                              <tr key={r.record_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px', fontWeight: 600 }}>{r.test_name}</td>
                                <td style={{ padding: '8px' }}><strong>{r.value}</strong> {r.unit}</td>
                                <td style={{ padding: '8px' }}>
                                  <span style={{
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    background: badge.bg,
                                    color: badge.text,
                                    border: `1px solid ${badge.border}`
                                  }}>
                                    {r.interpretation}
                                  </span>
                                </td>
                                <td style={{ padding: '8px', color: '#64748b' }}>{r.specimen || 'blood'}</td>
                                <td style={{ padding: '8px', color: '#64748b' }}>{r.effective_datetime?.slice(0, 10)}</td>
                                <td style={{ padding: '8px', color: '#475569' }}>{r.attending_practitioner}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 4: CLINICAL RECORDS & MULTI-DISEASE REPORTING */}
      {activeTab === 'records' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Clinical Presets Bar */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FlaskConical size={16} color="#0284c7" />
                  Clinical Report Templates & Multi-Disease Presets
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Select a disease category to populate domain-specific tests with hospital-specific units and qualitative/quantitative formats.
                </p>
              </div>

              {/* Hospital Recommended Quick Button */}
              {HOSPITAL_RECOMMENDED_PRESETS[selectedProviderId] && (
                <button
                  type="button"
                  onClick={() => {
                    const cfg = HOSPITAL_RECOMMENDED_PRESETS[selectedProviderId];
                    setActiveCategory(cfg.category);
                    const preset = CLINICAL_PRESETS[cfg.category]?.items[cfg.presetIndex];
                    if (preset) applyPreset(preset);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    color: '#166534',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Building2 size={13} />
                  Use {HOSPITAL_RECOMMENDED_PRESETS[selectedProviderId].label}
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {Object.entries(CLINICAL_PRESETS).map(([key, cat]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveCategory(key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: activeCategory === key ? '2px solid #0284c7' : '1px solid #e2e8f0',
                    background: activeCategory === key ? '#f0f9ff' : '#f8fafc',
                    color: activeCategory === key ? '#0369a1' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Template Item Chips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
              {CLINICAL_PRESETS[activeCategory]?.items.map((item, idx) => {
                const badge = getInterpretationBadge(item.interpretation);
                return (
                  <div
                    key={idx}
                    onClick={() => applyPreset(item)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0284c7';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#fff';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{item.name}</strong>
                      <span
                        style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`
                        }}
                      >
                        {item.interpretation}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#0284c7', fontWeight: 600 }}>
                      Value: <strong>{item.value}</strong> {item.unit || '(qualitative)'}
                      {item.specimen ? ` • ${item.specimen}` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      {item.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Grid: Table (Left) + Form (Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '20px' }}>
            {/* Records Table */}
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  Authoritative Clinical Repository ({selectedProvider.name})
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {records.length} {records.length === 1 ? 'Observation' : 'Observations'}
                </span>
              </div>

              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <th style={{ padding: '8px 10px', fontSize: '11.5px' }}>Record ID</th>
                      <th style={{ padding: '8px 10px', fontSize: '11.5px' }}>Patient</th>
                      <th style={{ padding: '8px 10px', fontSize: '11.5px' }}>Investigation</th>
                      <th style={{ padding: '8px 10px', fontSize: '11.5px' }}>Result / Unit</th>
                      <th style={{ padding: '8px 10px', fontSize: '11.5px' }}>Specimen</th>
                      <th style={{ padding: '8px 10px', fontSize: '11.5px' }}>Interpretation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                          No clinical observations recorded yet for {selectedProvider.name}.
                          <br />
                          <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                            Use the form on the right or select a template above to add reports (Sugar, TB, BP, Dengue, Malaria).
                          </span>
                        </td>
                      </tr>
                    ) : (
                      records.map((r) => {
                        const badge = getInterpretationBadge(r.interpretation);
                        return (
                          <tr key={r.record_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '9px 10px', fontSize: '11.5px', color: '#64748b' }}>
                              <code>{r.record_id}</code>
                            </td>
                            <td style={{ padding: '9px 10px', fontWeight: 700, color: '#0284c7', fontSize: '12px' }}>
                              {r.local_patient_id}
                            </td>
                            <td style={{ padding: '9px 10px', fontWeight: 600, fontSize: '12.5px' }}>
                              {r.test_name}
                              <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 400 }}>
                                Ref: {r.reference_range || 'Standard range'}
                              </div>
                            </td>
                            <td style={{ padding: '9px 10px', fontSize: '12.5px' }}>
                              <strong>{r.value}</strong> {r.unit}
                            </td>
                            <td style={{ padding: '9px 10px', fontSize: '11.5px', color: '#475569' }}>
                              {r.specimen || '—'}
                            </td>
                            <td style={{ padding: '9px 10px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  background: badge.bg,
                                  color: badge.text,
                                  border: `1px solid ${badge.border}`
                                }}
                              >
                                {r.interpretation || 'Normal'}
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

            {/* Add Record Form */}
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Add Clinical Observation
              </h4>
              <form onSubmit={handleCreateRecord}>
                {/* Patient Selector */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Local Patient ID
                  </label>
                  {patients.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <select
                        value={newRecord.local_patient_id}
                        onChange={(e) => setNewRecord({ ...newRecord, local_patient_id: e.target.value })}
                        style={{ flex: 1, padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                        required
                      >
                        <option value="">-- Select Registered Patient --</option>
                        {patients.map((p) => (
                          <option key={p.local_patient_id} value={p.local_patient_id}>
                            {p.local_patient_id} — {p.full_name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Or custom ID"
                        value={newRecord.local_patient_id}
                        onChange={(e) => setNewRecord({ ...newRecord, local_patient_id: e.target.value })}
                        style={{ width: '110px', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. CH1-1042"
                      value={newRecord.local_patient_id}
                      onChange={(e) => setNewRecord({ ...newRecord, local_patient_id: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                      required
                    />
                  )}
                </div>

                {/* Category & Investigation */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Category
                    </label>
                    <select
                      value={newRecord.category}
                      onChange={(e) => setNewRecord({ ...newRecord, category: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    >
                      <option value="LABORATORY">LABORATORY</option>
                      <option value="DIAGNOSTIC">DIAGNOSTIC</option>
                      <option value="OBSERVATION">OBSERVATION</option>
                      <option value="ENCOUNTER">ENCOUNTER</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Investigation / Test Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Fasting Blood Glucose, GeneXpert MTB"
                      value={newRecord.test_name}
                      onChange={(e) => setNewRecord({ ...newRecord, test_name: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                </div>

                {/* Value & Quick Result Chips */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
                      Result Value (Numeric or Qualitative)
                    </label>
                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>Supports numbers & text</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 105, 5.4, Detected, Positive, Negative"
                    value={newRecord.value}
                    onChange={(e) => setNewRecord({ ...newRecord, value: e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    required
                  />

                  {/* Qualitative Result Quick Chips */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => applyQualitativeValue('Detected', 'Critical')}
                      style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', cursor: 'pointer' }}
                    >
                      Detected
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQualitativeValue('Not Detected', 'Negative')}
                      style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', cursor: 'pointer' }}
                    >
                      Not Detected
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQualitativeValue('Positive', 'Positive')}
                      style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', cursor: 'pointer' }}
                    >
                      Positive
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQualitativeValue('Negative', 'Normal')}
                      style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', cursor: 'pointer' }}
                    >
                      Negative
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQualitativeValue('Normal', 'Normal')}
                      style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    >
                      Normal
                    </button>
                  </div>
                </div>

                {/* Unit & Specimen */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Unit (or blank for qualitative)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. mg/dL, mmol/L, mm[Hg], %"
                      value={newRecord.unit}
                      onChange={(e) => setNewRecord({ ...newRecord, unit: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                      {['mg/dL', 'mmol/L', 'mm[Hg]', '%', '/uL', '10*3/uL'].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setNewRecord({ ...newRecord, unit: u })}
                          style={{ padding: '1px 5px', fontSize: '10px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer' }}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Specimen
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Blood, Serum, Sputum"
                      value={newRecord.specimen}
                      onChange={(e) => setNewRecord({ ...newRecord, specimen: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                      {['Blood', 'Serum', 'Plasma', 'Sputum'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNewRecord({ ...newRecord, specimen: s })}
                          style={{ padding: '1px 5px', fontSize: '10px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer' }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reference Range & Interpretation */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Reference Range
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 70 - 100 mg/dL, Negative"
                      value={newRecord.reference_range}
                      onChange={(e) => setNewRecord({ ...newRecord, reference_range: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Interpretation
                    </label>
                    <select
                      value={newRecord.interpretation}
                      onChange={(e) => setNewRecord({ ...newRecord, interpretation: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    >
                      <option value="Normal">Normal</option>
                      <option value="Negative">Negative</option>
                      <option value="Not Detected">Not Detected</option>
                      <option value="Positive">Positive</option>
                      <option value="Detected">Detected</option>
                      <option value="Critical">Critical</option>
                      <option value="Elevated">Elevated</option>
                      <option value="Pre-diabetic">Pre-diabetic</option>
                      <option value="Pre-hypertensive">Pre-hypertensive</option>
                      <option value="Stage 1 Hypertension">Stage 1 Hypertension</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-search-blue"
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Record Observation in {selectedProvider.name}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
