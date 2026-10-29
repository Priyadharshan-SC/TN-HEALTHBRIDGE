/**
 * Federated Healthcare Providers & Participating Node Configurations for TN HealthBridge.
 * Represents the 6 authorized, independently federated hospital and laboratory systems.
 */

export const HOSPITALS = [
  {
    id: 'HOSPITAL_A',
    slug: 'city-hospital-1',
    name: 'City Hospital 1',
    officialName: 'Government General Hospital, Chennai',
    code: 'CH1',
    type: 'TERTIARY_HOSPITAL',
    typeLabel: 'Tertiary Care Hospital',
    location: 'Park Town, Chennai',
    district: 'Chennai',
    badgeColor: '#0284c7',
    iconEmoji: '🏥',
    description: 'Premier tertiary care hospital providing advanced inpatient, trauma, and comprehensive diagnostic services.',
    samplePatientId: 'CH1-1042',
  },
  {
    id: 'LAB_C',
    slug: 'central-laboratory',
    name: 'Central Laboratory',
    officialName: 'Central Diagnostic Institute & Molecular Labs',
    code: 'CL',
    type: 'LABORATORY',
    typeLabel: 'Reference Diagnostic Laboratory',
    location: 'Guindy Institutional Area, Chennai',
    district: 'Chennai',
    badgeColor: '#7c3aed',
    iconEmoji: '🔬',
    description: 'High-throughput molecular pathology center specializing in GeneXpert TB CBNAAT and infectious disease assays.',
    samplePatientId: 'CL-7821',
  },
  {
    id: 'HOSPITAL_B',
    slug: 'metro-hospital',
    name: 'Metro Hospital',
    officialName: 'Metro Multi-Specialty Hospital',
    code: 'MH',
    type: 'MULTI_SPECIALTY',
    typeLabel: 'Multi-Specialty Hospital',
    location: 'Anna Nagar, Chennai',
    district: 'Chennai',
    badgeColor: '#059669',
    iconEmoji: '🏥',
    description: 'Multi-specialty center with 24/7 critical care, emergency department, and comprehensive diabetic care.',
    samplePatientId: 'MH-3310',
  },
  {
    id: 'HOSPITAL_D',
    slug: 'sunrise-hospital',
    name: 'Sunrise Hospital',
    officialName: 'Sunrise Apex Hospital & Research Institute',
    code: 'SH',
    type: 'RESEARCH_HOSPITAL',
    typeLabel: 'Apex Specialty Center',
    location: 'Avinashi Road, Coimbatore',
    district: 'Coimbatore',
    badgeColor: '#ea580c',
    iconEmoji: '🏥',
    description: 'Apex cardiothoracic and vascular specialty institute serving Western Tamil Nadu.',
    samplePatientId: 'SH-5017',
  },
  {
    id: 'LAB_E',
    slug: 'elite-diagnostics',
    name: 'Elite Diagnostics',
    officialName: 'Elite Diagnostics & Automated Pathology',
    code: 'ED',
    type: 'LABORATORY',
    typeLabel: 'Automated Pathology Lab',
    location: 'Thillai Nagar, Tiruchirappalli',
    district: 'Tiruchirappalli',
    badgeColor: '#0891b2',
    iconEmoji: '🧪',
    description: 'Automated SI-unit biochemistry and endocrine testing laboratory supporting central Tamil Nadu.',
    samplePatientId: 'ED-3041',
  },
  {
    id: 'CLINIC_F',
    slug: 'green-valley-clinic',
    name: 'Green Valley Clinic',
    officialName: 'Green Valley Community Health Centre',
    code: 'GVC',
    type: 'COMMUNITY_CLINIC',
    typeLabel: 'Community Health Centre',
    location: 'Yercaud Foot Hills, Salem',
    district: 'Salem',
    badgeColor: '#16a34a',
    iconEmoji: '🩺',
    description: 'Primary community healthcare center focusing on vector-borne disease control, maternal health, and wellness.',
    samplePatientId: 'GVC-9102',
  },
];

/**
 * Resolve provider configuration by slug or ID.
 */
export function getProviderBySlug(slugOrId) {
  if (!slugOrId) return HOSPITALS[0];
  const query = slugOrId.toLowerCase().trim();
  return (
    HOSPITALS.find(
      (h) => h.slug.toLowerCase() === query || h.id.toLowerCase() === query || h.code.toLowerCase() === query
    ) || HOSPITALS[0]
  );
}

/**
 * Get slug from provider ID.
 */
export function getProviderSlug(providerId) {
  const match = HOSPITALS.find((h) => h.id === providerId);
  return match ? match.slug : 'city-hospital-1';
}

