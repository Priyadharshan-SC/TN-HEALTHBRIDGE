export const mockPatients = [
  {
    id: "PAT-2048",
    name: "Arun Kumar",
    gender: "Male",
    dob: "12 Mar 1985",
    age: 39,
    bloodGroup: "O+",
    lastUpdated: "Oct 27, 2024",
    recordsCount: 2,
    organizations: ["City Hospital", "Central Lab"],
    exchanges: [
      {
        id: 1,
        dateTime: "Oct 27, 2024\n10:46 AM",
        source: "City Hospital",
        destination: "Central Lab",
        dataType: "Lab Report",
        txnId: "TXN-1021",
        status: "Success",
        details: {
          hl7Version: "FHIR R4 / HL7 v2.5.1",
          protocol: "HTTPS / REST FHIR Endpoint",
          hash: "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
          summary: "Complete Blood Count (CBC) and Lipid Profile Panel transmitted securely.",
          duration: "320ms"
        }
      },
      {
        id: 2,
        dateTime: "Oct 26, 2024\n03:21 PM",
        source: "Central Lab",
        destination: "City Hospital",
        dataType: "Diagnostic Report",
        txnId: "TXN-1015",
        status: "Pending",
        details: {
          hl7Version: "FHIR R4 DiagnosticReport",
          protocol: "DICOM-Web / FHIR Bridge",
          hash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          summary: "Chest X-Ray Imaging Study awaiting radiologist signature verification.",
          duration: "In progress"
        }
      },
      {
        id: 3,
        dateTime: "Oct 25, 2024\n11:10 AM",
        source: "City Hospital",
        destination: "Metro Hospital",
        dataType: "Patient Info",
        txnId: "TXN-1008",
        status: "Failed",
        details: {
          hl7Version: "HL7 v2.5 ADT_A08",
          protocol: "MLLP over TLS 1.3",
          hash: "sha256:1a8565a9da9600a747970c4c4ecddff50bb9d63c5092a17f6942ad0518778f2e",
          summary: "Patient demographic synchronization failed due to destination timeout (SocketError 504).",
          duration: "10000ms (Timeout)"
        }
      },
      {
        id: 4,
        dateTime: "Oct 24, 2024\n04:32 PM",
        source: "Metro Hospital",
        destination: "City Hospital",
        dataType: "Observation",
        txnId: "TXN-1005",
        status: "Success",
        details: {
          hl7Version: "FHIR R4 Observation (Vitals)",
          protocol: "HTTPS / REST FHIR Endpoint",
          hash: "sha256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
          summary: "Vital signs record: Blood pressure 120/80 mmHg, Pulse 72 bpm, SpO2 99%.",
          duration: "245ms"
        }
      },
      {
        id: 5,
        dateTime: "Oct 22, 2024\n09:15 AM",
        source: "City Hospital",
        destination: "Central Lab",
        dataType: "Medication",
        txnId: "TXN-0998",
        status: "Success",
        details: {
          hl7Version: "FHIR R4 MedicationRequest",
          protocol: "HTTPS / REST FHIR Endpoint",
          hash: "sha256:ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
          summary: "Prescription order: Metformin 500mg PO BID, Atorvastatin 20mg PO QHS.",
          duration: "180ms"
        }
      }
    ],
    associatedOrgsList: [
      { name: "City Hospital", role: "Primary Care / Origin", since: "Jan 2021", status: "Active" },
      { name: "Central Lab", role: "Pathology & Diagnostics", since: "Mar 2022", status: "Active" }
    ],
    activityLog: [
      { action: "FHIR Resource Read", agent: "Dr. N. Ramanathan (City Hospital)", timestamp: "Oct 27, 2024, 10:48 AM" },
      { action: "Lab Results Dispatched", agent: "Automated Gateway (Central Lab)", timestamp: "Oct 27, 2024, 10:46 AM" },
      { action: "Consent Record Verified", agent: "TN HealthBridge Interop Guard", timestamp: "Oct 26, 2024, 03:20 PM" }
    ]
  },
  {
    id: "PAT-2050",
    name: "Priya S",
    gender: "Female",
    dob: "24 Jul 1993",
    age: 31,
    bloodGroup: "B+",
    lastUpdated: "Oct 25, 2024",
    recordsCount: 3,
    organizations: ["City Hospital", "Apollo Clinic"],
    exchanges: [
      {
        id: 101,
        dateTime: "Oct 25, 2024\n02:14 PM",
        source: "City Hospital",
        destination: "Apollo Clinic",
        dataType: "Referral Note",
        txnId: "TXN-1019",
        status: "Success",
        details: { hl7Version: "FHIR R4 ReferralRequest", protocol: "HTTPS REST", summary: "Cardiology consult referral", duration: "210ms" }
      }
    ]
  },
  {
    id: "PAT-2037",
    name: "Rajesh M",
    gender: "Male",
    dob: "19 Nov 1978",
    age: 45,
    bloodGroup: "A+",
    lastUpdated: "Oct 24, 2024",
    recordsCount: 3,
    organizations: ["City Hospital", "Central Lab", "Apollo Clinic"],
    exchanges: [
      {
        id: 102,
        dateTime: "Oct 24, 2024\n11:00 AM",
        source: "Apollo Clinic",
        destination: "Central Lab",
        dataType: "Lab Order",
        txnId: "TXN-1011",
        status: "Success",
        details: { hl7Version: "FHIR R4 ServiceRequest", protocol: "HTTPS REST", summary: "Routine HbA1c screening", duration: "190ms" }
      }
    ]
  },
  {
    id: "PAT-2015",
    name: "Kavya R",
    gender: "Female",
    dob: "05 Jun 1996",
    age: 28,
    bloodGroup: "O-",
    lastUpdated: "Oct 22, 2024",
    recordsCount: 2,
    organizations: ["Metro Hospital", "City Hospital"],
    exchanges: []
  },
  {
    id: "PAT-2078",
    name: "Vignesh T",
    gender: "Male",
    dob: "03 Aug 1972",
    age: 52,
    bloodGroup: "AB+",
    lastUpdated: "Oct 20, 2024",
    recordsCount: 4,
    organizations: ["City Hospital", "Central Lab", "Metro Hospital"],
    exchanges: []
  },
  {
    id: "PAT-2065",
    name: "Meena K",
    gender: "Female",
    dob: "14 Sep 1988",
    age: 36,
    bloodGroup: "B-",
    lastUpdated: "Oct 19, 2024",
    recordsCount: 2,
    organizations: ["City Hospital"],
    exchanges: []
  },
  {
    id: "PAT-2041",
    name: "Suresh P",
    gender: "Male",
    dob: "30 Jan 1964",
    age: 60,
    bloodGroup: "A-",
    lastUpdated: "Oct 18, 2024",
    recordsCount: 1,
    organizations: ["Central Lab"],
    exchanges: []
  },
  {
    id: "PAT-2027",
    name: "Anitha L",
    gender: "Female",
    dob: "08 Dec 1981",
    age: 42,
    bloodGroup: "O+",
    lastUpdated: "Oct 15, 2024",
    recordsCount: 2,
    organizations: ["City Hospital", "Metro Hospital"],
    exchanges: []
  }
];
