export const mockOrganizations = [
  {
    id: "ORG-001",
    name: "City Hospital",
    type: "Hospital",
    typeLabel: "Hospital",
    iconType: "hospital",
    location: "Chennai, Tamil Nadu",
    totalUsers: 120,
    connectedSince: "Jan 15, 2024",
    description: "General hospital providing inpatient and outpatient care",
    status: "Active",
    endpoint: "https://fhir.cityhospital.tn.gov.in/r4",
    fhirVersion: "FHIR R4 (4.0.1)",
    authMethod: "OAuth 2.0 / SMART on FHIR",
    certExpiry: "Dec 31, 2025",
    permissions: [
      { resource: "Patient", read: true, write: true, accessLevel: "Full Access" },
      { resource: "Observation", read: true, write: true, accessLevel: "Full Access" },
      { resource: "DiagnosticReport", read: true, write: true, accessLevel: "Full Access" },
      { resource: "MedicationRequest", read: true, write: true, accessLevel: "Full Access" },
      { resource: "Consent", read: true, write: false, accessLevel: "Read-Only" }
    ],
    users: [
      { id: 1, name: "Dr. Arun Kumar", role: "Doctor", roleCategory: "doctor", department: "Cardiology", status: "Active", lastAccess: "Oct 27, 10:30 AM" },
      { id: 2, name: "Dr. Priya S", role: "Doctor", roleCategory: "doctor", department: "General Medicine", status: "Active", lastAccess: "Oct 27, 10:15 AM" },
      { id: 3, name: "Dr. Rajesh M", role: "Doctor", roleCategory: "doctor", department: "Orthopedics", status: "Active", lastAccess: "Oct 27, 09:50 AM" },
      { id: 4, name: "Lab User 01", role: "Lab Staff", roleCategory: "lab", department: "Diagnostics", status: "Active", lastAccess: "Oct 27, 09:45 AM" },
      { id: 5, name: "Lab User 02", role: "Lab Staff", roleCategory: "lab", department: "Diagnostics", status: "Active", lastAccess: "Oct 27, 09:30 AM" },
      { id: 6, name: "Admin User 01", role: "IT Admin", roleCategory: "admin", department: "IT Operations", status: "Active", lastAccess: "Oct 27, 09:20 AM" }
    ]
  },
  {
    id: "ORG-002",
    name: "Central Laboratory",
    type: "Laboratory",
    typeLabel: "Laboratory",
    iconType: "lab",
    location: "Madurai, Tamil Nadu",
    totalUsers: 85,
    connectedSince: "Feb 10, 2024",
    description: "State central reference and pathology diagnostic center",
    status: "Active",
    endpoint: "https://lab.central.tn.gov.in/fhir",
    fhirVersion: "FHIR R4 (4.0.1)",
    authMethod: "mTLS + JWT Bearer",
    certExpiry: "Nov 14, 2025",
    permissions: [
      { resource: "DiagnosticReport", read: true, write: true, accessLevel: "Full Access" },
      { resource: "Observation", read: true, write: true, accessLevel: "Full Access" },
      { resource: "Specimen", read: true, write: true, accessLevel: "Full Access" },
      { resource: "Patient", read: true, write: false, accessLevel: "Read-Only" }
    ],
    users: [
      { id: 101, name: "Dr. Senthil Nathan", role: "Doctor", roleCategory: "doctor", department: "Pathology", status: "Active", lastAccess: "Oct 27, 10:20 AM" },
      { id: 102, name: "Lab User 01", role: "Lab Staff", roleCategory: "lab", department: "Diagnostics", status: "Active", lastAccess: "Oct 27, 10:10 AM" },
      { id: 103, name: "Lab User 03", role: "Lab Staff", roleCategory: "lab", department: "Biochemistry", status: "Active", lastAccess: "Oct 27, 09:40 AM" }
    ]
  },
  {
    id: "ORG-003",
    name: "Metro Hospital",
    type: "Hospital",
    typeLabel: "Hospital",
    iconType: "hospital",
    location: "Coimbatore, Tamil Nadu",
    totalUsers: 110,
    connectedSince: "Mar 01, 2024",
    description: "Multispeciality tertiary care hospital network",
    status: "Active",
    endpoint: "https://interop.metrohospital.tn.org/api/v1",
    fhirVersion: "FHIR R4 (4.0.1)",
    authMethod: "OAuth 2.0 / SMART on FHIR",
    certExpiry: "Jan 10, 2026",
    permissions: [
      { resource: "Patient", read: true, write: true, accessLevel: "Full Access" },
      { resource: "Encounter", read: true, write: true, accessLevel: "Full Access" },
      { resource: "Observation", read: true, write: true, accessLevel: "Full Access" }
    ],
    users: [
      { id: 201, name: "Dr. K. Vijay", role: "Doctor", roleCategory: "doctor", department: "Emergency Medicine", status: "Active", lastAccess: "Oct 27, 10:35 AM" },
      { id: 202, name: "Staff Nurse Anita", role: "Clinical Staff", roleCategory: "doctor", department: "ICU Ward", status: "Active", lastAccess: "Oct 27, 09:15 AM" }
    ]
  },
  {
    id: "ORG-004",
    name: "Sunrise Hospital",
    type: "Hospital",
    typeLabel: "Hospital",
    iconType: "hospital",
    location: "Tiruchirappalli, Tamil Nadu",
    totalUsers: 95,
    connectedSince: "Apr 18, 2024",
    description: "Specialized maternal, neonatal and pediatric care center",
    status: "Active",
    endpoint: "https://sunrise-health.tn.gov.in/fhir/r4",
    fhirVersion: "FHIR R4 (4.0.1)",
    authMethod: "mTLS Mutual Handshake",
    certExpiry: "Oct 05, 2025",
    permissions: [
      { resource: "Patient", read: true, write: true, accessLevel: "Full Access" },
      { resource: "Observation", read: true, write: true, accessLevel: "Full Access" }
    ],
    users: [
      { id: 301, name: "Dr. Latha Murugan", role: "Doctor", roleCategory: "doctor", department: "Pediatrics", status: "Active", lastAccess: "Oct 27, 10:05 AM" }
    ]
  },
  {
    id: "ORG-005",
    name: "Elite Diagnostics",
    type: "Laboratory",
    typeLabel: "Laboratory",
    iconType: "lab",
    location: "Salem, Tamil Nadu",
    totalUsers: 60,
    connectedSince: "May 22, 2024",
    description: "Advanced medical imaging, ultrasound and CT scan diagnostic facility",
    status: "Active",
    endpoint: "https://elite-diag.net/dicomweb/fhir",
    fhirVersion: "DICOM-Web / FHIR Bridge",
    authMethod: "API Key + TLS 1.3",
    certExpiry: "Sep 15, 2025",
    permissions: [
      { resource: "DiagnosticReport", read: true, write: true, accessLevel: "Full Access" }
    ],
    users: [
      { id: 401, name: "Dr. R. Anand", role: "Doctor", roleCategory: "doctor", department: "Radiology", status: "Active", lastAccess: "Oct 27, 09:55 AM" }
    ]
  },
  {
    id: "ORG-006",
    name: "Green Valley Clinic",
    type: "Clinic",
    typeLabel: "Clinic",
    iconType: "clinic",
    location: "Vellore, Tamil Nadu",
    totalUsers: 45,
    connectedSince: "Jun 11, 2024",
    description: "Community health clinic focused on primary wellness and chronic management",
    status: "Active",
    endpoint: "https://greenvalley.tn.org/gateway",
    fhirVersion: "FHIR R4 (4.0.1)",
    authMethod: "OAuth 2.0 Client Credentials",
    certExpiry: "Aug 20, 2025",
    permissions: [
      { resource: "Patient", read: true, write: true, accessLevel: "Full Access" },
      { resource: "Condition", read: true, write: true, accessLevel: "Full Access" }
    ],
    users: [
      { id: 501, name: "Dr. Suresh Babu", role: "Doctor", roleCategory: "doctor", department: "Family Practice", status: "Active", lastAccess: "Oct 27, 09:30 AM" }
    ]
  }
];
