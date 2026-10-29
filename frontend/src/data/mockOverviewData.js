export const mockOverviewKPIs = {
  successful: {
    count: "1,248",
    label: "Successful Transfers",
    subtext: "Data delivered to destination"
  },
  pending: {
    count: "72",
    label: "Pending Transfers",
    subtext: "In processing or awaiting review"
  },
  failed: {
    count: "28",
    label: "Failed Transfers",
    subtext: "Requires attention"
  },
  totalToday: {
    count: "1,348",
    label: "Total Transfers (Today)",
    subtext: "12% from yesterday",
    trend: "up"
  }
};

export const mockRequiringAttention = [
  {
    id: "TXN-1008",
    source: "Metro Hospital",
    destination: "City Hospital",
    issue: "Destination timeout",
    stage: "Delivery",
    time: "10:42 AM",
    action: "Investigate"
  },
  {
    id: "TXN-1012",
    source: "Central Lab",
    destination: "City Hospital",
    issue: "Invalid FHIR resource",
    stage: "Validation",
    time: "10:35 AM",
    action: "View Error"
  },
  {
    id: "TXN-1015",
    source: "City Hospital",
    destination: "Central Lab",
    issue: "Unmapped field: Allergy Information",
    stage: "Mapping",
    time: "10:28 AM",
    action: "Review"
  },
  {
    id: "TXN-1018",
    source: "Sunrise Hospital",
    destination: "City Hospital",
    issue: "Authorization denied",
    stage: "Authorization",
    time: "10:20 AM",
    action: "Check Access"
  },
  {
    id: "TXN-1020",
    source: "Elite Diagnostics",
    destination: "City Hospital",
    issue: "Missing required fields",
    stage: "Validation",
    time: "09:55 AM",
    action: "View Details"
  }
];

export const mockRecentExchanges = [
  {
    time: "10:46 AM",
    id: "TXN-1021",
    source: "City Hospital",
    destination: "Central Lab",
    dataType: "Lab Report",
    status: "Success"
  },
  {
    time: "10:42 AM",
    id: "TXN-1008",
    source: "Metro Hospital",
    destination: "City Hospital",
    dataType: "Observation",
    status: "Failed"
  },
  {
    time: "10:38 AM",
    id: "TXN-1020",
    source: "Central Lab",
    destination: "City Hospital",
    dataType: "Diagnostic Report",
    status: "Pending"
  },
  {
    time: "10:35 AM",
    id: "TXN-1012",
    source: "City Hospital",
    destination: "Central Lab",
    dataType: "Medication",
    status: "Failed"
  },
  {
    time: "10:30 AM",
    id: "TXN-1019",
    source: "Sunrise Hospital",
    destination: "City Hospital",
    dataType: "Patient Info",
    status: "Success"
  },
  {
    time: "10:28 AM",
    id: "TXN-1015",
    source: "City Hospital",
    destination: "Central Lab",
    dataType: "Observation",
    status: "Pending"
  },
  {
    time: "10:25 AM",
    id: "TXN-1017",
    source: "Central Lab",
    destination: "Metro Hospital",
    dataType: "Lab Report",
    status: "Success"
  }
];

export const mockConnectedOrganizations = [
  {
    name: "City Hospital",
    role: "Hospital",
    code: "ORG-001",
    status: "Active"
  },
  {
    name: "Central Laboratory",
    role: "Laboratory",
    code: "ORG-002",
    status: "Active"
  },
  {
    name: "Metro Hospital",
    role: "Hospital",
    code: "ORG-003",
    status: "Active"
  },
  {
    name: "Sunrise Hospital",
    role: "Hospital",
    code: "ORG-004",
    status: "Active"
  }
];
