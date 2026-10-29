export const mockAuditLogs = [
  {
    id: 1,
    timestamp: "Oct 27, 10:42:15 AM",
    fullTimestamp: "Oct 27, 2024 10:42:15 AM",
    userService: "Dr. Arun Kumar",
    organization: "City Hospital",
    eventType: "Patient Record Viewed",
    relatedId: "PAT-2048",
    outcome: "Allowed",
    eventInfo: {
      eventId: "EVT-20241027-000145",
      eventType: "Patient Record Viewed",
      outcome: "Allowed",
      description: "User viewed an authorized patient record",
      timestamp: "Oct 27, 2024 10:42:15 AM",
      ipAddress: "192.168.1.45",
      source: "Web Application"
    },
    userInfo: {
      userId: "DOC-001",
      name: "Dr. Arun Kumar",
      role: "Doctor",
      department: "Cardiology",
      organization: "City Hospital (ORG-001)",
      accountStatus: "Active"
    },
    patientInfo: {
      patientId: "PAT-2048",
      patientName: "Arun Kumar",
      dob: "12 Mar 1985",
      gender: "Male"
    },
    relatedInfo: {
      transactionId: "TXN-1008 (if applicable)",
      resourceType: "Observation",
      recordCategory: "Lab Report",
      accessMethod: "Web Portal"
    }
  },
  {
    id: 2,
    timestamp: "Oct 27, 10:40:08 AM",
    fullTimestamp: "Oct 27, 2024 10:40:08 AM",
    userService: "Middleware Service",
    organization: "Central Lab",
    eventType: "FHIR Validation",
    relatedId: "TXN-1008",
    outcome: "Failed",
    eventInfo: {
      eventId: "EVT-20241027-000144",
      eventType: "FHIR Validation",
      outcome: "Failed",
      description: "Validation schema mismatch on FHIR Observation resource structure",
      timestamp: "Oct 27, 2024 10:40:08 AM",
      ipAddress: "10.0.4.12",
      source: "Interop Gateway Daemon"
    },
    userInfo: {
      userId: "SVC-009",
      name: "Middleware Service",
      role: "System Service Account",
      department: "Core Interop",
      organization: "Central Lab (ORG-002)",
      accountStatus: "Active"
    },
    patientInfo: {
      patientId: "PAT-2048",
      patientName: "Arun Kumar",
      dob: "12 Mar 1985",
      gender: "Male"
    },
    relatedInfo: {
      transactionId: "TXN-1008",
      resourceType: "DiagnosticReport",
      recordCategory: "Validation Error",
      accessMethod: "REST API"
    }
  },
  {
    id: 3,
    timestamp: "Oct 27, 10:38:21 AM",
    fullTimestamp: "Oct 27, 2024 10:38:21 AM",
    userService: "Dr. Priya S",
    organization: "City Hospital",
    eventType: "Patient Record Access",
    relatedId: "PAT-2050",
    outcome: "Denied",
    eventInfo: {
      eventId: "EVT-20241027-000143",
      eventType: "Patient Record Access",
      outcome: "Denied",
      description: "Access attempt blocked: Patient consent directive requires explicit breakout approval",
      timestamp: "Oct 27, 2024 10:38:21 AM",
      ipAddress: "192.168.1.88",
      source: "Web Application"
    },
    userInfo: {
      userId: "DOC-014",
      name: "Dr. Priya S",
      role: "Consultant Physician",
      department: "Endocrinology",
      organization: "City Hospital (ORG-001)",
      accountStatus: "Active"
    },
    patientInfo: {
      patientId: "PAT-2050",
      patientName: "Priya S",
      dob: "24 Jul 1993",
      gender: "Female"
    },
    relatedInfo: {
      transactionId: "TXN-1019 (if applicable)",
      resourceType: "ConsentPolicy",
      recordCategory: "Access Control",
      accessMethod: "Web Portal"
    }
  },
  {
    id: 4,
    timestamp: "Oct 27, 10:35:12 AM",
    fullTimestamp: "Oct 27, 2024 10:35:12 AM",
    userService: "Middleware Service",
    organization: "Metro Hospital",
    eventType: "Transfer Delivery",
    relatedId: "TXN-1007",
    outcome: "Success",
    eventInfo: {
      eventId: "EVT-20241027-000142",
      eventType: "Transfer Delivery",
      outcome: "Success",
      description: "Secure FHIR Bundle dispatched and acknowledged by Metro Hospital node",
      timestamp: "Oct 27, 2024 10:35:12 AM",
      ipAddress: "10.0.8.21",
      source: "Bridge Message Broker"
    },
    userInfo: {
      userId: "SVC-002",
      name: "Middleware Service",
      role: "Transfer Worker",
      department: "Network Delivery",
      organization: "Metro Hospital (ORG-003)",
      accountStatus: "Active"
    },
    patientInfo: {
      patientId: "PAT-2037",
      patientName: "Rajesh M",
      dob: "19 Nov 1978",
      gender: "Male"
    },
    relatedInfo: {
      transactionId: "TXN-1007",
      resourceType: "Bundle (Encrypted)",
      recordCategory: "Data Transfer",
      accessMethod: "mTLS TLS 1.3"
    }
  },
  {
    id: 5,
    timestamp: "Oct 27, 10:30:45 AM",
    fullTimestamp: "Oct 27, 2024 10:30:45 AM",
    userService: "Lab User 01",
    organization: "Central Lab",
    eventType: "Lab Report Access",
    relatedId: "PAT-2046",
    outcome: "Allowed",
    eventInfo: {
      eventId: "EVT-20241027-000141",
      eventType: "Lab Report Access",
      outcome: "Allowed",
      description: "Pathology technician accessed verified blood biochemistry panel",
      timestamp: "Oct 27, 2024 10:30:45 AM",
      ipAddress: "172.16.2.14",
      source: "Laboratory Information System (LIS)"
    },
    userInfo: {
      userId: "LAB-001",
      name: "Lab User 01",
      role: "Medical Lab Technician",
      department: "Hematology",
      organization: "Central Lab (ORG-002)",
      accountStatus: "Active"
    },
    patientInfo: {
      patientId: "PAT-2046",
      patientName: "Kavya R",
      dob: "05 Jun 1996",
      gender: "Female"
    },
    relatedInfo: {
      transactionId: "TXN-1004",
      resourceType: "DiagnosticReport",
      recordCategory: "Lab Report",
      accessMethod: "LIS Bridge"
    }
  },
  {
    id: 6,
    timestamp: "Oct 27, 10:28:33 AM",
    fullTimestamp: "Oct 27, 2024 10:28:33 AM",
    userService: "System Admin",
    organization: "—",
    eventType: "User Login",
    relatedId: "ADM-001",
    outcome: "Success",
    eventInfo: {
      eventId: "EVT-20241027-000140",
      eventType: "User Login",
      outcome: "Success",
      description: "Multi-factor authentication (MFA) verified successfully for administrative session",
      timestamp: "Oct 27, 2024 10:28:33 AM",
      ipAddress: "192.168.0.1",
      source: "Identity Provider (OAuth2/OIDC)"
    },
    userInfo: {
      userId: "ADM-001",
      name: "System Admin",
      role: "Platform Administrator",
      department: "DevOps & Security",
      organization: "TN HealthBridge Core",
      accountStatus: "Active"
    },
    patientInfo: {
      patientId: "—",
      patientName: "N/A (System Event)",
      dob: "—",
      gender: "—"
    },
    relatedInfo: {
      transactionId: "N/A",
      resourceType: "SecurityAudit",
      recordCategory: "Authentication",
      accessMethod: "SSO Portal"
    }
  },
  {
    id: 7,
    timestamp: "Oct 27, 10:25:18 AM",
    fullTimestamp: "Oct 27, 2024 10:25:18 AM",
    userService: "Middleware Service",
    organization: "City Hospital",
    eventType: "Clinical Mapping",
    relatedId: "TXN-1006",
    outcome: "Success",
    eventInfo: {
      eventId: "EVT-20241027-000139",
      eventType: "Clinical Mapping",
      outcome: "Success",
      description: "SNOMED CT and LOINC concept mapping completed for incoming encounter records",
      timestamp: "Oct 27, 2024 10:25:18 AM",
      ipAddress: "10.0.1.55",
      source: "Terminology Normalization Engine"
    },
    userInfo: {
      userId: "SVC-005",
      name: "Middleware Service",
      role: "Terminology Mapper",
      department: "Clinical Informatics",
      organization: "City Hospital (ORG-001)",
      accountStatus: "Active"
    },
    patientInfo: {
      patientId: "PAT-2078",
      patientName: "Vignesh T",
      dob: "03 Aug 1972",
      gender: "Male"
    },
    relatedInfo: {
      transactionId: "TXN-1006",
      resourceType: "ConceptMap",
      recordCategory: "Normalization",
      accessMethod: "Internal Queue"
    }
  },
  {
    id: 8,
    timestamp: "Oct 27, 10:18:02 AM",
    fullTimestamp: "Oct 27, 2024 10:18:02 AM",
    userService: "Dr. Rajesh M",
    organization: "Metro Hospital",
    eventType: "Patient Record Access",
    relatedId: "PAT-2052",
    outcome: "Denied",
    eventInfo: {
      eventId: "EVT-20241027-000138",
      eventType: "Patient Record Access",
      outcome: "Denied",
      description: "Cross-organization access rejected: Active treatment relationship verification missing",
      timestamp: "Oct 27, 2024 10:18:02 AM",
      ipAddress: "192.168.3.11",
      source: "Web Application"
    },
    userInfo: {
      userId: "DOC-029",
      name: "Dr. Rajesh M",
      role: "Emergency Physician",
      department: "Trauma Care",
      organization: "Metro Hospital (ORG-003)",
      accountStatus: "Active"
    },
    patientInfo: {
      patientId: "PAT-2052",
      patientName: "Meena K",
      dob: "14 Sep 1988",
      gender: "Female"
    },
    relatedInfo: {
      transactionId: "TXN-1002 (if applicable)",
      resourceType: "AccessPolicy",
      recordCategory: "Permission Error",
      accessMethod: "Web Portal"
    }
  },
  {
    id: 9,
    timestamp: "Oct 27, 10:15:27 AM",
    fullTimestamp: "Oct 27, 2024 10:15:27 AM",
    userService: "Lab User 02",
    organization: "Sunrise Hospital",
    eventType: "Lab Report Access",
    relatedId: "PAT-2047",
    outcome: "Allowed",
    eventInfo: {
      eventId: "EVT-20241027-000137",
      eventType: "Lab Report Access",
      outcome: "Allowed",
      description: "Authorized retrieval of renal function panel results",
      timestamp: "Oct 27, 2024 10:15:27 AM",
      ipAddress: "172.20.10.4",
      source: "Clinical Data Repository"
    },
    userInfo: {
      userId: "LAB-008",
      name: "Lab User 02",
      role: "Senior Biochemist",
      department: "Diagnostic Services",
      organization: "Sunrise Hospital (ORG-004)",
      accountStatus: "Active"
    },
    patientInfo: {
      patientId: "PAT-2047",
      patientName: "Suresh P",
      dob: "30 Jan 1964",
      gender: "Male"
    },
    relatedInfo: {
      transactionId: "TXN-0995",
      resourceType: "DiagnosticReport",
      recordCategory: "Lab Report",
      accessMethod: "REST FHIR API"
    }
  },
  {
    id: 10,
    timestamp: "Oct 27, 10:12:11 AM",
    fullTimestamp: "Oct 27, 2024 10:12:11 AM",
    userService: "Middleware Service",
    organization: "Delta Diagnostics",
    eventType: "Authorization Check",
    relatedId: "TXN-1005",
    outcome: "Failed",
    eventInfo: {
      eventId: "EVT-20241027-000136",
      eventType: "Authorization Check",
      outcome: "Failed",
      description: "Digital certificate expired on external destination node handshake",
      timestamp: "Oct 27, 2024 10:12:11 AM",
      ipAddress: "10.0.12.89",
      source: "TLS Gateway Service"
    },
    userInfo: {
      userId: "SVC-012",
      name: "Middleware Service",
      role: "Security Interop Agent",
      department: "Infrastructure",
      organization: "Delta Diagnostics (ORG-005)",
      accountStatus: "Active"
    },
    patientInfo: {
      patientId: "PAT-2027",
      patientName: "Anitha L",
      dob: "08 Dec 1981",
      gender: "Female"
    },
    relatedInfo: {
      transactionId: "TXN-1005",
      resourceType: "SecurityCertificate",
      recordCategory: "Handshake Failure",
      accessMethod: "mTLS"
    }
  }
];
