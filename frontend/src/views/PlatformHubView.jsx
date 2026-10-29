import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  User,
  Building2,
  Activity,
  ArrowRight,
  Database,
  Lock,
  Share2,
  FileText,
  CheckCircle2,
  Server
} from 'lucide-react';
import { HOSPITALS } from '../config/providers';

export default function PlatformHubView() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b' }}>
      {/* Top Banner */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
          }}>
            <Activity size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
              TN HealthBridge
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              Tamil Nadu Federated Healthcare Interoperability Network
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: '20px',
            background: '#f0fdf4',
            color: '#15803d',
            border: '1px solid #bbf7d0'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
            M1–M7 Middleware Active
          </span>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: '20px',
            background: '#f1f5f9',
            color: '#475569',
            border: '1px solid #e2e8f0'
          }}>
            ABDM R4 Federated Core
          </span>
        </div>
      </header>

      {/* Main Content Hero */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 48px auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#e0f2fe',
            color: '#0369a1',
            padding: '5px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: '16px',
            border: '1px solid #bae6fd'
          }}>
            <Server size={14} />
            Unified Healthcare Interoperability Platform Architecture
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>
            Select Portal Workspace
          </h2>
          <p style={{ fontSize: '15px', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
            TN HealthBridge operates separate, dedicated portals for platform administrators, patients, and individual healthcare providers—powered by a single federated backend and zero-central-persistence interoperability core.
          </p>
        </div>

        {/* 3 Main Experience Categories */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          {/* Card 1: Admin Portal */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '30px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}>
            <div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px'
              }}>
                <Shield size={24} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                  Platform Admin Portal
                </h3>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#475569' }}>
                  /admin
                </span>
              </div>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>
                Central command for state healthcare interoperability: monitor 6 provider nodes, verify universal patient identity mappings, inspect ABDM consents, audit transfers, and govern organizations.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', fontSize: '12.5px', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#0284c7" />
                  <span>Statewide System Overview & Activity Metrics</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#0284c7" />
                  <span>Universal Identity Mapping & Conflict Resolution</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#0284c7" />
                  <span>Transfer History, Receipts & Tamper-Proof Audit Logs</span>
                </div>
              </div>
            </div>

            <Link
              to="/admin/overview"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '8px',
                background: '#0f172a',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'background 0.15s ease'
              }}
            >
              <span>Launch Admin Portal</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Card 2: Patient Portal */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '30px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}>
            <div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: '#0284c7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px'
              }}>
                <User size={24} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                  Universal Patient Portal
                </h3>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#475569' }}>
                  /patient
                </span>
              </div>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>
                Patient-controlled health record access and consent management: view records aggregated on-the-fly from connected hospitals, grant or deny cross-hospital requests, and revoke authorizations in real-time.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', fontSize: '12.5px', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#0284c7" />
                  <span>Dynamic Consent Approval, Denial & Revocation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#0284c7" />
                  <span>On-Demand Live Clinical Records & Diagnostics</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#0284c7" />
                  <span>Connected Hospitals Directory & Sharing Audits</span>
                </div>
              </div>
            </div>

            <Link
              to="/patient/overview"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '8px',
                background: '#0284c7',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'background 0.15s ease'
              }}
            >
              <span>Launch Patient Portal</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Card 3: Hospital Overview */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '30px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}>
            <div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: '#059669',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px'
              }}>
                <Building2 size={24} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                  Hospital Portals (6 Nodes)
                </h3>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#475569' }}>
                  /hospital/:provider
                </span>
              </div>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>
                Dedicated hospital and laboratory interfaces with distinct provider boundaries: manage local patient intake, record lab reports (Sugar, TB, BP, Dengue, Malaria), and initiate federated transfers.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', fontSize: '12.5px', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#059669" />
                  <span>Isolated Local Patient Repositories</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#059669" />
                  <span>Dynamic Cross-Hospital Identity Synchronization</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#059669" />
                  <span>FHIR R4 Exchange Orchestration & Verified Delivery Inbox</span>
                </div>
              </div>
            </div>

            <Link
              to="/hospital/city-hospital-1/overview"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '8px',
                background: '#059669',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'background 0.15s ease'
              }}
            >
              <span>Launch City Hospital 1</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Section: 6 Independent Healthcare Provider Websites */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Federated Healthcare Facilities
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                Each facility operates with an independent URL, isolated local clinical store, and dedicated access boundary.
              </p>
            </div>
            <span style={{ fontSize: '12px', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
              6 Registered Nodes Active
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {HOSPITALS.map((hosp) => (
              <Link
                key={hosp.id}
                to={`/hospital/${hosp.slug}/overview`}
                style={{
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = hosp.badgeColor;
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>{hosp.iconEmoji}</span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                          {hosp.name}
                        </h4>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{hosp.location}</span>
                      </div>
                    </div>
                    <code style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#e2e8f0', color: '#334155', fontWeight: 700 }}>
                      {hosp.code}
                    </code>
                  </div>
                  <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                    {hosp.description}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <span style={{ fontWeight: 600, color: hosp.badgeColor }}>{hosp.typeLabel}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0284c7', fontWeight: 600 }}>
                    Enter Portal <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        color: '#94a3b8',
        fontSize: '12.5px',
        borderTop: '1px solid #e2e8f0',
        background: '#ffffff'
      }}>
        Tamil Nadu Health Systems Project (TNHSP) &bull; ABDM FHIR R4 Compliant Federated Health Information Exchange
      </footer>
    </div>
  );
}

