import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Send,
  Building2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Activity,
  FileCheck2,
  Info,
  ArrowRight
} from 'lucide-react';
import { useHospital } from '../../layouts/HospitalLayout';
import { HOSPITALS } from '../../config/providers';
import {
  createDynamicConsentRequest,
  executeFederatedExchange
} from '../../services/apiClient';

export default function HospitalExchangeRequestsView() {
  const [searchParams] = useSearchParams();
  const prefilledUpid = searchParams.get('upid') || '';

  const { hospital, allPatients = [], setFeedback } = useHospital();

  const otherHospitals = HOSPITALS.filter((h) => h.id !== hospital?.id);

  const [form, setForm] = useState({
    source_provider_id: otherHospitals[0]?.id || 'HOSPITAL_A',
    universal_patient_id: prefilledUpid || (allPatients[0]?.universal_patient_id || ''),
    consent_id: '',
    purpose: 'Care Management and Consultation',
  });

  const [loading, setLoading] = useState(false);
  const [exchangeResult, setExchangeResult] = useState(null);

  const selectedPatientObj = (allPatients || []).find(
    (p) => p.universal_patient_id === form.universal_patient_id
  );

  const handleSelectPatient = (targetUpid) => {
    const pt = (allPatients || []).find((p) => p.universal_patient_id === targetUpid);
    let autoSource = form.source_provider_id;
    if (pt && pt.mappings && pt.mappings.length > 0) {
      const otherMapping = pt.mappings.find((m) => m.provider_id !== hospital?.id);
      if (otherMapping) {
        autoSource = otherMapping.provider_id;
      }
    }
    setForm((prev) => ({
      ...prev,
      universal_patient_id: targetUpid,
      source_provider_id: autoSource,
      consent_id: '',
    }));
  };

  // Synchronize initial patient selection once allPatients finishes loading
  useEffect(() => {
    if (!form.universal_patient_id && allPatients && allPatients.length > 0) {
      const defaultUpid = prefilledUpid || allPatients[0].universal_patient_id;
      handleSelectPatient(defaultUpid);
    }
  }, [allPatients, prefilledUpid]);

  const handleDispatchConsent = async () => {
    if (!form.universal_patient_id) {
      setFeedback({ type: 'error', text: 'Please specify a Universal Patient ID.' });
      return;
    }
    setLoading(true);
    try {
      const consentRec = await createDynamicConsentRequest(
        form.source_provider_id,
        hospital.id,
        form.universal_patient_id,
        form.purpose
      );
      const cid = consentRec.artefact.consent_id;
      setForm((prev) => ({ ...prev, consent_id: cid }));
      setFeedback({
        type: 'success',
        text: `Consent request '${cid}' dispatched to patient (${form.universal_patient_id}). Patient can now grant it in their Patient Portal.`
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to dispatch consent request' });
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteExchange = async (e) => {
    e.preventDefault();
    if (!form.consent_id) {
      setFeedback({
        type: 'error',
        text: 'An authorizing ABDM consent ID is required. Click "Request Consent from Patient Now" or provide a valid consent.'
      });
      return;
    }
    setLoading(true);
    setExchangeResult(null);
    try {
      const res = await executeFederatedExchange({
        source_provider_id: form.source_provider_id,
        destination_provider_id: hospital.id,
        universal_patient_id: form.universal_patient_id,
        consent_id: form.consent_id,
        purpose: form.purpose,
      });
      setExchangeResult(res);
      setFeedback({
        type: 'success',
        text: `Exchange executed successfully! Data delivered to ${hospital.name} inbox.`
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Federated exchange failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
      {/* Exchange Form Card */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Send size={18} color="#0284c7" />
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
            Initiate Federated Data Request
          </h3>
        </div>
        <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#64748b' }}>
          Request diagnostic records from another healthcare provider into {hospital.name}'s workspace under patient consent.
        </p>

        <form onSubmit={handleExecuteExchange}>
          {/* Source Provider */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
              Source Provider (Hospital Holding the Records)
            </label>
            <select
              value={form.source_provider_id}
              onChange={(e) => setForm({ ...form, source_provider_id: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            >
              {otherHospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.iconEmoji} {h.name} — {h.officialName} ({h.code})
                </option>
              ))}
            </select>
          </div>

          {/* Universal Patient ID */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
              Universal Patient ID (UPID)
            </label>
            {(allPatients || []).length > 0 ? (
              <select
                value={form.universal_patient_id}
                onChange={(e) => handleSelectPatient(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', marginBottom: '6px' }}
                required
              >
                {(allPatients || []).map((p) => (
                  <option key={p.universal_patient_id} value={p.universal_patient_id}>
                    {p.full_name} ({p.universal_patient_id})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="e.g. UPID-ARUN-001"
                value={form.universal_patient_id}
                onChange={(e) => handleSelectPatient(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                required
              />
            )}
            {selectedPatientObj?.mappings?.length > 0 && (
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700 }}>Known EHR Locations:</span>
                {selectedPatientObj.mappings.map((m) => (
                  <span key={m.provider_id} style={{ background: '#ffffff', border: '1px solid #7dd3fc', borderRadius: '4px', padding: '2px 8px', fontWeight: 600 }}>
                    {m.provider_name || m.provider_id} (ID: {m.local_patient_id})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Consent ID & Quick Dynamic Dispatch */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                ABDM Authorizing Consent Reference
              </label>
              <button
                type="button"
                onClick={handleDispatchConsent}
                disabled={loading}
                style={{
                  padding: '3px 8px',
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
                <Send size={10} /> Request Consent from Patient Now
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. CONSENT-REQ-XXXX (or click 'Request Consent from Patient Now')"
              value={form.consent_id}
              onChange={(e) => setForm({ ...form, consent_id: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
              required
            />
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '3px' }}>
              Clicking &quot;Request Consent from Patient Now&quot; sends an authentic consent request to the patient portal.
            </span>
          </div>

          {/* Clinical Purpose */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
              Clinical Purpose
            </label>
            <input
              type="text"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '6px',
              background: '#0284c7',
              color: '#ffffff',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Send size={15} />
            <span>{loading ? 'Orchestrating M1–M7 Exchange...' : 'Execute Federated Exchange'}</span>
          </button>
        </form>
      </div>

      {/* Info & Results Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
            Federated Interoperability Protocol Guarantees
          </h4>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>
            <li>Resolves Universal Patient ID (UPID) to source hospital's local patient reference.</li>
            <li>Enforces ABDM release gates (checks that consent is in GRANTED status and not revoked).</li>
            <li>Pulls clinical records live on-the-fly via source provider adapter.</li>
            <li>Standardizes diagnostic records into a FHIR R4 document bundle.</li>
            <li>Delivers signed payload directly into destination hospital inbox.</li>
            <li><strong>Zero Central Persistence:</strong> Raw clinical payloads are immediately discarded from middleware.</li>
          </ul>
        </div>

        {exchangeResult && (
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #86efac',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <strong style={{ fontSize: '14.5px', color: '#15803d' }}>
                  Federated Exchange Completed & Verified
                </strong>
              </div>
              <Link
                to={`/hospital/${hospital.slug}/inbox`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: '#15803d',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <span>Open in Delivery Inbox</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
              <div><strong>Job ID:</strong> <code>{exchangeResult.job?.job_id}</code></div>
              <div><strong>Status:</strong> <span style={{ padding: '2px 6px', background: '#dcfce7', color: '#15803d', borderRadius: '4px', fontWeight: 700 }}>{exchangeResult.job?.status}</span></div>
              <div><strong>Receipt ID:</strong> <code>{exchangeResult.receipt?.receipt_id}</code></div>
              <div><strong>SHA-256 Digest:</strong> <code style={{ fontSize: '11px', color: '#0369a1' }}>{exchangeResult.receipt?.payload_digest}</code></div>
            </div>

            {exchangeResult.job?.delivered_records && exchangeResult.job.delivered_records.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Received Clinical Observations ({exchangeResult.job.delivered_records.length}):
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>Test Name</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>Result</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>Interpretation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exchangeResult.job.delivered_records.map((r, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 600 }}>{r.test_name}</td>
                          <td style={{ padding: '6px 10px', color: '#0369a1', fontWeight: 700 }}>{r.value} {r.unit}</td>
                          <td style={{ padding: '6px 10px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '10.5px', fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>
                              {r.interpretation || 'Normal'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

