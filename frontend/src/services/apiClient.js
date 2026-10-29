/**
 * TN HealthBridge Complete API Client
 * Fully connects Administrative Portal, Patient Portal, and Federated Hospital Systems
 * with the FastAPI backend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeaders(token = null) {
  const headers = { 'Content-Type': 'application/json' };
  const storedToken = token || localStorage.getItem('tn_token');
  if (storedToken) {
    headers['Authorization'] = `Bearer ${storedToken}`;
  }
  return headers;
}

/**
 * Health check endpoint
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
}

/**
 * Login / Authentication
 */
export async function loginUser(username, password) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Login failed');
  }
  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem('tn_token', data.access_token);
    localStorage.setItem('tn_user', JSON.stringify(data));
  }
  return data;
}

// ============================================================================
// Organizations & User Management
// ============================================================================

export async function listOrganizations() {
  const res = await fetch(`${BASE_URL}/api/v1/organizations`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load organizations');
  return await res.json();
}

export async function getOrganization(orgId) {
  const res = await fetch(`${BASE_URL}/api/v1/organizations/${orgId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Organization '${orgId}' not found`);
  return await res.json();
}

export async function createOrganization(payload) {
  const res = await fetch(`${BASE_URL}/api/v1/organizations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create organization');
  }
  return await res.json();
}

export async function updateOrganization(orgId, payload) {
  const res = await fetch(`${BASE_URL}/api/v1/organizations/${orgId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update organization');
  return await res.json();
}

export async function toggleOrganizationStatus(orgId) {
  const res = await fetch(`${BASE_URL}/api/v1/organizations/${orgId}/toggle-status`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to toggle organization status');
  return await res.json();
}

export async function listOrganizationUsers(orgId) {
  const res = await fetch(`${BASE_URL}/api/v1/organizations/${orgId}/users`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load organization users');
  return await res.json();
}

export async function createOrganizationUser(orgId, payload) {
  const res = await fetch(`${BASE_URL}/api/v1/organizations/${orgId}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create user');
  }
  return await res.json();
}

// ============================================================================
// Universal Patient Identity & Mappings (Phase 4)
// ============================================================================

export async function listUniversalPatients(search = '', providerId = '') {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (providerId && providerId !== 'All Organizations') params.append('provider_id', providerId);

  const res = await fetch(`${BASE_URL}/api/v1/identity/patients?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load patients');
  return await res.json();
}

export async function getUniversalPatient(upid) {
  const res = await fetch(`${BASE_URL}/api/v1/identity/patients/${upid}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Patient '${upid}' not found`);
  return await res.json();
}

export async function createUniversalPatient(payload) {
  const res = await fetch(`${BASE_URL}/api/v1/identity/patients`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to register universal patient');
  return await res.json();
}

export async function addProviderMapping(payload) {
  const res = await fetch(`${BASE_URL}/api/v1/identity/mappings`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to add provider mapping');
  }
  return await res.json();
}

export async function mergeUniversalPatients(payload) {
  const res = await fetch(`${BASE_URL}/api/v1/identity/merge`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to merge patient identities');
  }
  return await res.json();
}


export async function resolveIdentity(sourceProviderId, sourcePatientId, targetProviderId) {
  const res = await fetch(`${BASE_URL}/api/v1/identity/resolve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      source_provider_id: sourceProviderId,
      source_patient_id: sourcePatientId,
      target_provider_id: targetProviderId,
    }),
  });
  if (!res.ok) throw new Error('Identity resolution failed');
  return await res.json();
}

export async function assessIdentity(referenceA, referenceB, identityToken = null) {
  const res = await fetch(`${BASE_URL}/api/v1/identity/assess`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      reference_a: referenceA,
      reference_b: referenceB,
      identity_token: identityToken,
    }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.detail || `Identity assessment failed (${res.status})`);
  }
  return await res.json();
}

// ============================================================================
// Transfer Management & Federated Exchange (Phases 3, 9, 10, 11)
// ============================================================================

export async function listTransfers({
  startDate = '',
  endDate = '',
  sourceOrg = '',
  destOrg = '',
  status = '',
  search = '',
  page = 1,
  pageSize = 10,
} = {}) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (sourceOrg && sourceOrg !== 'All Organizations') params.append('source_org', sourceOrg);
  if (destOrg && destOrg !== 'All Organizations') params.append('dest_org', destOrg);
  if (status && status !== 'All Statuses') params.append('status', status);
  if (search) params.append('search', search);
  params.append('page', page);
  params.append('page_size', pageSize);

  const res = await fetch(`${BASE_URL}/api/v1/exchange/transfers?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load transfers');
  return await res.json();
}

export async function executeFederatedExchange(payload) {
  const res = await fetch(`${BASE_URL}/api/v1/exchange/federated-exchange`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Federated exchange failed');
  }
  return await res.json();
}

export async function downloadReceipt(jobId) {
  const res = await fetch(`${BASE_URL}/api/v1/exchange/transfers/${jobId}/download-receipt`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to download receipt');
  return await res.json();
}

// ============================================================================
// Patient Portal (Phase 7)
// ============================================================================

export async function listAllPortalPatients() {
  const res = await fetch(`${BASE_URL}/api/v1/patient/all-patients`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load registered patients list');
  return await res.json();
}

export async function createDynamicConsentRequest(sourceProviderId, recipientProviderId, universalPatientId, purpose = 'Care Management and Consultation') {
  const params = new URLSearchParams({
    source_provider_id: sourceProviderId,
    recipient_provider_id: recipientProviderId,
    universal_patient_id: universalPatientId,
    purpose,
  });
  const res = await fetch(`${BASE_URL}/api/v1/patient/consent-requests?${params.toString()}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to dispatch dynamic consent request');
  }
  return await res.json();
}

export async function getPatientProfile(upid = null) {
  const url = upid ? `${BASE_URL}/api/v1/patient/profile?upid=${encodeURIComponent(upid)}` : `${BASE_URL}/api/v1/patient/profile`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load patient profile');
  return await res.json();
}

export async function listAllConsents() {
  const res = await fetch(`${BASE_URL}/api/v1/gateway/consents`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load consents from gateway');
  return await res.json();
}

export async function listPatientConsents(upid = null) {
  const url = upid ? `${BASE_URL}/api/v1/patient/consents?upid=${encodeURIComponent(upid)}` : `${BASE_URL}/api/v1/patient/consents`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load patient consents');
  return await res.json();
}

export async function decidePatientConsent(consentId, decision, reason = '', upid = null) {
  const url = upid 
    ? `${BASE_URL}/api/v1/patient/consents/${consentId}/decide?upid=${encodeURIComponent(upid)}`
    : `${BASE_URL}/api/v1/patient/consents/${consentId}/decide`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ decision, reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to submit consent decision');
  }
  return await res.json();
}

export async function revokePatientConsent(consentId, reason = '', upid = null) {
  const url = upid
    ? `${BASE_URL}/api/v1/patient/consents/${consentId}/revoke?upid=${encodeURIComponent(upid)}`
    : `${BASE_URL}/api/v1/patient/consents/${consentId}/revoke`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to revoke consent');
  }
  return await res.json();
}

export async function getPatientHospitals(upid = null) {
  const url = upid ? `${BASE_URL}/api/v1/patient/hospitals?upid=${encodeURIComponent(upid)}` : `${BASE_URL}/api/v1/patient/hospitals`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load connected hospitals');
  return await res.json();
}

export async function getPatientRecords(upid = null) {
  const url = upid ? `${BASE_URL}/api/v1/patient/records?upid=${encodeURIComponent(upid)}` : `${BASE_URL}/api/v1/patient/records`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load patient records');
  return await res.json();
}

export async function getPatientSharingHistory(upid = null) {
  const url = upid ? `${BASE_URL}/api/v1/patient/sharing-history?upid=${encodeURIComponent(upid)}` : `${BASE_URL}/api/v1/patient/sharing-history`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load sharing history');
  return await res.json();
}

// ============================================================================
// Federated Provider Applications (Phase 8)
// ============================================================================

export async function listProviderPatients(providerId) {
  const res = await fetch(`${BASE_URL}/api/v1/providers/${providerId}/patients`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load patients for provider ${providerId}`);
  return await res.json();
}

export async function registerProviderPatient(providerId, payload) {
  const res = await fetch(`${BASE_URL}/api/v1/providers/${providerId}/patients`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to register patient at provider');
  return await res.json();
}

export async function listProviderRecords(providerId, localPatientId = null) {
  const url = localPatientId
    ? `${BASE_URL}/api/v1/providers/${providerId}/records?local_patient_id=${localPatientId}`
    : `${BASE_URL}/api/v1/providers/${providerId}/records`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to load records for provider ${providerId}`);
  return await res.json();
}

export async function createProviderRecord(providerId, payload) {
  const res = await fetch(`${BASE_URL}/api/v1/providers/${providerId}/records`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create clinical record');
  return await res.json();
}

export async function listProviderInbox(providerId) {
  const res = await fetch(`${BASE_URL}/api/v1/providers/${providerId}/inbox`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load inbox for provider ${providerId}`);
  return await res.json();
}

// ============================================================================
// Audit Logs & Governance (Phase 6)
// ============================================================================

export async function listAuditLogs({
  startDate = '',
  endDate = '',
  actor = '',
  organization = '',
  action = '',
  outcome = '',
  search = '',
  page = 1,
  pageSize = 10,
} = {}) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (actor) params.append('actor', actor);
  if (organization && organization !== 'All Organizations') params.append('organization', organization);
  if (action && action !== 'All Actions') params.append('action', action);
  if (outcome && outcome !== 'All Outcomes') params.append('outcome', outcome);
  if (search) params.append('search', search);
  params.append('page', page);
  params.append('page_size', pageSize);

  const res = await fetch(`${BASE_URL}/api/v1/audit/logs?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load audit logs');
  return await res.json();
}

export async function getAuditStats() {
  const res = await fetch(`${BASE_URL}/api/v1/audit/stats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load audit statistics');
  return await res.json();
}

// Legacy Ingestion & Normalization wrappers
export async function ingestJsonPayload(sourceSystem, payload) {
  const res = await fetch(`${BASE_URL}/api/v1/ingestion/json`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ source_system: sourceSystem, payload }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.detail || `Ingestion failed (${res.status})`);
  }
  return await res.json();
}

export async function normalizeRecords(sourceSystem, records, ingestionId = null) {
  const res = await fetch(`${BASE_URL}/api/v1/normalization/process`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      source_system: sourceSystem,
      records: records,
      ingestion_id: ingestionId,
    }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.detail || `Normalization failed (${res.status})`);
  }
  return await res.json();
}

export async function mapTerminology(sourceSystem, concepts) {
  const res = await fetch(`${BASE_URL}/api/v1/terminology/map`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ source_system: sourceSystem, concepts }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.detail || `Terminology mapping failed (${res.status})`);
  }
  return await res.json();
}

export async function runFullPipelineSimulation({
  sourceSystem = 'HOSPITAL_A',
  destSystem = 'HOSPITAL_B',
  patientRef = 'CH1-1042',
  destPatientRef = 'MH-2098',
  identityToken = 'SYN_LINK_TOKEN_001',
  testConcept = 'Blood Glucose',
  testValue = 110.0,
  testUnit = 'mg/dL',
  specimen = 'blood',
}) {
  const results = { m1: null, m2: null, m3: null, m4: null, errors: [] };
  try {
    results.m1 = await ingestJsonPayload(sourceSystem, {
      patient_reference: patientRef,
      encounter_reference: 'ENC_001',
      observations: [{
        source_concept: testConcept,
        value: testValue,
        unit: testUnit,
        specimen: specimen,
        effective_datetime: new Date().toISOString(),
      }],
    });
  } catch (err) {
    results.errors.push({ stage: 'M1 Ingestion', error: err.message });
  }

  try {
    results.m2 = await normalizeRecords(sourceSystem, [{
      source_concept: testConcept,
      value: testValue,
      unit: testUnit,
      specimen: specimen,
    }], results.m1?.ingestion_id);
  } catch (err) {
    results.errors.push({ stage: 'M2 Normalization', error: err.message });
  }

  try {
    results.m3 = await mapTerminology(sourceSystem, [{
      local_code: 'GLU_FAST',
      local_display: testConcept,
      system: `LOCAL_${sourceSystem}`,
    }]);
  } catch (err) {
    results.errors.push({ stage: 'M3 Terminology', error: err.message });
  }

  try {
    results.m4 = await assessIdentity(
      { source_system: sourceSystem, patient_reference: patientRef },
      { source_system: destSystem, patient_reference: destPatientRef },
      identityToken
    );
  } catch (err) {
    results.errors.push({ stage: 'M4 Identity Safety', error: err.message });
  }

  return results;
}
