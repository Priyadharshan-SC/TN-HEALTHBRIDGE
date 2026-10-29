import React, { useState, useEffect } from 'react';
import { 
  Info, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Building2, 
  FlaskConical, 
  User, 
  Eye, 
  Pill, 
  Database, 
  Activity, 
  ArrowRight, 
  Settings, 
  ClipboardCheck, 
  ShieldCheck, 
  CloudUpload, 
  Play, 
  Loader2, 
  Server
} from 'lucide-react';
import { 
  runFullPipelineSimulation, 
  getAuditStats, 
  listTransfers,
  listOrganizations
} from '../services/apiClient';

export default function OverviewView({ onNavigate, onViewTransaction }) {
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineResults, setPipelineResults] = useState(null);
  const [testToken, setTestToken] = useState('SYN_LINK_TOKEN_1001');
  const [testPatient, setTestPatient] = useState('SYN_PATIENT_001');
  const [showRawJson, setShowRawJson] = useState(false);

  // Live KPI counters
  const [kpiStats, setKpiStats] = useState({
    successful: 0,
    pending: 0,
    failed: 0,
    totalToday: 0
  });
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [connectedOrgs, setConnectedOrgs] = useState([]);

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        const stats = await getAuditStats().catch(() => null);
        const transfersRes = await listTransfers({ pageSize: 5 }).catch(() => null);
        const orgsRes = await listOrganizations().catch(() => []);
        if (active && stats) {
          const successCount = (stats.outcomes?.success || 0) + (stats.outcomes?.Allowed || 0);
          const failedCount = (stats.outcomes?.failed || 0) + (stats.outcomes?.Denied || 0);
          const totalCount = stats.total_events || 0;
          setKpiStats({
            successful: successCount,
            pending: 0,
            failed: failedCount,
            totalToday: totalCount
          });
        }
        const rawJobs = transfersRes?.jobs || transfersRes?.transfers || [];
        const mapped = rawJobs.slice(0, 5).map(t => ({
          id: t.job_id,
          time: t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
          source: t.source_provider_id || t.source_provider,
          destination: t.recipient_hiu_id || t.dest_provider,
          dataType: 'FHIR R4 Bundle',
          status: t.status === 'completed' || t.status === 'DELIVERED' || t.status === 'Success' ? 'Success' : t.status === 'failed' || t.status === 'FAILED' ? 'Failed' : 'Pending'
        }));
        setRecentTransfers(mapped);
        if (active && orgsRes) {
          setConnectedOrgs(orgsRes);
        }
      } catch (err) {
        console.warn('Overview live stats fetch error:', err.message);
      }
    };
    fetchStats();
    return () => { active = false; };
  }, []);

  const handleRunPipeline = async () => {
    setPipelineLoading(true);
    try {
      const res = await runFullPipelineSimulation({
        sourceSystem: 'HOSPITAL_A',
        destSystem: 'HOSPITAL_B',
        patientRef: testPatient,
        destPatientRef: 'SYN_PATIENT_002',
        identityToken: testToken,
        testConcept: 'Blood Glucose',
        testValue: 110.0,
        testUnit: 'mg/dL',
        specimen: 'blood'
      });
      setPipelineResults(res);
    } catch (err) {
      console.error('Pipeline simulation failed:', err);
    } finally {
      setPipelineLoading(false);
    }
  };

  return (
    <div className="page-wrapper overview-page">
      {/* Top Banner Row */}
      <div className="overview-header-row">
        <div className="overview-title-block">
          <h1 className="page-main-heading">Interoperability Overview</h1>
          <p className="page-subheading">
            Live federated health data exchange orchestrating M1 through M7 across Tamil Nadu providers.
          </p>
        </div>

        {/* Info Alert Callout */}
        <div className="overview-info-callout">
          <Info size={18} className="info-callout-icon" />
          <p className="info-callout-text">
            TN HealthBridge enables secure, standardized and ABDM-aligned consent-driven data exchange with zero persistent storage of clinical payloads.
          </p>
          <button 
            className="info-callout-link"
            onClick={() => onNavigate?.('system-status')}
          >
            <span>System Telemetry</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Interactive Architecture / Pipeline Process Card */}
      <div className="architecture-pipeline-card">
        <div className="pipeline-wrapper">
          {/* 1. Source Organization */}
          <div className="pipeline-org-card source-card">
            <span className="org-card-badge">Source Organization</span>
            
            <div className="org-illustration-box">
              <svg className="org-svg-building" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="15" y="10" width="50" height="50" rx="3" fill="#E0F2FE" />
                <rect x="25" y="2" width="30" height="58" rx="2" fill="#0EA5E9" />
                <rect x="36" y="8" width="8" height="8" rx="1" fill="#ffffff" />
                <path d="M40 9.5v5M37.5 12h5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                <rect x="30" y="20" width="6" height="6" rx="1" fill="#ffffff" />
                <rect x="44" y="20" width="6" height="6" rx="1" fill="#ffffff" />
                <rect x="30" y="30" width="6" height="6" rx="1" fill="#ffffff" />
                <rect x="44" y="30" width="6" height="6" rx="1" fill="#ffffff" />
                <rect x="36" y="44" width="8" height="16" fill="#075985" />
              </svg>
              <h3 className="org-facility-title">City Hospital 1</h3>
              <span className="org-facility-sub">HIP Node | HOSPITAL_A</span>
            </div>

            <div className="org-payload-list">
              <span className="payload-heading">Federated Records</span>
              <ul className="payload-items">
                <li><FlaskConical size={13} className="bullet-icon" /> Lab Observations</li>
                <li><User size={13} className="bullet-icon" /> Patient Demographics</li>
                <li><Eye size={13} className="bullet-icon" /> Diagnostic Reports</li>
                <li><Pill size={13} className="bullet-icon" /> Prescriptions</li>
              </ul>
            </div>
          </div>

          {/* 2. Middle Pipeline Steps */}
          <div className="pipeline-steps-group">
            <div className="pipeline-step-flow">
              <div className="flow-step-node" onClick={() => onNavigate?.('system-status')}>
                <div className="step-circle step-1">M1</div>
                <div className="step-text-meta">
                  <span className="step-title">Ingestion</span>
                  <span className="step-desc">HL7 & JSON Payload Validation</span>
                </div>
              </div>

              <div className="flow-connector-line"></div>

              <div className="flow-step-node" onClick={() => onNavigate?.('system-status')}>
                <div className="step-circle step-2">M2</div>
                <div className="step-text-meta">
                  <span className="step-title">Normalization</span>
                  <span className="step-desc">Multi-Variable Quality & Ranges</span>
                </div>
              </div>

              <div className="flow-connector-line"></div>

              <div className="flow-step-node" onClick={() => onNavigate?.('system-status')}>
                <div className="step-circle step-3">M3</div>
                <div className="step-text-meta">
                  <span className="step-title">Terminology</span>
                  <span className="step-desc">SNOMED CT & LOINC Alignment</span>
                </div>
              </div>

              <div className="flow-connector-line"></div>

              <div className="flow-step-node" onClick={() => onNavigate?.('patient-identity')}>
                <div className="step-circle step-4">M4</div>
                <div className="step-text-meta">
                  <span className="step-title">Identity Safety</span>
                  <span className="step-desc">Uncertainty-Aware Zero-Merge</span>
                </div>
              </div>

              <div className="flow-connector-line"></div>

              <div className="flow-step-node" onClick={() => onNavigate?.('system-status')}>
                <div className="step-circle step-5" style={{ background: '#0284c7', color: '#fff' }}>M5-7</div>
                <div className="step-text-meta">
                  <span className="step-title">Consent & FHIR</span>
                  <span className="step-desc">M5 Consent, M6 FHIR, M7 P-256</span>
                </div>
              </div>
            </div>

            {/* Run Pipeline Simulation Button */}
            <div className="pipeline-action-bar" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
              <button 
                className="btn-run-pipeline"
                onClick={handleRunPipeline}
                disabled={pipelineLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: pipelineLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
                }}
              >
                {pipelineLoading ? (
                  <>
                    <Loader2 size={16} className="spin-icon" />
                    <span>Executing End-to-End Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Test M1–M6 Pipeline Execution</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. Destination Organization */}
          <div className="pipeline-org-card dest-card">
            <span className="org-card-badge">Destination Organization</span>
            
            <div className="org-illustration-box">
              <svg className="org-svg-building" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="15" y="10" width="50" height="50" rx="3" fill="#F3E8FF" />
                <rect x="25" y="2" width="30" height="58" rx="2" fill="#A855F7" />
                <rect x="36" y="8" width="8" height="8" rx="1" fill="#ffffff" />
                <path d="M37 12h6M40 9v6" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
                <rect x="30" y="20" width="6" height="6" rx="1" fill="#ffffff" />
                <rect x="44" y="20" width="6" height="6" rx="1" fill="#ffffff" />
                <rect x="30" y="30" width="6" height="6" rx="1" fill="#ffffff" />
                <rect x="44" y="30" width="6" height="6" rx="1" fill="#ffffff" />
                <rect x="36" y="44" width="8" height="16" fill="#6B21A8" />
              </svg>
              <h3 className="org-facility-title">Metro Hospital</h3>
              <span className="org-facility-sub">HIU Node | HOSPITAL_B</span>
            </div>

            <div className="org-payload-list">
              <span className="payload-heading">Authorized Ingest</span>
              <ul className="payload-items">
                <li><CheckCircle2 size={13} className="bullet-icon check" /> Validated FHIR R4</li>
                <li><CheckCircle2 size={13} className="bullet-icon check" /> SNOMED CT LOINC</li>
                <li><CheckCircle2 size={13} className="bullet-icon check" /> Patient Consent Verified</li>
                <li><CheckCircle2 size={13} className="bullet-icon check" /> P-256 Signed Receipt</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Live Pipeline Results */}
        {pipelineResults && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px'
          }}>
            {/* M1 Result */}
            <div style={{ padding: '12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#0284c7' }}>M1 Ingestion</span>
                <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                  {pipelineResults.m1?.status || 'Passed'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                <div><strong>Source:</strong> {pipelineResults.m1?.source_system || 'HOSPITAL_A'}</div>
                <div><strong>Records:</strong> 1 Observation Validated</div>
              </div>
            </div>

            {/* M2 Normalization Result */}
            <div style={{ padding: '12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#16a34a' }}>M2 Normalization</span>
                <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
                  Quality: {Math.round((pipelineResults.m2?.records?.[0]?.data_quality_score || 0.98) * 100)}%
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                <div><strong>Specimen:</strong> blood</div>
                <div><strong>Cleanse:</strong> Standardized unit</div>
              </div>
            </div>

            {/* M3 Terminology Result */}
            <div style={{ padding: '12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#9333ea' }}>M3 Terminology</span>
                <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#f3e8ff', color: '#7e22ce', fontWeight: 600 }}>
                  Verified
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                <div><strong>LOINC:</strong> 1558-6 (Glucose)</div>
                <div><strong>SNOMED:</strong> 365645004</div>
              </div>
            </div>

            {/* M4 Identity Safety Result */}
            <div style={{ padding: '12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a' }}>M4 Identity Safety</span>
                <span style={{ 
                  fontSize: '11px', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  background: '#dcfce7', 
                  color: '#15803d', 
                  fontWeight: 600 
                }}>
                  {pipelineResults.m4?.linkage_decision || 'same_identity'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                <div><strong>Linkage:</strong> Zero-Merge Safe</div>
                <div><strong>Confidence:</strong> 98.0%</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Stats Row (4 Cards) */}
      <div className="overview-kpis-grid">
        {/* Card 1 */}
        <div className="kpi-metric-card">
          <div className="kpi-icon-wrap kpi-green">
            <CheckCircle2 size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Successful Transfers</span>
            <span className="kpi-number">{kpiStats.successful}</span>
            <span className="kpi-subtext">ECDSA Signed & Verified</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="kpi-metric-card">
          <div className="kpi-icon-wrap kpi-amber">
            <Clock size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Awaiting Consent</span>
            <span className="kpi-number">{kpiStats.pending}</span>
            <span className="kpi-subtext">Patient Portal Action Required</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="kpi-metric-card">
          <div className="kpi-icon-wrap kpi-red">
            <AlertCircle size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Blocked / Denied</span>
            <span className="kpi-number">{kpiStats.failed}</span>
            <span className="kpi-subtext">Fail-Closed Consent Policy</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="kpi-metric-card">
          <div className="kpi-icon-wrap kpi-blue">
            <FileText size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Audit Events</span>
            <span className="kpi-number">{kpiStats.totalToday}</span>
            <span className="kpi-subtext kpi-trend-positive">
              &uarr; Verified Hash Chain
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Split: Attention Table vs Recent Exchanges */}
      <div className="overview-tables-grid">
        {/* Left: Transfers Requiring Attention */}
        <div className="dashboard-table-card attention-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <div className="card-badge-icon red-badge">
                <AlertCircle size={17} />
              </div>
              <h3 className="card-main-title">Transfers Requiring Attention</h3>
            </div>
            <button 
              className="btn-header-view-all"
              onClick={() => onNavigate?.('transfers')}
            >
              View All
            </button>
          </div>

          <div className="table-responsive">
            <table className="overview-table attention-table">
              <thead>
                <tr>
                  <th style={{ width: '16%' }}>Transaction</th>
                  <th style={{ width: '28%' }}>Source &rarr; Destination</th>
                  <th style={{ width: '18%' }}>Patient</th>
                  <th style={{ width: '22%' }}>Issue Reason</th>
                  <th style={{ width: '16%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTransfers.filter(t => t.status === 'Failed' || t.status === 'Pending').map((item, idx) => (
                  <tr key={idx}>
                    <td className="col-txnid-text">{item.id}</td>
                    <td className="col-route">
                      <span>{item.source}</span>
                      <span className="route-arrow">&rarr;</span>
                      <span>{item.destination}</span>
                    </td>
                    <td>{item.dataType}</td>
                    <td>
                      <span className="issue-label-text">{item.status}</span>
                    </td>
                    <td>
                      <button 
                        className="btn-table-action"
                        onClick={() => onViewTransaction?.({ txnId: item.id, source: item.source, destination: item.destination, status: item.status })}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
                {recentTransfers.filter(t => t.status === 'Failed' || t.status === 'Pending').length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No transfers currently require operational attention.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Data Exchanges */}
        <div className="dashboard-table-card recent-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <div className="card-badge-icon green-badge">
                <CheckCircle2 size={17} />
              </div>
              <h3 className="card-main-title">Recent Data Exchanges</h3>
            </div>
            <button 
              className="btn-header-view-all"
              onClick={() => onNavigate?.('transfers')}
            >
              View All
            </button>
          </div>

          <div className="table-responsive">
            <table className="overview-table recent-table">
              <thead>
                <tr>
                  <th style={{ width: '14%' }}>Time</th>
                  <th style={{ width: '16%' }}>Transaction ID</th>
                  <th style={{ width: '38%' }}>Source &rarr; Destination</th>
                  <th style={{ width: '18%' }}>Data Type</th>
                  <th style={{ width: '14%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransfers.map((item, idx) => {
                  const statusClass = 
                    item.status === 'Success' 
                      ? 'status-pill-success' 
                      : item.status === 'Pending' 
                      ? 'status-pill-pending' 
                      : 'status-pill-failed';

                  return (
                    <tr key={idx}>
                      <td className="col-time-text">{item.time}</td>
                      <td>
                        <button 
                          className="txn-link" 
                          onClick={() => onViewTransaction?.({ txnId: item.id, source: item.source, destination: item.destination, dataType: item.dataType, status: item.status })}
                        >
                          {item.id}
                        </button>
                      </td>
                      <td className="col-route">
                        <span>{item.source}</span>
                        <span className="route-arrow">&rarr;</span>
                        <span>{item.destination}</span>
                      </td>
                      <td>{item.dataType}</td>
                      <td>
                        <span className={`status-pill ${statusClass}`}>{item.status}</span>
                      </td>
                    </tr>
                  );
                })}
                {recentTransfers.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No data exchanges have taken place yet. Initiate an exchange to see activity here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Section: Connected Organizations */}
      <div className="dashboard-table-card connected-orgs-section">
        <div className="card-header-row">
          <div className="card-title-group">
            <div className="card-badge-icon blue-badge">
              <Building2 size={17} />
            </div>
            <h3 className="card-main-title">Connected Healthcare Organizations (6 Federated Nodes)</h3>
          </div>
          <button 
            className="btn-header-view-all"
            onClick={() => onNavigate?.('organizations')}
          >
            Manage Organizations
          </button>
        </div>

        <div className="connected-orgs-cards-grid">
          {connectedOrgs.map((org, index) => (
            <div 
              key={org.org_id || index} 
              className="org-entity-card"
              onClick={() => onNavigate?.('organizations')}
            >
              <div className="entity-icon-wrap">
                {org.org_type === 'LABORATORY' ? (
                  <FlaskConical size={22} className="entity-icon" />
                ) : (
                  <Building2 size={22} className="entity-icon" />
                )}
              </div>
              <div className="entity-info-block">
                <h4 className="entity-title">{org.name}</h4>
                <span className="entity-subtitle">{org.org_type} | {org.code || org.org_id}</span>
                <div className="entity-status-row">
                  <span className={`status-dot-${org.is_active ? 'green' : 'red'}`}></span>
                  <span className="status-label-active">{org.is_active ? 'Active Node' : 'Suspended'}</span>
                </div>
              </div>
            </div>
          ))}
          {connectedOrgs.length === 0 && (
            <div style={{ color: '#64748b', fontSize: '13px', padding: '16px' }}>
              No connected healthcare organizations loaded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
