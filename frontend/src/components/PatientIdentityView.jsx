import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserCheck, 
  Building2, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Link2, 
  Plus, 
  RefreshCw, 
  Layers, 
  HelpCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Fingerprint,
  ChevronDown,
  ChevronRight,
  GitBranch,
  GitMerge,
  FolderTree,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Phone,
  User,
  Shield,
  Activity
} from 'lucide-react';
import { 
  listUniversalPatients, 
  addProviderMapping, 
  createUniversalPatient,
  mergeUniversalPatients,
  resolveIdentity, 
  assessIdentity 
} from '../services/apiClient';

const PROVIDER_METADATA = {
  HOSPITAL_A: { 
    name: 'City Hospital 1', 
    code: 'HOSPITAL_A', 
    type: 'Tertiary Hospital', 
    city: 'Chennai', 
    color: '#0284c7', 
    bg: '#f0f9ff', 
    border: '#bae6fd' 
  },
  LAB_C: { 
    name: 'Central Laboratory', 
    code: 'LAB_C', 
    type: 'Reference Diagnostic Lab', 
    city: 'Chennai', 
    color: '#0d9488', 
    bg: '#f0fdfa', 
    border: '#99f6e4' 
  },
  HOSPITAL_B: { 
    name: 'Metro Hospital', 
    code: 'HOSPITAL_B', 
    type: 'Secondary Hospital', 
    city: 'Madurai', 
    color: '#6366f1', 
    bg: '#eef2ff', 
    border: '#c7d2fe' 
  },
  HOSPITAL_D: { 
    name: 'Sunrise Hospital', 
    code: 'HOSPITAL_D', 
    type: 'Multi-Specialty Hospital', 
    city: 'Coimbatore', 
    color: '#d97706', 
    bg: '#fffbeb', 
    border: '#fde68a' 
  },
  LAB_E: { 
    name: 'Elite Diagnostics', 
    code: 'LAB_E', 
    type: 'Pathology & Molecular Lab', 
    city: 'Tiruchirappalli', 
    color: '#7c3aed', 
    bg: '#f5f3ff', 
    border: '#ddd6fe' 
  },
  CLINIC_F: { 
    name: 'Green Valley Clinic', 
    code: 'CLINIC_F', 
    type: 'Primary Care Clinic', 
    city: 'Salem', 
    color: '#059669', 
    bg: '#ecfdf5', 
    border: '#a7f3d0' 
  }
};

export default function PatientIdentityView() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('All Organizations');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'table'
  const [expandedUpids, setExpandedUpids] = useState(new Set());
  const [copiedUpid, setCopiedUpid] = useState(null);

  // Link Mapping Modal
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [mappingUpid, setMappingUpid] = useState('');
  const [mappingProvider, setMappingProvider] = useState('HOSPITAL_A');
  const [mappingPatientId, setMappingPatientId] = useState('');
  const [mappingMethod, setMappingMethod] = useState('MANUAL_VERIFIED');
  const [mappingVerificationStatus, setMappingVerificationStatus] = useState('VERIFIED');
  const [mappingConfidenceScore, setMappingConfidenceScore] = useState(1.0);
  const [mappingProvenance, setMappingProvenance] = useState('Administrator verified federated clinical linkage');
  const [mappingStatus, setMappingStatus] = useState(null);

  // Register UPID Modal
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerDob, setRegisterDob] = useState('1990-01-01');
  const [registerGender, setRegisterGender] = useState('MALE');
  const [registerAbha, setRegisterAbha] = useState('');
  const [registerPhone, setRegisterPhone] = useState('+91 98*** **123');
  const [registerStatus, setRegisterStatus] = useState(null);

  // Merge UPIDs Modal
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeSourceUpid, setMergeSourceUpid] = useState('');
  const [mergeTargetUpid, setMergeTargetUpid] = useState('');
  const [mergePreferredName, setMergePreferredName] = useState('');
  const [mergeReason, setMergeReason] = useState('Identity verified as same individual');
  const [mergeStatus, setMergeStatus] = useState(null);

  // M4 Linkage Assessment Tool Showcase
  const [showM4Tool, setShowM4Tool] = useState(false);
  const [testRefAProvider, setTestRefAProvider] = useState('HOSPITAL_A');
  const [testRefAPatient, setTestRefAPatient] = useState('CH1-1042');
  const [testRefBProvider, setTestRefBProvider] = useState('HOSPITAL_B');
  const [testRefBPatient, setTestRefBPatient] = useState('MH-2098');
  const [testToken, setTestToken] = useState('SYN_LINK_TOKEN_1001');
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [assessing, setAssessing] = useState(false);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const data = await listUniversalPatients(searchQuery, selectedProvider);
      const list = data || [];
      setPatients(list);
      // Expand all UPID tree nodes by default on load
      setExpandedUpids(new Set(list.map(p => p.universal_patient_id)));
      if (list.length > 0) {
        setSelectedPatient(prev => {
          if (prev) {
            const updated = list.find(p => p.universal_patient_id === prev.universal_patient_id);
            return updated || list[0];
          }
          return list[0];
        });
      } else {
        setSelectedPatient(null);
      }
    } catch (err) {
      console.warn('Backend listUniversalPatients error:', err.message);
      setPatients([]);
      setSelectedPatient(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [searchQuery, selectedProvider]);

  const toggleExpandUpid = (upid) => {
    setExpandedUpids(prev => {
      const next = new Set(prev);
      if (next.has(upid)) {
        next.delete(upid);
      } else {
        next.add(upid);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedUpids(new Set(patients.map(p => p.universal_patient_id)));
  };

  const handleCollapseAll = () => {
    setExpandedUpids(new Set());
  };

  const handleCopyUpid = (upid, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(upid);
    setCopiedUpid(upid);
    setTimeout(() => setCopiedUpid(null), 2000);
  };

  const openLinkModalForUpid = (upid, defaultProvider = 'HOSPITAL_B') => {
    setMappingUpid(upid);
    setMappingProvider(defaultProvider);
    setMappingPatientId('');
    setMappingMethod('MANUAL_VERIFIED');
    setMappingVerificationStatus('VERIFIED');
    setMappingConfidenceScore(1.0);
    setMappingProvenance('Administrator verified federated clinical linkage');
    setMappingStatus(null);
    setIsMappingModalOpen(true);
  };

  const handleAddMapping = async (e) => {
    e.preventDefault();
    if (!mappingUpid || !mappingPatientId || !mappingProvider) {
      setMappingStatus({ type: 'error', msg: 'Please provide UPID, provider, and local patient ID.' });
      return;
    }
    setMappingStatus({ type: 'loading', msg: 'Enforcing zero-merge global uniqueness & linking...' });
    try {
      await addProviderMapping({
        universal_patient_id: mappingUpid.trim(),
        provider_id: mappingProvider,
        local_patient_id: mappingPatientId.trim(),
        verification_status: mappingVerificationStatus || 'VERIFIED',
        mapping_method: mappingMethod || 'MANUAL_VERIFIED',
        confidence_score: parseFloat(mappingConfidenceScore) || 1.0,
        provenance: mappingProvenance.trim() || 'Administrator verified federated clinical linkage'
      });
      setMappingStatus({ 
        type: 'success', 
        msg: `Successfully linked ${mappingPatientId.trim()} (${PROVIDER_METADATA[mappingProvider]?.name || mappingProvider}) to ${mappingUpid.trim()}` 
      });
      // Ensure target UPID is expanded in tree
      setExpandedUpids(prev => new Set([...prev, mappingUpid.trim()]));
      await fetchPatients();
      setTimeout(() => {
        setIsMappingModalOpen(false);
        setMappingStatus(null);
        setMappingPatientId('');
      }, 1400);
    } catch (err) {
      setMappingStatus({ type: 'error', msg: err.message });
    }
  };

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    if (!registerName || !registerDob || !registerGender) {
      setRegisterStatus({ type: 'error', msg: 'Full name, DOB, and gender are required.' });
      return;
    }
    setRegisterStatus({ type: 'loading', msg: 'Generating stable UPID and registering in ABDM MPI...' });
    try {
      const newPat = await createUniversalPatient({
        full_name: registerName.trim(),
        dob: registerDob.trim(),
        gender: registerGender,
        abha_address: registerAbha.trim() || null,
        phone_masked: registerPhone.trim() || null,
      });
      setRegisterStatus({ 
        type: 'success', 
        msg: `Successfully registered ${newPat.full_name} with ${newPat.universal_patient_id}` 
      });
      setExpandedUpids(prev => new Set([...prev, newPat.universal_patient_id]));
      await fetchPatients();
      setTimeout(() => {
        setIsRegisterModalOpen(false);
        setRegisterStatus(null);
        setRegisterName('');
        setRegisterDob('1990-01-01');
        setRegisterAbha('');
        setRegisterPhone('+91 98*** **123');
      }, 1400);
    } catch (err) {
      setRegisterStatus({ type: 'error', msg: err.message });
    }
  };

  const openMergeModal = (targetUpid) => {
    const targetPat = patients.find(p => p.universal_patient_id === targetUpid);
    const otherPats = patients.filter(p => p.universal_patient_id !== targetUpid);
    setMergeTargetUpid(targetUpid);
    setMergeSourceUpid(otherPats.length > 0 ? otherPats[0].universal_patient_id : '');
    setMergePreferredName(targetPat ? targetPat.full_name : '');
    setMergeReason('Verified as same individual (name variation consolidation)');
    setMergeStatus(null);
    setIsMergeModalOpen(true);
  };

  const handleMergePatients = async (e) => {
    e.preventDefault();
    if (!mergeSourceUpid || !mergeTargetUpid) {
      setMergeStatus({ type: 'error', msg: 'Please select both source and target UPIDs.' });
      return;
    }
    if (mergeSourceUpid === mergeTargetUpid) {
      setMergeStatus({ type: 'error', msg: 'Source and target UPIDs must be different.' });
      return;
    }
    setMergeStatus({ type: 'loading', msg: 'Consolidating provider mappings and updating identity graph...' });
    try {
      await mergeUniversalPatients({
        source_universal_patient_id: mergeSourceUpid,
        target_universal_patient_id: mergeTargetUpid,
        preferred_name: mergePreferredName.trim() || null,
        reason: mergeReason.trim() || 'Identity verified as same individual'
      });
      setMergeStatus({ 
        type: 'success', 
        msg: `Successfully consolidated ${mergeSourceUpid} into ${mergeTargetUpid}!` 
      });
      setExpandedUpids(prev => new Set([...prev, mergeTargetUpid]));
      await fetchPatients();
      setTimeout(() => {
        setIsMergeModalOpen(false);
        setMergeStatus(null);
      }, 1400);
    } catch (err) {
      setMergeStatus({ type: 'error', msg: err.message });
    }
  };

  const handleRunM4Assessment = async () => {
    setAssessing(true);
    setAssessmentResult(null);
    try {
      const res = await assessIdentity(
        { source_provider_id: testRefAProvider, local_patient_id: testRefAPatient },
        { source_provider_id: testRefBProvider, local_patient_id: testRefBPatient },
        testToken || null
      );
      setAssessmentResult({ success: true, data: res });
    } catch (err) {
      setAssessmentResult({ success: false, error: err.message });
    } finally {
      setAssessing(false);
    }
  };

  // Stats calculation
  const totalUpids = patients.length;
  const totalMappings = patients.reduce((acc, p) => acc + (p.mappings?.length || 0), 0);
  const verifiedMappings = patients.reduce((acc, p) => acc + (p.mappings?.filter(m => m.verification_status === 'VERIFIED').length || 0), 0);

  return (
    <div className="page-wrapper patient-identity-page" style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div className="page-header-banner" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '8px', 
                background: '#0284c7', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#fff',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)' 
              }}>
                <GitBranch size={20} />
              </div>
              <h1 className="page-main-heading" style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                Universal Patient Identity & Linkage
              </h1>
            </div>
            <p className="page-subheading" style={{ margin: 0, fontSize: '13px', color: '#64748b', maxWidth: '850px' }}>
              ABDM-aligned Master Patient Index (MPI). Maps local provider MRNs/IDs to stable Universal Patient IDs (UPIDs) in an expandable hierarchical tree structure with zero-merge federated record safety.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              className="btn-secondary"
              onClick={() => setIsRegisterModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <User size={15} style={{ color: '#0284c7' }} />
              <span>Register New UPID</span>
            </button>

            <button 
              className="btn-primary-blue"
              onClick={() => {
                const targetUpid = patients[0]?.universal_patient_id || 'UPID-ARUN-001';
                openLinkModalForUpid(targetUpid);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
              }}
            >
              <Plus size={16} />
              <span>Link Hospital ID to UPID</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '14px', 
        marginBottom: '20px' 
      }}>
        <div className="card-box" style={{ padding: '14px 18px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Registered Universal Identities
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{totalUpids}</span>
            <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>ABDM Registry</span>
          </div>
        </div>

        <div className="card-box" style={{ padding: '14px 18px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Linked Hospital Node Identifiers
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#0d9488' }}>{totalMappings}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Across 6 Providers</span>
          </div>
        </div>

        <div className="card-box" style={{ padding: '14px 18px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Linkage Verification Rate
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a' }}>
              {totalMappings > 0 ? ((verifiedMappings / totalMappings) * 100).toFixed(0) : 100}%
            </span>
            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Deterministic Match</span>
          </div>
        </div>

        <div className="card-box" style={{ padding: '14px 18px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Data Isolation Architecture
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#475569' }}>Zero-Merge</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Records in Source EHR</span>
          </div>
        </div>
      </div>

      {/* M4 Uncertainty-Aware Identity Resolver Accordion / Showcase */}
      <div className="card-box" style={{ 
        marginBottom: '20px', 
        border: '1px solid #bae6fd', 
        background: '#f8fafc',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div 
          onClick={() => setShowM4Tool(!showM4Tool)}
          style={{ 
            padding: '12px 18px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            background: showM4Tool ? '#f0f9ff' : '#ffffff',
            borderBottom: showM4Tool ? '1px solid #bae6fd' : 'none',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Fingerprint size={16} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>M4 Uncertainty-Aware Linkage Assessment Engine</span>
                <span style={{ fontSize: '10.5px', padding: '2px 7px', borderRadius: '10px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                  Pairwise Deterministic Resolver
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                Test cross-provider deterministic linkage confidence without modifying source records or persistent database merges
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0284c7', fontSize: '12px', fontWeight: 600 }}>
            <span>{showM4Tool ? 'Hide Assessment Tool' : 'Open Assessment Tool'}</span>
            {showM4Tool ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </div>

        {showM4Tool && (
          <div style={{ padding: '16px 18px', background: '#ffffff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Reference A (Source Provider & Local ID)
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select 
                    value={testRefAProvider} 
                    onChange={(e) => setTestRefAProvider(e.target.value)}
                    style={{ flex: 1, padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="HOSPITAL_A">HOSPITAL_A (City Hosp)</option>
                    <option value="LAB_C">LAB_C (Central Lab)</option>
                    <option value="HOSPITAL_B">HOSPITAL_B (Metro Hosp)</option>
                    <option value="HOSPITAL_D">HOSPITAL_D (Sunrise)</option>
                    <option value="LAB_E">LAB_E (Elite Lab)</option>
                    <option value="CLINIC_F">CLINIC_F (Green Valley)</option>
                  </select>
                  <input 
                    type="text" 
                    value={testRefAPatient} 
                    onChange={(e) => setTestRefAPatient(e.target.value)}
                    placeholder="Local ID A"
                    style={{ width: '120px', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Reference B (Target Provider & Local ID)
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select 
                    value={testRefBProvider} 
                    onChange={(e) => setTestRefBProvider(e.target.value)}
                    style={{ flex: 1, padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="HOSPITAL_B">HOSPITAL_B (Metro Hosp)</option>
                    <option value="HOSPITAL_A">HOSPITAL_A (City Hosp)</option>
                    <option value="LAB_C">LAB_C (Central Lab)</option>
                    <option value="HOSPITAL_D">HOSPITAL_D (Sunrise)</option>
                    <option value="LAB_E">LAB_E (Elite Lab)</option>
                    <option value="CLINIC_F">CLINIC_F (Green Valley)</option>
                  </select>
                  <input 
                    type="text" 
                    value={testRefBPatient} 
                    onChange={(e) => setTestRefBPatient(e.target.value)}
                    placeholder="Local ID B"
                    style={{ width: '120px', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Synthetic Linkage Token
                </label>
                <input 
                  type="text" 
                  value={testToken} 
                  onChange={(e) => setTestToken(e.target.value)}
                  placeholder="e.g. SYN_LINK_TOKEN_1001"
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button 
                  className="btn-primary-blue"
                  onClick={handleRunM4Assessment}
                  disabled={assessing}
                  style={{ width: '100%', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <Sparkles size={14} />
                  <span>{assessing ? 'Evaluating...' : 'Assess Linkage Safety'}</span>
                </button>
              </div>
            </div>

            {assessmentResult && (
              <div style={{ 
                marginTop: '10px', 
                padding: '12px 14px', 
                borderRadius: '6px', 
                background: assessmentResult.success ? '#f8fafc' : '#fef2f2',
                border: `1px solid ${assessmentResult.success ? '#bae6fd' : '#fecaca'}`
              }}>
                {assessmentResult.success ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '16px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor: assessmentResult.data.decision === 'same_identity' ? '#dcfce7' : assessmentResult.data.decision === 'different_identity' ? '#fee2e2' : '#fef3c7',
                        color: assessmentResult.data.decision === 'same_identity' ? '#15803d' : assessmentResult.data.decision === 'different_identity' ? '#b91c1c' : '#b45309'
                      }}>
                        {assessmentResult.data.decision.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '12.5px', color: '#1e293b' }}>
                        Match Confidence: <strong>{((assessmentResult.data.confidence_score || assessmentResult.data.confidence || 0) * 100).toFixed(1)}%</strong>
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Reason: {assessmentResult.data.deterministic_reason || assessmentResult.data.reason || 'Authoritative registry token verification'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      Audit Hash: {assessmentResult.data.audit_event_id || 'AUDIT-LINK-M4-01'}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#b91c1c', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={15} />
                    <span>Assessment failed: {assessmentResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Controls & Filter Toolbar */}
      <div className="card-box" style={{ 
        marginBottom: '18px', 
        padding: '12px 18px', 
        background: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: '12px' 
      }}>
        {/* View Mode Toggle: Tree vs Table */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
          <button
            onClick={() => setViewMode('tree')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: viewMode === 'tree' ? '#ffffff' : 'transparent',
              color: viewMode === 'tree' ? '#0284c7' : '#64748b',
              boxShadow: viewMode === 'tree' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <FolderTree size={14} />
            <span>🌳 Hierarchical Identity Tree View</span>
          </button>

          <button
            onClick={() => setViewMode('table')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: viewMode === 'table' ? '#ffffff' : 'transparent',
              color: viewMode === 'table' ? '#0284c7' : '#64748b',
              boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Layers size={14} />
            <span>📋 Master Patient Index Table</span>
          </button>
        </div>

        {/* Filter Inputs */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', minWidth: '240px', maxWidth: '360px', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search by UPID, patient name, ABHA, or local ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '7px 8px 7px 32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
            />
          </div>

          <div style={{ width: '190px' }}>
            <select 
              value={selectedProvider} 
              onChange={(e) => setSelectedProvider(e.target.value)}
              style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
            >
              <option value="All Organizations">All Healthcare Nodes</option>
              <option value="HOSPITAL_A">City Hospital 1 (HOSPITAL_A)</option>
              <option value="LAB_C">Central Laboratory (LAB_C)</option>
              <option value="HOSPITAL_B">Metro Hospital (HOSPITAL_B)</option>
              <option value="HOSPITAL_D">Sunrise Hospital (HOSPITAL_D)</option>
              <option value="LAB_E">Elite Diagnostics (LAB_E)</option>
              <option value="CLINIC_F">Green Valley Clinic (CLINIC_F)</option>
            </select>
          </div>

          {viewMode === 'tree' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={handleExpandAll}
                style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', cursor: 'pointer', color: '#475569' }}
                title="Expand All UPID Trees"
              >
                Expand All
              </button>
              <button 
                onClick={handleCollapseAll}
                style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', cursor: 'pointer', color: '#475569' }}
                title="Collapse All UPID Trees"
              >
                Collapse All
              </button>
            </div>
          )}

          <button 
            onClick={fetchPatients}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: '12.5px', color: '#334155' }}
          >
            <RefreshCw size={13} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Body: Tree View or Table View */}
      {loading ? (
        <div className="card-box" style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: '8px' }}>
          <RefreshCw size={28} className="spin-icon" style={{ margin: '0 auto 10px', color: '#0284c7' }} />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading universal patient identities and provider linkages...</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Querying Tamil Nadu ABDM Master Patient Index</div>
        </div>
      ) : patients.length === 0 ? (
        <div className="card-box" style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', background: '#ffffff', borderRadius: '8px' }}>
          <FolderTree size={36} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>No universal patient identities match your search filter.</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Try resetting your search query or provider filter.</div>
        </div>
      ) : viewMode === 'tree' ? (
        /* =========================================================================
           HIERARCHICAL TREE VIEW: Each Universal ID is an expandable tree root
           ========================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {patients.map((patient) => {
            const isExpanded = expandedUpids.has(patient.universal_patient_id);
            const mappingsCount = patient.mappings?.length || 0;

            return (
              <div 
                key={patient.universal_patient_id}
                className="tree-root-container"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease'
                }}
              >
                {/* UPID Root Node Header */}
                <div 
                  onClick={() => toggleExpandUpid(patient.universal_patient_id)}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    cursor: 'pointer',
                    background: isExpanded ? 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' : '#ffffff',
                    borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                    userSelect: 'none'
                  }}
                >
                  {/* Left: Expand chevron + Root Node Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      background: isExpanded ? '#0284c7' : '#f1f5f9', 
                      color: isExpanded ? '#ffffff' : '#64748b',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>

                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Fingerprint size={22} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Universal Patient ID Badge */}
                        <div 
                          onClick={(e) => handleCopyUpid(patient.universal_patient_id, e)}
                          title="Click to copy UPID"
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '14px',
                            color: '#0284c7',
                            background: '#f0f9ff',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            border: '1px solid #bae6fd',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          <span>{patient.universal_patient_id}</span>
                          {copiedUpid === patient.universal_patient_id ? (
                            <Check size={12} style={{ color: '#16a34a' }} />
                          ) : (
                            <Copy size={12} style={{ color: '#0284c7', opacity: 0.7 }} />
                          )}
                        </div>

                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                          {patient.full_name}
                        </span>

                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: patient.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                          color: patient.status === 'ACTIVE' ? '#15803d' : '#b91c1c',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: patient.status === 'ACTIVE' ? '#16a34a' : '#ef4444' }}></span>
                          {patient.status || 'ACTIVE'}
                        </span>
                      </div>

                      {/* Demographics sub-bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
                        <span><strong>DOB:</strong> {patient.dob}</span>
                        <span>•</span>
                        <span><strong>Gender:</strong> {patient.gender}</span>
                        <span>•</span>
                        <span><strong>ABHA:</strong> <code>{patient.abha_address || '—'}</code></span>
                        <span>•</span>
                        <span><strong>Phone:</strong> {patient.phone_masked || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Connected Nodes Count & Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '14px',
                      background: mappingsCount > 0 ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${mappingsCount > 0 ? '#bbf7d0' : '#fecaca'}`,
                      color: mappingsCount > 0 ? '#166534' : '#991b1b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <Building2 size={13} />
                      <span>{mappingsCount} Linked Hospital {mappingsCount === 1 ? 'Node' : 'Nodes'}</span>
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openLinkModalForUpid(patient.universal_patient_id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(2, 132, 199, 0.2)'
                      }}
                    >
                      <Plus size={13} />
                      <span>Link Hospital ID</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openMergeModal(patient.universal_patient_id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 11px',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      title="Merge duplicate identity into this UPID"
                    >
                      <GitMerge size={13} style={{ color: '#6366f1' }} />
                      <span>Merge UPID</span>
                    </button>
                  </div>
                </div>

                {/* Tree Branches (When Expanded) */}
                {isExpanded && (
                  <div style={{ padding: '16px 20px 20px 32px', background: '#f8fafc' }}>
                    <div style={{ 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      color: '#475569', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <GitBranch size={13} style={{ color: '#0284c7' }} />
                      <span>Linked Provider Identity Tree Branches</span>
                      <span style={{ color: '#94a3b8', fontWeight: 500, textTransform: 'none' }}>
                        (Root UPID resolves to {mappingsCount} authorized clinical locations)
                      </span>
                    </div>

                    {/* Tree Container with Vertical Guide Line */}
                    <div style={{ position: 'relative', paddingLeft: '28px', marginTop: '6px' }}>
                      {/* Vertical Tree Spine Line */}
                      <div style={{
                        position: 'absolute',
                        left: '8px',
                        top: '0px',
                        bottom: mappingsCount > 0 ? '24px' : '10px',
                        width: '2px',
                        background: '#cbd5e1',
                        borderRadius: '1px'
                      }}></div>

                      {mappingsCount === 0 ? (
                        <div style={{ position: 'relative', marginBottom: '10px' }}>
                          {/* Branch Connector Line */}
                          <div style={{
                            position: 'absolute',
                            left: '-20px',
                            top: '20px',
                            width: '20px',
                            height: '2px',
                            background: '#cbd5e1'
                          }}></div>

                          <div style={{
                            padding: '16px',
                            borderRadius: '8px',
                            border: '1px dashed #cbd5e1',
                            background: '#ffffff',
                            color: '#64748b',
                            fontSize: '12.5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <AlertCircle size={16} style={{ color: '#f59e0b' }} />
                              <span>No hospital facilities are linked yet to this Universal ID.</span>
                            </div>
                            <button
                              onClick={() => openLinkModalForUpid(patient.universal_patient_id)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '4px',
                                background: '#0284c7',
                                color: '#fff',
                                border: 'none',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              + Link First Hospital MRN
                            </button>
                          </div>
                        </div>
                      ) : (
                        patient.mappings.map((mapping, idx) => {
                          const prov = PROVIDER_METADATA[mapping.provider_id] || {
                            name: mapping.provider_name || mapping.provider_id,
                            code: mapping.provider_id,
                            type: 'Healthcare Facility',
                            city: 'Tamil Nadu',
                            color: '#0284c7',
                            bg: '#f0f9ff',
                            border: '#bae6fd'
                          };

                          return (
                            <div 
                              key={mapping.mapping_id || idx}
                              style={{ 
                                position: 'relative', 
                                marginBottom: idx === mappingsCount - 1 ? '10px' : '12px' 
                              }}
                            >
                              {/* Horizontal Branch Connector Line */}
                              <div style={{
                                position: 'absolute',
                                left: '-20px',
                                top: '24px',
                                width: '20px',
                                height: '2px',
                                background: '#cbd5e1'
                              }}></div>

                              {/* Branch Node Card */}
                              <div style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderLeft: `4px solid ${prov.color}`,
                                borderRadius: '8px',
                                padding: '14px 16px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '14px',
                                alignItems: 'center'
                              }}>
                                {/* Node Facility Identity */}
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <div style={{
                                      width: '26px',
                                      height: '26px',
                                      borderRadius: '6px',
                                      background: prov.bg,
                                      border: `1px solid ${prov.border}`,
                                      color: prov.color,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <Building2 size={14} />
                                    </div>
                                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                                      {prov.name}
                                    </span>
                                    <span style={{
                                      fontSize: '10.5px',
                                      fontFamily: 'monospace',
                                      fontWeight: 600,
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      background: '#f1f5f9',
                                      color: '#475569'
                                    }}>
                                      {prov.code}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    {prov.type} • {prov.city}
                                  </div>
                                </div>

                                {/* Local Patient MRN / ID */}
                                <div>
                                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '3px' }}>
                                    LOCAL PATIENT MRN / ID
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                      fontFamily: 'monospace',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      color: '#0369a1',
                                      background: '#f0f9ff',
                                      border: '1px solid #bae6fd',
                                      padding: '3px 8px',
                                      borderRadius: '4px'
                                    }}>
                                      {mapping.local_patient_id}
                                    </span>
                                    <span style={{
                                      fontSize: '10.5px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: mapping.verification_status === 'VERIFIED' ? '#dcfce7' : '#fef3c7',
                                      color: mapping.verification_status === 'VERIFIED' ? '#15803d' : '#b45309',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}>
                                      <CheckCircle2 size={11} />
                                      {mapping.verification_status}
                                    </span>
                                  </div>
                                </div>

                                {/* Linkage Method & Match Confidence */}
                                <div>
                                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '3px' }}>
                                    LINKAGE METHOD & CONFIDENCE
                                  </div>
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                                    {mapping.mapping_method?.replace('_', ' ') || 'MANUAL VERIFIED'}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    <div style={{ width: '60px', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ width: `${(mapping.confidence_score || 1.0) * 100}%`, height: '100%', background: '#16a34a' }}></div>
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 700 }}>
                                      {((mapping.confidence_score || 1.0) * 100).toFixed(0)}% Match
                                    </span>
                                  </div>
                                </div>

                                {/* Provenance & Date */}
                                <div>
                                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '3px' }}>
                                    PROVENANCE & AUDIT
                                  </div>
                                  <div style={{ fontSize: '11.5px', color: '#334155' }}>
                                    {mapping.provenance || 'Institutional clinical intake registration'}
                                  </div>
                                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                                    Verified: {mapping.verified_at ? new Date(mapping.verified_at).toLocaleDateString() : 'Active in Registry'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Add Another Link Button Branch */}
                      <div style={{ position: 'relative', marginTop: '6px' }}>
                        <div style={{
                          position: 'absolute',
                          left: '-20px',
                          top: '14px',
                          width: '20px',
                          height: '2px',
                          background: '#cbd5e1'
                        }}></div>

                        <button
                          onClick={() => openLinkModalForUpid(patient.universal_patient_id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px dashed #0284c7',
                            background: '#f0f9ff',
                            color: '#0284c7',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={13} />
                          <span>Link another hospital facility to {patient.universal_patient_id}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* =========================================================================
           TABULAR VIEW: ABDM Master Patient Index Table & Detail Drawer
           ========================================================================= */
        <div style={{ display: 'grid', gridTemplateColumns: selectedPatient ? '1.4fr 1fr' : '1fr', gap: '16px' }}>
          {/* Table Card */}
          <div className="card-box" style={{ padding: '0px', overflow: 'hidden', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                Universal Patient Profiles ({patients.length})
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                ABDM Master Patient Index (MPI)
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>UPID</th>
                  <th style={{ padding: '10px 14px' }}>Patient Name</th>
                  <th style={{ padding: '10px 14px' }}>ABHA Address</th>
                  <th style={{ padding: '10px 14px' }}>Linked Nodes</th>
                  <th style={{ padding: '10px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((pat) => {
                  const isSelected = selectedPatient?.universal_patient_id === pat.universal_patient_id;
                  return (
                    <tr 
                      key={pat.universal_patient_id}
                      onClick={() => setSelectedPatient(pat)}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        cursor: 'pointer',
                        background: isSelected ? '#f0f9ff' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                          {pat.universal_patient_id}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{pat.full_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{pat.gender} • DOB: {pat.dob}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        <code>{pat.abha_address || '—'}</code>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(pat.mappings || []).map((m, idx) => {
                            const prov = PROVIDER_METADATA[m.provider_id];
                            return (
                              <span 
                                key={idx}
                                style={{ 
                                  fontSize: '10px', 
                                  padding: '2px 6px', 
                                  borderRadius: '4px', 
                                  background: prov?.bg || '#e2e8f0', 
                                  color: prov?.color || '#334155',
                                  border: `1px solid ${prov?.border || '#cbd5e1'}`,
                                  fontWeight: 600
                                }}
                              >
                                {m.provider_id}: {m.local_patient_id}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button 
                          style={{
                            fontSize: '11px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #0284c7',
                            background: isSelected ? '#0284c7' : '#ffffff',
                            color: isSelected ? '#ffffff' : '#0284c7',
                            cursor: 'pointer'
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right Detail Drawer */}
          {selectedPatient && (
            <div className="card-box" style={{ padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    {selectedPatient.full_name}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                    {selectedPatient.universal_patient_id}
                  </span>
                </div>
                <button 
                  onClick={() => openLinkModalForUpid(selectedPatient.universal_patient_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11.5px',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={13} />
                  <span>Link Hospital ID</span>
                </button>
              </div>

              {/* Demographics Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px', fontSize: '12px' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>ABHA Address</div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedPatient.abha_address || '—'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Masked Contact Phone</div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedPatient.phone_masked || '—'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Date of Birth / Gender</div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedPatient.dob} ({selectedPatient.gender})</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Status</div>
                  <div style={{ fontWeight: 600, color: '#16a34a' }}>{selectedPatient.status || 'ACTIVE'}</div>
                </div>
              </div>

              {/* Registered Node Mappings */}
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                Connected Provider Mappings ({selectedPatient.mappings?.length || 0})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedPatient.mappings || []).map((map, idx) => {
                  const prov = PROVIDER_METADATA[map.provider_id];
                  return (
                    <div 
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '12.5px', color: '#0f172a' }}>
                          {prov?.name || map.provider_name || map.provider_id}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Local MRN: <code style={{ fontWeight: 700, color: '#0369a1' }}>{map.local_patient_id}</code>
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                          {map.provenance}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
                          {map.verification_status}
                        </span>
                        <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>
                          {((map.confidence_score || 1.0) * 100).toFixed(0)}% Confidence
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '16px', padding: '10px', borderRadius: '6px', background: '#f1f5f9', fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px' }}>
                <ShieldCheck size={16} style={{ color: '#0284c7', flexShrink: 0 }} />
                <div>
                  <strong>Zero-Merge Compliance:</strong> Local electronic medical records remain isolated within provider databases. UPID links reference records dynamically during federated data transfers.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
         MODAL 1: Add Provider Mapping to UPID
         ========================================================================= */}
      {isMappingModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GitBranch size={16} />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Link Hospital Local ID to UPID
              </h3>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
              Associate a provider's local patient MRN/ID to a Universal Patient ID in the TN HealthBridge Identity Graph.
            </p>

            <form onSubmit={handleAddMapping}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Target Universal Patient ID (UPID)
                </label>
                <input 
                  type="text" 
                  value={mappingUpid} 
                  onChange={(e) => setMappingUpid(e.target.value)}
                  required
                  placeholder="e.g. UPID-ARUN-001 or UPID-667EFF64"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Healthcare Facility / Node
                </label>
                <select 
                  value={mappingProvider} 
                  onChange={(e) => setMappingProvider(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="HOSPITAL_A">City Hospital 1 (HOSPITAL_A) — Chennai</option>
                  <option value="LAB_C">Central Laboratory (LAB_C) — Chennai</option>
                  <option value="HOSPITAL_B">Metro Hospital (HOSPITAL_B) — Madurai</option>
                  <option value="HOSPITAL_D">Sunrise Hospital (HOSPITAL_D) — Coimbatore</option>
                  <option value="LAB_E">Elite Diagnostics (LAB_E) — Trichy</option>
                  <option value="CLINIC_F">Green Valley Clinic (CLINIC_F) — Salem</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Local Patient MRN / Local ID
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. CH1-1042, MH-2098, LAB-9041, SH-5017"
                  value={mappingPatientId} 
                  onChange={(e) => setMappingPatientId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Mapping Method
                  </label>
                  <select
                    value={mappingMethod}
                    onChange={(e) => setMappingMethod(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  >
                    <option value="MANUAL_VERIFIED">MANUAL_VERIFIED</option>
                    <option value="CONTROLLED_REGISTRY">CONTROLLED_REGISTRY</option>
                    <option value="ABHA_LINKED">ABHA_LINKED</option>
                    <option value="PATIENT_ASSERTED">PATIENT_ASSERTED</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Verification Status
                  </label>
                  <select
                    value={mappingVerificationStatus}
                    onChange={(e) => setMappingVerificationStatus(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  >
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Provenance Note
                </label>
                <input 
                  type="text" 
                  value={mappingProvenance} 
                  onChange={(e) => setMappingProvenance(e.target.value)}
                  placeholder="e.g. Administrator verified federated clinical linkage"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                />
              </div>

              {mappingStatus && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  backgroundColor: mappingStatus.type === 'error' ? '#fee2e2' : mappingStatus.type === 'success' ? '#dcfce7' : '#e0f2fe',
                  color: mappingStatus.type === 'error' ? '#b91c1c' : mappingStatus.type === 'success' ? '#15803d' : '#0369a1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {mappingStatus.type === 'error' ? <AlertCircle size={15} /> : mappingStatus.type === 'success' ? <CheckCircle2 size={15} /> : <RefreshCw size={14} className="spin-icon" />}
                  <span>{mappingStatus.msg}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setIsMappingModalOpen(false);
                    setMappingStatus(null);
                  }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary-blue"
                  style={{ padding: '8px 18px', fontSize: '13px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Confirm & Link Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
         MODAL 2: Register New Universal Patient Identity (UPID)
         ========================================================================= */}
      {isRegisterModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={16} />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Register New Universal Patient (UPID)
              </h3>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
              Create a root Universal Patient Identity in the Tamil Nadu ABDM Master Patient Index (MPI).
            </p>

            <form onSubmit={handleRegisterPatient}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Patient Full Name *
                </label>
                <input 
                  type="text" 
                  value={registerName} 
                  onChange={(e) => setRegisterName(e.target.value)}
                  required
                  placeholder="e.g. Ananya Raman"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Date of Birth *
                  </label>
                  <input 
                    type="date" 
                    value={registerDob} 
                    onChange={(e) => setRegisterDob(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Gender *
                  </label>
                  <select
                    value={registerGender}
                    onChange={(e) => setRegisterGender(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  >
                    <option value="MALE">MALE</option>
                    <option value="FEMALE">FEMALE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  ABHA Address (Optional)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. ananya.raman@abdm"
                  value={registerAbha} 
                  onChange={(e) => setRegisterAbha(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Masked Contact Phone
                </label>
                <input 
                  type="text" 
                  value={registerPhone} 
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  placeholder="e.g. +91 98*** **456"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              {registerStatus && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  backgroundColor: registerStatus.type === 'error' ? '#fee2e2' : registerStatus.type === 'success' ? '#dcfce7' : '#e0f2fe',
                  color: registerStatus.type === 'error' ? '#b91c1c' : registerStatus.type === 'success' ? '#15803d' : '#0369a1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {registerStatus.type === 'error' ? <AlertCircle size={15} /> : registerStatus.type === 'success' ? <CheckCircle2 size={15} /> : <RefreshCw size={14} className="spin-icon" />}
                  <span>{registerStatus.msg}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setIsRegisterModalOpen(false);
                    setRegisterStatus(null);
                  }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary-blue"
                  style={{ padding: '8px 18px', fontSize: '13px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Create UPID Identity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =========================================================================
         MODAL 3: Merge Universal Patient Identities (Duplicate Consolidation)
         ========================================================================= */}
      {isMergeModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GitMerge size={16} />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Merge Universal Patient Identities
              </h3>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
              Consolidate duplicate universal patient identities into a single unified UPID tree. All linked hospital facility nodes and local MRNs will be transferred.
            </p>

            <form onSubmit={handleMergePatients}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Target Primary UPID (To Retain as Root Tree) *
                </label>
                <select
                  value={mergeTargetUpid}
                  onChange={(e) => {
                    setMergeTargetUpid(e.target.value);
                    const sel = patients.find(p => p.universal_patient_id === e.target.value);
                    if (sel) setMergePreferredName(sel.full_name);
                  }}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                >
                  {patients.map(p => (
                    <option key={p.universal_patient_id} value={p.universal_patient_id}>
                      {p.universal_patient_id} — {p.full_name} ({p.dob}, {p.mappings?.length || 0} nodes)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Source Duplicate UPID (To Absorb & Transfer Nodes) *
                </label>
                <select
                  value={mergeSourceUpid}
                  onChange={(e) => setMergeSourceUpid(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                >
                  <option value="">-- Select duplicate UPID to absorb --</option>
                  {patients.filter(p => p.universal_patient_id !== mergeTargetUpid).map(p => (
                    <option key={p.universal_patient_id} value={p.universal_patient_id}>
                      {p.universal_patient_id} — {p.full_name} ({p.dob}, {p.mappings?.length || 0} nodes)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Preferred Authoritative Patient Name
                </label>
                <input 
                  type="text" 
                  value={mergePreferredName} 
                  onChange={(e) => setMergePreferredName(e.target.value)}
                  placeholder="e.g. Priyadharshan S"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Audit Justification / Verification Reason
                </label>
                <input 
                  type="text" 
                  value={mergeReason} 
                  onChange={(e) => setMergeReason(e.target.value)}
                  placeholder="e.g. Verified as same individual (name variation consolidation)"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                />
              </div>

              {mergeStatus && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  backgroundColor: mergeStatus.type === 'error' ? '#fee2e2' : mergeStatus.type === 'success' ? '#dcfce7' : '#e0f2fe',
                  color: mergeStatus.type === 'error' ? '#b91c1c' : mergeStatus.type === 'success' ? '#15803d' : '#0369a1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {mergeStatus.type === 'error' ? <AlertCircle size={15} /> : mergeStatus.type === 'success' ? <CheckCircle2 size={15} /> : <RefreshCw size={14} className="spin-icon" />}
                  <span>{mergeStatus.msg}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setIsMergeModalOpen(false);
                    setMergeStatus(null);
                  }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ padding: '8px 18px', fontSize: '13px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <GitMerge size={14} />
                  <span>Consolidate Identities</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
