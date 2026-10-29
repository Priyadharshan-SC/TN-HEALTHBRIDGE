import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FlaskConical,
  Plus,
  Building2,
  CheckCircle2,
  Filter,
  Search,
  Sparkles
} from 'lucide-react';
import { useHospital } from '../../layouts/HospitalLayout';

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
        description: 'City Hospital 1 standard enzymatic assay'
      },
      {
        name: 'Fasting Plasma Glucose (5.8 mmol/L)',
        test_name: 'Fasting Blood Glucose',
        value: '5.8',
        unit: 'mmol/L',
        specimen: 'Blood',
        reference_range: '3.9 - 5.6 mmol/L',
        interpretation: 'Elevated',
        category: 'LABORATORY',
        description: 'Elite Diagnostics SI mmol/L protocol'
      },
      {
        name: 'HbA1c (Glycated Hemoglobin)',
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
        description: 'Routine blood glucose check'
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
        description: 'Molecular sputum clearance'
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
        description: 'Acid-fast bacillus smear microscopy'
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
        description: 'Negative acid-fast bacillus smear'
      }
    ]
  },
  bp: {
    label: 'Blood Pressure / Vitals',
    icon: '🩺',
    items: [
      {
        name: 'Systolic Blood Pressure (125 mm[Hg])',
        test_name: 'Systolic Blood Pressure',
        value: '125',
        unit: 'mm[Hg]',
        specimen: 'Physical',
        reference_range: '90 - 120 mm[Hg]',
        interpretation: 'Pre-hypertension',
        category: 'OBSERVATION',
        description: 'Sunrise Apex sphygmomanometry'
      },
      {
        name: 'Systolic Blood Pressure (145 mmHg)',
        test_name: 'Systolic Blood Pressure',
        value: '145',
        unit: 'mmHg',
        specimen: 'Physical',
        reference_range: '90 - 120 mmHg',
        interpretation: 'Hypertension Stage 1',
        category: 'OBSERVATION',
        description: 'Clinical manual blood pressure'
      },
      {
        name: 'Diastolic Blood Pressure (84 mm[Hg])',
        test_name: 'Diastolic Blood Pressure',
        value: '84',
        unit: 'mm[Hg]',
        specimen: 'Physical',
        reference_range: '60 - 80 mm[Hg]',
        interpretation: 'Pre-hypertension',
        category: 'OBSERVATION',
        description: 'Diastolic vascular resistance'
      }
    ]
  },
  dengue: {
    label: 'Dengue Serology',
    icon: '🦟',
    items: [
      {
        name: 'Dengue NS1 Antigen: Positive',
        test_name: 'Dengue Virus NS1 Antigen',
        value: 'Positive',
        unit: '',
        specimen: 'Serum',
        reference_range: 'Negative',
        interpretation: 'Positive',
        category: 'DIAGNOSTIC',
        description: 'Acute early phase NS1 antigen'
      },
      {
        name: 'Dengue NS1 Antigen: Negative',
        test_name: 'Dengue Virus NS1 Antigen',
        value: 'Negative',
        unit: '',
        specimen: 'Serum',
        reference_range: 'Negative',
        interpretation: 'Normal',
        category: 'DIAGNOSTIC',
        description: 'NS1 antigen not detected'
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
        description: 'Thrombocytopenia monitoring'
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
        description: 'Negative malaria screening'
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
        description: 'Microscopic peripheral smear'
      }
    ]
  }
};

const HOSPITAL_RECOMMENDED_PRESETS = {
  HOSPITAL_A: { category: 'sugar', presetIndex: 0, label: 'FBS 105 mg/dL' },
  LAB_C: { category: 'tb', presetIndex: 0, label: 'GeneXpert TB Detected' },
  HOSPITAL_B: { category: 'sugar', presetIndex: 2, label: 'HbA1c 6.8%' },
  HOSPITAL_D: { category: 'bp', presetIndex: 0, label: 'Systolic BP 125 mm[Hg]' },
  LAB_E: { category: 'sugar', presetIndex: 1, label: 'Fasting Glucose 5.8 mmol/L' },
  CLINIC_F: { category: 'malaria', presetIndex: 0, label: 'Malaria Rapid Ag Positive' },
};

export default function HospitalClinicalRecordsView() {
  const [searchParams] = useSearchParams();
  const prefilledPatientId = searchParams.get('patientId') || '';

  const { hospital, records, patients, handleCreateRecord, setFeedback } = useHospital();

  const [activeCategory, setActiveCategory] = useState('sugar');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [newRecord, setNewRecord] = useState({
    local_patient_id: prefilledPatientId || (patients.length > 0 ? patients[0].local_patient_id : ''),
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
    setNewRecord((prev) => ({
      ...prev,
      test_name: preset.test_name,
      value: preset.value,
      unit: preset.unit,
      specimen: preset.specimen || 'Blood',
      reference_range: preset.reference_range || '',
      interpretation: preset.interpretation || 'Normal',
      category: preset.category || 'LABORATORY',
      notes: preset.description || '',
    }));
  };

  const applyQualitativeValue = (val, interp) => {
    setNewRecord((prev) => ({
      ...prev,
      value: val,
      interpretation: interp || (val === 'Positive' || val === 'Detected' ? 'Positive' : 'Normal')
    }));
  };

  const onSubmitRecord = async (e) => {
    e.preventDefault();
    const rawVal = String(newRecord.value).trim();
    if (!rawVal) {
      setFeedback({ type: 'error', text: 'Please specify a test result value.' });
      return;
    }
    const isNum = !isNaN(parseFloat(rawVal)) && isFinite(rawVal);
    const formattedVal = isNum ? parseFloat(rawVal) : rawVal;

    setSubmitting(true);
    try {
      await handleCreateRecord({
        ...newRecord,
        value: formattedVal,
      });
      setFeedback({
        type: 'success',
        text: `Clinical record '${newRecord.test_name}' added for patient ${newRecord.local_patient_id}.`
      });
      setNewRecord((prev) => ({ ...prev, test_name: '', value: '', notes: '' }));
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create record' });
    } finally {
      setSubmitting(false);
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

  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.test_name.toLowerCase().includes(q) ||
      r.local_patient_id.toLowerCase().includes(q) ||
      (r.interpretation || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Templates & Presets Section */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FlaskConical size={18} color="#0284c7" />
              Clinical Observation Templates & Disease Categories
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Click any disease template to auto-populate test codes, specimen, units, and reference ranges.
            </p>
          </div>

          {HOSPITAL_RECOMMENDED_PRESETS[hospital.id] && (
            <button
              type="button"
              onClick={() => {
                const cfg = HOSPITAL_RECOMMENDED_PRESETS[hospital.id];
                setActiveCategory(cfg.category);
                const item = CLINICAL_PRESETS[cfg.category]?.items[cfg.presetIndex];
                if (item) applyPreset(item);
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
              <Sparkles size={13} />
              Use {hospital.name} Recommended: {HOSPITAL_RECOMMENDED_PRESETS[hospital.id].label}
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {Object.entries(CLINICAL_PRESETS).map(([key, cat]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                border: activeCategory === key ? '2px solid #0284c7' : '1px solid #e2e8f0',
                background: activeCategory === key ? '#f0f9ff' : '#f8fafc',
                color: activeCategory === key ? '#0369a1' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
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
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
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
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{item.name}</strong>
                    <span style={{
                      padding: '1px 6px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: badge.bg,
                      color: badge.text,
                      border: `1px solid ${badge.border}`
                    }}>
                      {item.interpretation}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Value: <strong>{item.value}</strong> {item.unit} &bull; {item.specimen}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '6px', fontWeight: 600 }}>
                  Click to populate &rarr;
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Add Record Form & Local Records Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px' }}>
        {/* Form Card */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Plus size={18} color="#0284c7" />
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Add Clinical Observation ({hospital.code})
            </h4>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
            Store an observation directly in {hospital.name}'s local repository.
          </p>

          <form onSubmit={onSubmitRecord}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Select Local Patient
              </label>
              {patients.length > 0 ? (
                <select
                  value={newRecord.local_patient_id}
                  onChange={(e) => setNewRecord({ ...newRecord, local_patient_id: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                  required
                >
                  {patients.map((p) => (
                    <option key={p.local_patient_id} value={p.local_patient_id}>
                      {p.full_name} ({p.local_patient_id})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. CH1-1042"
                  value={newRecord.local_patient_id}
                  onChange={(e) => setNewRecord({ ...newRecord, local_patient_id: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                  required
                />
              )}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Test / Investigation Name
              </label>
              <input
                type="text"
                placeholder="e.g. Fasting Blood Glucose, GeneXpert MTB/RIF"
                value={newRecord.test_name}
                onChange={(e) => setNewRecord({ ...newRecord, test_name: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Result Value
                </label>
                <input
                  type="text"
                  placeholder="e.g. 105 or Detected"
                  value={newRecord.value}
                  onChange={(e) => setNewRecord({ ...newRecord, value: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Unit
                </label>
                <input
                  type="text"
                  placeholder="e.g. mg/dL, % (empty for qualitative)"
                  value={newRecord.unit}
                  onChange={(e) => setNewRecord({ ...newRecord, unit: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Quick Result Chips */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                Quick Qualitative Options:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Detected', 'Not Detected', 'Positive', 'Negative', 'Normal'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => applyQualitativeValue(chip)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#334155'
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Specimen
                </label>
                <input
                  type="text"
                  value={newRecord.specimen}
                  onChange={(e) => setNewRecord({ ...newRecord, specimen: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Interpretation
                </label>
                <select
                  value={newRecord.interpretation}
                  onChange={(e) => setNewRecord({ ...newRecord, interpretation: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                >
                  <option value="Normal">Normal</option>
                  <option value="Elevated">Elevated</option>
                  <option value="Critical">Critical</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                  <option value="Pre-diabetic">Pre-diabetic</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Attending Practitioner
              </label>
              <input
                type="text"
                value={newRecord.attending_practitioner}
                onChange={(e) => setNewRecord({ ...newRecord, attending_practitioner: e.target.value })}
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
              {submitting ? 'Saving Observation...' : 'Save Observation to Local Store'}
            </button>
          </form>
        </div>

        {/* Local Records Table */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Local Clinical Observations ({records.length})
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Authoritative lab observations stored in {hospital.name}'s repository.
              </p>
            </div>
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                width: '180px',
                outline: 'none'
              }}
            />
          </div>

          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '10px' }}>Patient ID</th>
                  <th style={{ padding: '10px' }}>Investigation</th>
                  <th style={{ padding: '10px' }}>Result</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>
                      {records.length === 0
                        ? 'No observations recorded yet. Use the form to record lab results.'
                        : 'No records matching search.'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const badge = getInterpretationBadge(r.interpretation);
                    return (
                      <tr key={r.record_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', fontWeight: 700, color: '#0284c7' }}>
                          {r.local_patient_id}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 600, color: '#0f172a' }}>
                          {r.test_name}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <strong>{r.value}</strong> {r.unit}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: '10px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`
                          }}>
                            {r.interpretation || 'Normal'}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: '#64748b' }}>
                          {r.effective_datetime?.slice(0, 10)}
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
    </div>
  );
}

