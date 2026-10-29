import React, { useState } from 'react';
import { 
  X, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Heart, 
  AlertTriangle, 
  Activity,
  ShieldCheck,
  Loader2,
  Lock
} from 'lucide-react';
import { assessIdentity } from '../services/apiClient';

export default function PatientDetailsDrawer({ 
  patient, 
  onClose, 
  onViewTransaction 
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [targetRef, setTargetRef] = useState('SYN_PATIENT_002');
  const [targetHospital, setTargetHospital] = useState('HOSPITAL_B');
  const [tokenInput, setTokenInput] = useState('SYN_LINK_TOKEN_1001');
  const [assessing, setAssessing] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);

  const handleRunAssessment = async () => {
    setAssessing(true);
    try {
      const orgStr = patient.organizations?.[0] || 'City Hospital';
      const sourceHospital = orgStr.includes('Hospital') ? 'HOSPITAL_A' : 'HOSPITAL_A';
      const patientRef = patient.id === 'PAT-2048' ? 'SYN_PATIENT_001' : (patient.id.startsWith('SYN_') ? patient.id : 'SYN_PATIENT_001');
      const res = await assessIdentity(
        { source_system: sourceHospital, patient_reference: patientRef },
        { source_system: targetHospital, patient_reference: targetRef },
        tokenInput
      );
      setAssessmentResult(res);
    } catch (err) {
      setAssessmentResult({ error: err.message });
    } finally {
      setAssessing(false);
    }
  };

  if (!patient) return null;

  const getCategoryIcon = (color) => {
    switch (color) {
      case 'purple':
        return (
          <div className="cat-icon-box cat-purple">
            <FileText size={16} />
          </div>
        );
      case 'amber':
        return (
          <div className="cat-icon-box cat-amber">
            <Heart size={16} />
          </div>
        );
      case 'blue':
        return (
          <div className="cat-icon-box cat-blue">
            <FileText size={16} />
          </div>
        );
      case 'red':
        return (
          <div className="cat-icon-box cat-red">
            <AlertCircle size={16} />
          </div>
        );
      case 'red-triangle':
        return (
          <div className="cat-icon-box cat-red">
            <AlertTriangle size={16} />
          </div>
        );
      case 'blue-badge':
        return (
          <div className="cat-icon-box cat-blue">
            <Activity size={16} />
          </div>
        );
      default:
        return (
          <div className="cat-icon-box cat-blue">
            <FileText size={16} />
          </div>
        );
    }
  };

  return (
    <div className="patient-drawer-panel">
      {/* Drawer Header */}
      <div className="drawer-top-header">
        <h3 className="drawer-title">Patient Details</h3>
        <button 
          className="drawer-close-btn" 
          onClick={onClose} 
          aria-label="Close patient details"
        >
          <X size={18} />
        </button>
      </div>

      <div className="drawer-content-scroll">
        {/* Patient Profile Card */}
        <div className="drawer-profile-card">
          <div className="drawer-profile-left">
            <div className="drawer-avatar-circle">
              <User size={36} className="drawer-avatar-icon" />
            </div>
            <div className="drawer-profile-info">
              <span className="patient-code-tag">{patient.id}</span>
              <h2 className="patient-name-heading">{patient.name}</h2>
              <span className="patient-sub-details">
                {patient.gender} | {patient.dob} | Age: {patient.age}
              </span>
            </div>
          </div>

          <button 
            className="btn-view-core-info"
            onClick={() => alert(`Opening Core Clinical Demographic file for ${patient.name} (${patient.id})`)}
          >
            View Core Info
          </button>
        </div>

        {/* 3 KPI Summary Cards */}
        <div className="drawer-kpis-grid">
          <div className="drawer-kpi-card">
            <div className="kpi-mini-icon-box bg-kpi-blue">
              <FileText size={18} />
            </div>
            <div className="kpi-mini-content">
              <span className="kpi-mini-label">Total Transactions</span>
              <strong className="kpi-mini-number">{patient.totalTransactions}</strong>
            </div>
          </div>

          <div className="drawer-kpi-card">
            <div className="kpi-mini-icon-box bg-kpi-green">
              <CheckCircle2 size={18} />
            </div>
            <div className="kpi-mini-content">
              <span className="kpi-mini-label">Successful</span>
              <strong className="kpi-mini-number">{patient.successfulTransactions}</strong>
            </div>
          </div>

          <div className="drawer-kpi-card">
            <div className="kpi-mini-icon-box bg-kpi-red">
              <AlertCircle size={18} />
            </div>
            <div className="kpi-mini-content">
              <span className="kpi-mini-label">Failed</span>
              <strong className="kpi-mini-number">{patient.failedTransactions}</strong>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="detail-tabs-bar">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'record-categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('record-categories')}
          >
            Record Categories
          </button>
          <button
            className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button
            className={`tab-btn ${activeTab === 'access-history' ? 'active' : ''}`}
            onClick={() => setActiveTab('access-history')}
          >
            Access History
          </button>
          <button
            className={`tab-btn ${activeTab === 'identity-safety' ? 'active' : ''}`}
            onClick={() => setActiveTab('identity-safety')}
            style={{ fontWeight: 600, color: activeTab === 'identity-safety' ? '#0369a1' : undefined }}
          >
            Identity Linkage (M4)
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="drawer-tab-overview">
            {/* Patient Information Section */}
            <div className="drawer-section-card">
              <div className="section-card-header">
                <h4 className="section-title">Patient Information</h4>
                <button 
                  className="link-edit-view"
                  onClick={() => alert(`Edit / View demographic info for ${patient.name}`)}
                >
                  Edit/View
                </button>
              </div>

              <div className="patient-info-2col-grid">
                <div className="info-pair">
                  <span className="pair-label">Patient ID</span>
                  <span className="pair-value bold-text">{patient.id}</span>
                </div>
                <div className="info-pair">
                  <span className="pair-label">Organizations</span>
                  <div className="org-badges-row">
                    {patient.organizations.map((org, i) => (
                      <span key={i} className="org-tag-pill">{org}</span>
                    ))}
                  </div>
                </div>

                <div className="info-pair">
                  <span className="pair-label">Name</span>
                  <span className="pair-value">{patient.name}</span>
                </div>
                <div className="info-pair">
                  <span className="pair-label">First Activity</span>
                  <span className="pair-value">{patient.firstActivity}</span>
                </div>

                <div className="info-pair">
                  <span className="pair-label">Date of Birth</span>
                  <span className="pair-value">{patient.dob}</span>
                </div>
                <div className="info-pair">
                  <span className="pair-label">Last Activity</span>
                  <span className="pair-value">{patient.lastActivityFull}</span>
                </div>

                <div className="info-pair">
                  <span className="pair-label">Gender</span>
                  <span className="pair-value">{patient.gender}</span>
                </div>
                <div className="info-pair">
                  <span className="pair-label">Total Transactions</span>
                  <span className="pair-value">{patient.totalTransactions} ({patient.failedTransactions} failed)</span>
                </div>
              </div>
            </div>

            {/* Record Categories (Data Available) */}
            <div className="drawer-section-card">
              <div className="section-card-header">
                <h4 className="section-title">Record Categories (Data Available)</h4>
              </div>

              <div className="categories-grid-3x2">
                {(patient.categories.length > 0 ? patient.categories : [
                  { name: "Patient", count: "5 records", color: "purple" },
                  { name: "Observation", count: "12 records", color: "amber" },
                  { name: "Diagnostic Report", count: "4 records", color: "blue" },
                  { name: "Medication", count: "3 records", color: "red" },
                  { name: "Allergy Intolerance", count: "2 records", color: "red-triangle" },
                  { name: "Procedure", count: "1 record", color: "blue-badge" }
                ]).map((cat, i) => (
                  <div key={i} className="record-cat-card">
                    {getCategoryIcon(cat.color)}
                    <div className="cat-text-wrap">
                      <span className="cat-title">{cat.name}</span>
                      <span className="cat-count">{cat.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="drawer-section-card">
              <div className="section-card-header">
                <h4 className="section-title">Recent Transactions</h4>
                <button 
                  className="link-edit-view"
                  onClick={() => alert(`Viewing all transaction history for ${patient.name}`)}
                >
                  View All
                </button>
              </div>

              <div className="table-responsive">
                <table className="drawer-txn-table">
                  <thead>
                    <tr>
                      <th style={{ width: '18%' }}>Transaction ID</th>
                      <th style={{ width: '18%' }}>Source</th>
                      <th style={{ width: '18%' }}>Destination</th>
                      <th style={{ width: '18%' }}>Data Type</th>
                      <th style={{ width: '12%' }}>Status</th>
                      <th style={{ width: '16%' }}>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(patient.recentTransactions.length > 0 ? patient.recentTransactions : [
                      { id: "TXN-1008", source: "Metro Hospital", destination: "City Hospital", dataType: "Observation", status: "Failed", dateTime: "Oct 27, 10:42 AM" },
                      { id: "TXN-1004", source: "Central Lab", destination: "City Hospital", dataType: "Diagnostic Report", status: "Success", dateTime: "Oct 27, 10:38 AM" },
                      { id: "TXN-1001", source: "City Hospital", destination: "Central Lab", dataType: "Patient", status: "Success", dateTime: "Oct 27, 10:35 AM" }
                    ]).map((txn, idx) => {
                      const statusClass = txn.status === 'Success' ? 'status-pill-success' : 'status-pill-failed';
                      return (
                        <tr key={idx}>
                          <td>
                            <button 
                              className="txn-link" 
                              onClick={() => onViewTransaction?.({ txnId: txn.id, source: txn.source, destination: txn.destination, dataType: txn.dataType, status: txn.status })}
                            >
                              {txn.id}
                            </button>
                          </td>
                          <td>{txn.source}</td>
                          <td>{txn.destination}</td>
                          <td>{txn.dataType}</td>
                          <td>
                            <span className={`status-pill ${statusClass}`}>{txn.status}</span>
                          </td>
                          <td className="col-time-cell">{txn.dateTime}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'record-categories' && (
          <div className="drawer-tab-panel">
            <h4 className="section-title" style={{ marginBottom: '12px' }}>Clinical Resource Breakdown</h4>
            <div className="categories-grid-3x2">
              {(patient.categories || []).map((cat, i) => (
                <div key={i} className="record-cat-card">
                  {getCategoryIcon(cat.color)}
                  <div className="cat-text-wrap">
                    <span className="cat-title">{cat.name}</span>
                    <span className="cat-count">{cat.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="drawer-tab-panel">
            <h4 className="section-title" style={{ marginBottom: '12px' }}>All Data Exchange Transactions</h4>
            <div className="table-responsive">
              <table className="drawer-txn-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Source &rarr; Destination</th>
                    <th>Data Type</th>
                    <th>Status</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(patient.recentTransactions || []).map((txn, idx) => (
                    <tr key={idx}>
                      <td><button className="txn-link" onClick={() => onViewTransaction?.(txn)}>{txn.id}</button></td>
                      <td>{txn.source} &rarr; {txn.destination}</td>
                      <td>{txn.dataType}</td>
                      <td><span className={`status-pill ${txn.status === 'Success' ? 'status-pill-success' : 'status-pill-failed'}`}>{txn.status}</span></td>
                      <td>{txn.dateTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'access-history' && (
          <div className="drawer-tab-panel">
            <h4 className="section-title" style={{ marginBottom: '12px' }}>Access & Audit Trail</h4>
            <p style={{ fontSize: '12.5px', color: '#64748b' }}>
              All access attempts to {patient.name}'s records are logged in the immutable audit ledger.
            </p>
          </div>
        )}

        {activeTab === 'identity-safety' && (
          <div className="drawer-tab-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <ShieldCheck size={18} style={{ color: '#0284c7' }} />
              <h4 className="section-title" style={{ margin: 0 }}>Patient Identity Safety Assessment (M4)</h4>
            </div>
            
            <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '14px', lineHeight: 1.5 }}>
              Evaluate cross-hospital patient identity linkage under the TN HealthBridge zero-merge framework.
            </p>

            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Destination Hospital
                  </label>
                  <select 
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                    value={targetHospital}
                    onChange={(e) => setTargetHospital(e.target.value)}
                  >
                    <option value="HOSPITAL_B">Hospital B (Central Lab)</option>
                    <option value="HOSPITAL_C">Hospital C (Metro Specialty)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Target Patient Reference
                  </label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    value={targetRef}
                    onChange={(e) => setTargetRef(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Synthetic Identity Linkage Token
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="e.g. SYN_LINK_TOKEN_1001"
                  />
                  <button
                    type="button"
                    onClick={handleRunAssessment}
                    disabled={assessing}
                    className="btn-search-blue"
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {assessing ? <Loader2 size={13} className="spin-icon" /> : <Lock size={13} />}
                    <span>{assessing ? 'Assessing...' : 'Assess'}</span>
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Preset: <span style={{ cursor: 'pointer', color: '#0284c7', textDecoration: 'underline' }} onClick={() => setTokenInput('SYN_LINK_TOKEN_1001')}>Authorized (1001)</span> | <span style={{ cursor: 'pointer', color: '#0284c7', textDecoration: 'underline' }} onClick={() => setTokenInput('UNAUTHORIZED_TOKEN')}>Unauthorized Probe</span>
              </div>
            </div>

            {assessmentResult && (
              <div style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                border: `1px solid ${assessmentResult.linkage_decision === 'same_identity' ? '#86efac' : '#fecaca'}`, 
                background: assessmentResult.linkage_decision === 'same_identity' ? '#f0fdf4' : '#fef2f2',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '13px', color: assessmentResult.linkage_decision === 'same_identity' ? '#166534' : '#991b1b' }}>
                    Decision: {assessmentResult.linkage_decision || 'Error'}
                  </strong>
                  <span style={{ 
                    fontSize: '11px', 
                    padding: '2px 8px', 
                    borderRadius: '10px', 
                    fontWeight: 700, 
                    background: assessmentResult.policy_action === 'proceed' ? '#dcfce7' : '#fee2e2',
                    color: assessmentResult.policy_action === 'proceed' ? '#15803d' : '#991b1b'
                  }}>
                    Policy: {assessmentResult.policy_action || 'N/A'}
                  </span>
                </div>

                {assessmentResult.confidence_score !== undefined && (
                  <div style={{ fontSize: '12px', color: '#334155', marginBottom: '4px' }}>
                    Confidence: <strong>{Math.round(assessmentResult.confidence_score * 100)}%</strong> ({assessmentResult.confidence_level})
                  </div>
                )}

                {assessmentResult.error && (
                  <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                    {assessmentResult.error}
                  </div>
                )}

                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: '11px', color: '#0369a1', fontWeight: 600 }}>
                  Zero-Merge Policy: TN HealthBridge never performs destructive chart merges.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
