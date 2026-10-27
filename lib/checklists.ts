export type ChecklistItem = { key: string; title: string };
export type ChecklistTemplate = { type: string; title: string; items: ChecklistItem[] };

// TNB's internal intake and document-organization requests. These are starting
// templates, not a statement of agency or payer requirements. TNB should tailor
// them to each engagement before asking a business to upload records.
export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  { type: "vendor", title: "Subcontractor / Vendor", items: [
    { key: "business_profile", title: "Business profile and service capabilities" },
    { key: "w9", title: "Completed W-9" },
    { key: "entity_registration", title: "Business registration or formation record" },
    { key: "insurance", title: "Current insurance certificate(s), if applicable" },
    { key: "safety_policy", title: "Safety or quality policy overview, if applicable" },
    { key: "references", title: "Relevant references or past-performance summary" },
  ]},
  { type: "prime", title: "Prime Contractor", items: [
    { key: "business_profile", title: "Business profile and service capabilities" },
    { key: "w9", title: "Completed W-9" },
    { key: "entity_registration", title: "Business registration or formation record" },
    { key: "insurance", title: "Current insurance certificate(s), if applicable" },
    { key: "vendor_requirements", title: "Prime's subcontractor onboarding requirements" },
  ]},
  { type: "personal_care_home", title: "Personal Care Home (PCH)", items: [
    { key: "business_profile", title: "Business profile, ownership contacts, and service model" },
    { key: "entity_registration", title: "Business registration or formation record" },
    { key: "facility_overview", title: "Facility address, capacity, and site overview" },
    { key: "license_status", title: "Current license or licensing-status documentation, if applicable" },
    { key: "insurance", title: "Current insurance certificate(s), if applicable" },
    { key: "policies_index", title: "Policies and procedures index or requested policy files" },
    { key: "staffing_overview", title: "Leadership and staffing / training overview" },
    { key: "safety_plan", title: "Emergency, fire, and safety plan or status" },
  ]},
  { type: "adult_day_center", title: "Adult Day Center / Adult Day Health", items: [
    { key: "business_profile", title: "Business profile, ownership contacts, and program model" },
    { key: "entity_registration", title: "Business registration or formation record" },
    { key: "facility_overview", title: "Facility address, capacity, hours, and site overview" },
    { key: "license_status", title: "Current license or licensing-status documentation, if applicable" },
    { key: "insurance", title: "Current insurance certificate(s), if applicable" },
    { key: "policies_index", title: "Policies and procedures index or requested policy files" },
    { key: "staffing_overview", title: "Leadership and staffing / training overview" },
    { key: "program_operations", title: "Food, transportation, and activity model (as applicable)" },
    { key: "safety_plan", title: "Emergency, fire, and safety plan or status" },
  ]},
  { type: "residential_support_provider", title: "Residential Support Provider / Group Home", items: [
    { key: "business_profile", title: "Business profile, ownership contacts, and support model" },
    { key: "entity_registration", title: "Business registration or formation record" },
    { key: "facility_overview", title: "Site address, capacity, and residential setting overview" },
    { key: "license_status", title: "Current license or licensing-status documentation, if applicable" },
    { key: "insurance", title: "Current insurance certificate(s), if applicable" },
    { key: "policies_index", title: "Policies and procedures index or requested policy files" },
    { key: "staffing_overview", title: "Leadership and staffing / training overview" },
    { key: "safety_plan", title: "Emergency, fire, and safety plan or status" },
  ]},
  { type: "home_care", title: "Home Care / PHCP", items: [
    { key: "business_profile", title: "Business profile, service area, and services offered" },
    { key: "entity_registration", title: "Business registration or formation record" },
    { key: "license_status", title: "Current license or licensing-status documentation, if applicable" },
    { key: "insurance", title: "Current insurance certificate(s), if applicable" },
    { key: "policies_index", title: "Policies and procedures index or requested policy files" },
    { key: "staffing_overview", title: "Leadership and staffing / training overview" },
    { key: "service_workflow", title: "Service delivery and documentation workflow overview" },
  ]},
  { type: "home_health", title: "Home Health Agency", items: [
    { key: "business_profile", title: "Business profile, service area, and services offered" },
    { key: "entity_registration", title: "Business registration or formation record" },
    { key: "license_status", title: "Current license / certification status documentation, if applicable" },
    { key: "insurance", title: "Current insurance certificate(s), if applicable" },
    { key: "policies_index", title: "Policies and procedures index or requested policy files" },
    { key: "leadership_staffing", title: "Leadership and staffing / qualification overview" },
    { key: "service_workflow", title: "Service delivery and quality workflow overview" },
  ]},
  { type: "behavioral_health", title: "Behavioral Health Provider", items: [
    { key: "business_profile", title: "Business profile, service area, and service model" },
    { key: "entity_registration", title: "Business registration or formation record" },
    { key: "license_status", title: "Current license or licensing-status documentation, if applicable" },
    { key: "insurance", title: "Current insurance certificate(s), if applicable" },
    { key: "policies_index", title: "Policies and procedures index or requested policy files" },
    { key: "leadership_staffing", title: "Leadership and staffing / qualification overview" },
    { key: "service_workflow", title: "Service delivery and documentation workflow overview" },
  ]},
  { type: "dme_supplier", title: "DME / Medical Supplier", items: [
    { key: "business_profile", title: "Business profile, service area, and product categories" },
    { key: "entity_registration", title: "Business registration or formation record" },
    { key: "license_status", title: "Applicable license or supplier-status documentation, if any" },
    { key: "insurance", title: "Current insurance certificate(s), if applicable" },
    { key: "quality_process", title: "Quality, delivery, and customer-support process overview" },
    { key: "leadership_staffing", title: "Business contact and operational lead information" },
  ]},
  { type: "clinic_practice", title: "Clinic / Medical Practice", items: [
    { key: "business_profile", title: "Business profile, service area, and practice model" },
    { key: "entity_registration", title: "Business registration or formation record" },
    { key: "license_status", title: "Facility / practice license or status documentation, if applicable" },
    { key: "insurance", title: "Current insurance certificate(s), if applicable" },
    { key: "policies_index", title: "Policies and procedures index or requested policy files" },
    { key: "leadership_staffing", title: "Leadership and staffing / qualification overview" },
    { key: "service_workflow", title: "Service and records workflow overview (no patient records)" },
  ]},
  { type: "healthcare_staffing", title: "Healthcare Staffing / Direct Placement", items: [
    { key: "business_profile", title: "Business profile, service area, and staffing categories" },
    { key: "entity_registration", title: "Business registration or formation record" },
    { key: "insurance", title: "Current insurance certificate(s), if applicable" },
    { key: "screening_process", title: "Worker screening and qualification verification process overview" },
    { key: "quality_process", title: "Placement, supervision, and issue-escalation workflow" },
    { key: "privacy_policy", title: "Confidentiality and information-handling policy" },
  ]},
  { type: "laboratory", title: "Laboratory / Specimen Collection", items: [
    { key: "business_profile", title: "Business profile, service area, and testing / collection scope" },
    { key: "entity_registration", title: "Business registration or formation record" },
    { key: "license_status", title: "Applicable license or laboratory-status documentation, if any" },
    { key: "clia_status", title: "CLIA status documentation, if applicable" },
    { key: "insurance", title: "Current insurance certificate(s), if applicable" },
    { key: "quality_process", title: "Quality, specimen handling, and result workflow overview" },
  ]},
  { type: "other", title: "Other Healthcare Business", items: [
    { key: "business_profile", title: "Business profile, service area, and service model" },
    { key: "entity_registration", title: "Business registration or formation record" },
    { key: "license_status", title: "Applicable license or credential status documentation, if any" },
    { key: "insurance", title: "Current insurance certificate(s), if applicable" },
    { key: "policies_index", title: "Policies and procedures index or requested policy files" },
    { key: "leadership_staffing", title: "Leadership and staffing overview" },
  ]},
];

export function checklistTemplate(type: string) {
  return CHECKLIST_TEMPLATES.find((template) => template.type === type) ?? CHECKLIST_TEMPLATES.find((template) => template.type === "other")!;
}
