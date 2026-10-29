import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import PatientLayout from './layouts/PatientLayout';
import HospitalLayout from './layouts/HospitalLayout';

// Root Hub
import PlatformHubView from './views/PlatformHubView';

// Admin Views
import AdminOverviewPage from './views/admin/AdminOverviewPage';
import OrganizationsView from './components/OrganizationsView';
import OrganizationAccessView from './components/OrganizationAccessView';
import PatientIdentityView from './components/PatientIdentityView';
import TransfersView from './components/TransfersView';
import AdminConsentsView from './views/admin/AdminConsentsView';
import AuditLogsView from './components/AuditLogsView';
import SystemStatusView from './components/SystemStatusView';

// Patient Views
import PatientOverviewView from './views/patient/PatientOverviewView';
import PatientHealthRecordsView from './views/patient/PatientHealthRecordsView';
import PatientConsentRequestsView from './views/patient/PatientConsentRequestsView';
import PatientConnectedHospitalsView from './views/patient/PatientConnectedHospitalsView';
import PatientSharingHistoryView from './views/patient/PatientSharingHistoryView';
import PatientProfileView from './views/patient/PatientProfileView';

// Hospital Views
import HospitalOverviewView from './views/hospital/HospitalOverviewView';
import HospitalPatientsView from './views/hospital/HospitalPatientsView';
import HospitalPatientDetailView from './views/hospital/HospitalPatientDetailView';
import HospitalClinicalRecordsView from './views/hospital/HospitalClinicalRecordsView';
import HospitalExchangeRequestsView from './views/hospital/HospitalExchangeRequestsView';
import HospitalInboxView from './views/hospital/HospitalInboxView';
import HospitalTransfersView from './views/hospital/HospitalTransfersView';
import HospitalSettingsView from './views/hospital/HospitalSettingsView';

import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Platform Hub / Portal Switcher */}
        <Route path="/" element={<PlatformHubView />} />

        {/* Separate Website A: Admin Portal */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<AdminOverviewPage />} />
          <Route path="organizations" element={<OrganizationsView />} />
          <Route path="users" element={<OrganizationAccessView />} />
          <Route path="patients" element={<PatientIdentityView />} />
          <Route path="transfers" element={<TransfersView />} />
          <Route path="consents" element={<AdminConsentsView />} />
          <Route path="audit-logs" element={<AuditLogsView />} />
          <Route path="settings" element={<SystemStatusView />} />
        </Route>

        {/* Separate Website B: Patient Portal */}
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<Navigate to="/patient/overview" replace />} />
          <Route path="overview" element={<PatientOverviewView />} />
          <Route path="health-records" element={<PatientHealthRecordsView />} />
          <Route path="consent-requests" element={<PatientConsentRequestsView />} />
          <Route path="connected-hospitals" element={<PatientConnectedHospitalsView />} />
          <Route path="sharing-history" element={<PatientSharingHistoryView />} />
          <Route path="profile" element={<PatientProfileView />} />
        </Route>

        {/* Separate Website C: Hospital Portals (6 Nodes) */}
        <Route path="/hospital" element={<Navigate to="/hospital/city-hospital-1/overview" replace />} />
        <Route path="/hospital/:providerSlug" element={<HospitalLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<HospitalOverviewView />} />
          <Route path="patients" element={<HospitalPatientsView />} />
          <Route path="patients/:patientId" element={<HospitalPatientDetailView />} />
          <Route path="clinical-records" element={<HospitalClinicalRecordsView />} />
          <Route path="exchange-requests" element={<HospitalExchangeRequestsView />} />
          <Route path="inbox" element={<HospitalInboxView />} />
          <Route path="transfers" element={<HospitalTransfersView />} />
          <Route path="settings" element={<HospitalSettingsView />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
