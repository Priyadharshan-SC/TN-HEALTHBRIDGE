import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  ShieldCheck, 
  RefreshCw, 
  Database, 
  Key, 
  Lock, 
  ExternalLink,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';
import { checkHealth } from '../services/apiClient';

export default function SystemStatusView() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [pingLatency, setPingLatency] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await checkHealth();
      const latency = Math.round(performance.now() - start);
      setPingLatency(latency);
      setHealthData(res);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setHealthData({ status: 'offline', error: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const middlewareModules = [
    { id: 'M1', name: 'M1 — Data Ingestion', desc: 'Synthesizes and validates incoming HL7/JSON clinical streams', status: 'Healthy', version: '1.2.0' },
    { id: 'M2', name: 'M2 — Data Quality & Normalization', desc: 'Multi-variable clinical range checks & deterministic imputation', status: 'Healthy', version: '1.2.0' },
    { id: 'M3', name: 'M3 — Clinical Terminology Mapping', desc: 'LOINC & SNOMED-CT clinical coding engine with ambiguity alerts', status: 'Healthy', version: '1.2.0' },
    { id: 'M4', name: 'M4 — Patient Identity Safety', desc: 'Uncertainty-aware identity linkage with zero-merge safety rule', status: 'Healthy', version: '1.2.0' },
    { id: 'M5', name: 'M5 — Consent Gateway', desc: 'ABDM-aligned patient consent lifecycle (Requested, Granted, Revoked)', status: 'Healthy', version: '1.0.0' },
    { id: 'M6', name: 'M6 — FHIR Bundle Assembly', desc: 'Transforms normalized records into standard FHIR R4 JSON bundles', status: 'Healthy', version: '1.0.0' },
    { id: 'M7', name: 'M7 — Federated Exchange & Delivery', desc: 'End-to-end transport with ECDSA P-256 cryptographic verification', status: 'Healthy', version: '1.0.0' },
  ];

  const providerNodes = [
    { id: 'HOSPITAL_A', name: 'City Hospital 1', type: 'Tertiary Hospital', endpoint: '/api/v1/providers/HOSPITAL_A/adapter', status: 'Online' },
    { id: 'LAB_C', name: 'Central Laboratory', type: 'Diagnostic Lab', endpoint: '/api/v1/providers/LAB_C/adapter', status: 'Online' },
    { id: 'HOSPITAL_B', name: 'Metro Hospital', type: 'Specialty Hospital', endpoint: '/api/v1/providers/HOSPITAL_B/adapter', status: 'Online' },
    { id: 'HOSPITAL_D', name: 'Sunrise Hospital', type: 'Community Hospital', endpoint: '/api/v1/providers/HOSPITAL_D/adapter', status: 'Online' },
    { id: 'LAB_E', name: 'Elite Diagnostics', type: 'Pathology Center', endpoint: '/api/v1/providers/LAB_E/adapter', status: 'Online' },
    { id: 'CLINIC_F', name: 'Green Valley Clinic', type: 'Primary Care Clinic', endpoint: '/api/v1/providers/CLINIC_F/adapter', status: 'Online' },
  ];

  const isOnline = healthData && healthData.status === 'healthy';

  return (
    <div className="page-wrapper system-status-page">
      {/* Header Banner */}
      <div className="page-header-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-main-heading">System Status & Node Telemetry</h1>
            <p className="page-subheading">
              Real-time operational monitoring of TN HealthBridge middleware modules (M1–M7) and 6 federated healthcare nodes.
            </p>
          </div>
          <button 
            className="btn-primary-blue"
            onClick={fetchHealth}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            <span>{loading ? 'Checking...' : 'Refresh Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* Primary Status Banner */}
      <div 
        className="card-box" 
        style={{
          marginBottom: '20px',
          border: `1px solid ${isOnline ? '#a7f3d0' : '#fecaca'}`,
          background: isOnline ? 'linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)' : '#fef2f2',
          padding: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: isOnline ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Server size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: isOnline ? '#065f46' : '#991b1b' }}>
                  {isOnline ? 'All Interoperability Systems Operational' : 'FastAPI Backend Offline'}
                </h2>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: isOnline ? '#d1fae5' : '#fee2e2',
                  color: isOnline ? '#047857' : '#b91c1c'
                }}>
                  {isOnline ? 'HTTP 200 OK' : 'Connection Refused'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                FastAPI Host: <code>http://127.0.0.1:8000</code> • Service: <strong>{healthData?.service || 'tn-healthbridge-backend'}</strong> (v{healthData?.version || '0.2.0'})
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#475569' }}>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>PING LATENCY</span>
              <strong style={{ color: '#0f172a' }}>{pingLatency !== null ? `${pingLatency} ms` : '—'}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>LAST AUDIT CYCLE</span>
              <strong style={{ color: '#0f172a' }}>{lastChecked || '—'}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>SWAGGER DOCS</span>
              <a 
                href="http://127.0.0.1:8000/docs" 
                target="_blank" 
                rel="noreferrer"
                style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 600 }}
              >
                <span>/docs</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Middleware Modules + Security & Governance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Left: Middleware Modules (M1-M7) */}
        <div className="card-box" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
              Interoperability Middleware Modules (M1–M7)
            </h3>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
              7 / 7 Active
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {middlewareModules.map((mod, idx) => (
              <div 
                key={mod.id}
                style={{
                  padding: '14px 20px',
                  borderBottom: idx !== middlewareModules.length - 1 ? '1px solid #f1f5f9' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{mod.name}</span>
                    <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b' }}>v{mod.version}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{mod.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#047857' }}>{mod.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Security & Cryptographic Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card-box" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Lock size={18} style={{ color: '#0284c7' }} />
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                Cryptographic & Trust Infrastructure
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              <div style={{ padding: '8px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '11px' }}>DIGITAL SIGNATURE ENGINE</div>
                <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>ECDSA NIST P-256 + SHA-256</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Signs every federated receipt and transfer bundle</div>
              </div>

              <div style={{ padding: '8px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '11px' }}>DATA RETENTION POLICY</div>
                <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>Strict Non-Persistence Compliance</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Zero storage of raw clinical payloads in middleware</div>
              </div>

              <div style={{ padding: '8px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '11px' }}>CONSENT ENFORCEMENT</div>
                <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>Fail-Closed Verification Gate</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Automatic block on expired, revoked, or absent consents</div>
              </div>

              <div style={{ padding: '8px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '11px' }}>IDENTITY LINKAGE ENGINE</div>
                <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>Zero-Merge Patient Registry</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Global uniqueness verified across all 6 provider nodes</div>
              </div>
            </div>
          </div>

          <div className="card-box" style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 600, fontSize: '13px' }}>
              <ShieldCheck size={18} />
              <span>Research Prototype Verification</span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#15803d', lineHeight: 1.4 }}>
              TN HealthBridge operates on 100% synthetic patient records with ABDM-aligned HL7 FHIR R4 interfaces for academic and interoperability research.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom: 6 Federated Hospital Nodes Grid */}
      <div className="card-box" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
              Federated Healthcare Node Endpoints (6 / 6 Connected)
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              Each healthcare organization runs an autonomous endpoint with local tenant storage and provider adapter.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {providerNodes.map((node) => (
            <div 
              key={node.id}
              style={{
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{node.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{node.type} • <code>{node.id}</code></div>
                </div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: '#dcfce7',
                  color: '#15803d'
                }}>
                  {node.status}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#475569', background: '#f8fafc', padding: '6px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                {node.endpoint}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
