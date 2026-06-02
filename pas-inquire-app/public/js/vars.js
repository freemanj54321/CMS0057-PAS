// Variable schema + state for the PAS $inquire Tester.
//
// The schema mirrors the full variable set used across the Bruno collection
// (source of truth: reference/bruno/environments/Default.bru). Defaults are the
// NON-SENSITIVE placeholder values only — no real eviCore data ships here.
//
// Two stores:
//   form     — user-editable variables (persisted to sessionStorage, minus secrets)
//   runtime  — chained values written by tests (accessToken, payerFhirBaseUrl, ...),
//              replicating Bruno's bru.setVar/getVar. Runtime overrides form.

export const SCHEMA = [
  { group: "Endpoints", fields: [
    { key: "planNetBaseUrl", label: "Plan Net base URL", default: "https://payer.example.com/fhir/plan-net" },
    { key: "baseUrl", label: "PAS FHIR base URL", default: "https://payer.example.com/fhir/R4" },
    { key: "tokenEndpoint", label: "OAuth token endpoint", default: "https://payer.example.com/oauth2/token" },
  ]},
  { group: "OAuth", fields: [
    { key: "clientId", label: "Client ID", default: "", secret: true, placeholder: "entered per session" },
    { key: "clientSecret", label: "Client secret", default: "", secret: true, type: "password", placeholder: "entered per session" },
    { key: "oauthScope", label: "Scope", default: "system/Claim.write system/Claim.read" },
  ]},
  { group: "Patient / Member", fields: [
    { key: "memberIdSystem", label: "Member ID system", default: "https://payer.example.com/member-ids" },
    { key: "memberIdValue", label: "Member ID", default: "MBR-12345678901" },
    { key: "patientLastName", label: "Last name", default: "SMITH" },
    { key: "patientFirstName", label: "First name", default: "JOE" },
    { key: "patientGender", label: "Gender", type: "select", options: ["male", "female", "other", "unknown"], default: "male" },
    { key: "patientBirthDate", label: "Birth date", default: "1990-01-15" },
    { key: "patientBirthSex", label: "Birth sex", type: "select", options: ["M", "F", "UNK"], default: "M" },
    { key: "subscriberId", label: "Subscriber ID", default: "1122334455" },
    { key: "relationshipCode", label: "Relationship", default: "self" },
    { key: "coveragePlanName", label: "Coverage plan name", default: "StandardPlan" },
  ]},
  { group: "Requestor Organization", fields: [
    { key: "providerNpi", label: "Org NPI", default: "8189991234" },
    { key: "providerTin", label: "Org TIN", default: "123456789" },
    { key: "providerOrgName", label: "Org name", default: "DR. SMITH MEDICAL GROUP" },
    { key: "providerAddressLine", label: "Address line", default: "100 MEDICAL DRIVE" },
    { key: "providerCity", label: "City", default: "ANYTOWN" },
    { key: "providerState", label: "State", default: "VA" },
    { key: "providerPostalCode", label: "Postal code", default: "20000" },
    { key: "providerPhone", label: "Phone", default: "5551234567" },
    { key: "providerContactPhone", label: "Contact phone", default: "5551234567" },
  ]},
  { group: "Practitioner", fields: [
    { key: "practitionerNpi", label: "NPI", default: "1234567890" },
    { key: "practitionerLastName", label: "Last name", default: "DOE" },
    { key: "practitionerFirstName", label: "First name", default: "JANE" },
    { key: "practitionerEmail", label: "Email", default: "jane.doe@medical.example.com" },
    { key: "practitionerPhone", label: "Phone", default: "5559876543" },
  ]},
  { group: "Payer (Insurer)", fields: [
    { key: "payerNpi", label: "Payer NPI", default: "1234567893" },
    { key: "payerOrgName", label: "Payer name", default: "ACME HEALTH INSURANCE" },
    { key: "payerIdentifierValue", label: "Payer identifier (NIIP)", default: "99999" },
  ]},
  { group: "Managing Organization", fields: [
    { key: "managingOrgNpi", label: "NPI", default: "9876543210" },
    { key: "managingOrgName", label: "Name", default: "HEALTH SYSTEM INC" },
    { key: "managingOrgAddressLine", label: "Address line", default: "200 HEALTH BLVD" },
    { key: "managingOrgCity", label: "City", default: "FRANKLIN" },
    { key: "managingOrgState", label: "State", default: "TN" },
    { key: "managingOrgPostalCode", label: "Postal code", default: "38305" },
    { key: "managingOrgPhone", label: "Phone", default: "5555550111" },
  ]},
  { group: "Clinical / Inquiry", fields: [
    { key: "priorAuthRefSystem", label: "PA ref system", default: "https://payer.example.com/prior-auth" },
    { key: "priorAuthRefNumber", label: "PA reference number", default: "AUTH-987654" },
    { key: "submitterTxnIdSystem", label: "Submitter txn ID system", default: "https://yourorg.com/transaction-ids" },
    { key: "productOrServiceSystem", label: "Service code system", default: "http://www.cms.gov/Medicare/Coding/HCPCSReleaseCodeSets" },
    { key: "productOrServiceCode", label: "Service code (CPT/HCPCS)", default: "G0154" },
    { key: "productOrServiceDisplay", label: "Service display", default: "Services of a clinical social worker" },
    { key: "diagnosisSystem", label: "Diagnosis system", default: "http://hl7.org/fhir/sid/icd-10-cm" },
    { key: "diagnosisCode", label: "Diagnosis code (ICD-10)", default: "F32.1" },
    { key: "diagnosisDisplay", label: "Diagnosis display", default: "Major depressive disorder, single episode, moderate" },
    { key: "claimTypeCode", label: "Claim type", type: "select", options: ["institutional", "professional", "oral", "pharmacy", "vision"], default: "professional" },
    { key: "serviceItemRequestTypeCode", label: "Request type (X12 1525)", type: "select", options: ["HS", "IN", "AR"], default: "HS" },
    { key: "certificationTypeCode", label: "Certification type", default: "I" },
  ]},
  { group: "Service Item", fields: [
    { key: "serviceCategoryCode", label: "Service category code", default: "1" },
    { key: "serviceCategoryDisplay", label: "Service category display", default: "Medical Care" },
    { key: "placeOfServiceCode", label: "Place of service code", default: "11" },
    { key: "placeOfServiceDisplay", label: "Place of service display", default: "Office" },
    { key: "placeOfServiceSystem", label: "Place of service system", default: "https://www.cms.gov/Medicare/Coding/place-of-service-codes/Place_of_Service_Code_Set" },
    { key: "itemTraceNumberSystem", label: "Item trace number system", default: "https://yourorg.com/trace-numbers" },
  ]},
  { group: "Encounter / ServiceRequest", fields: [
    { key: "encounterIdentifierSystem", label: "Encounter identifier system", default: "https://emr.example.com/encounter-identifier" },
    { key: "encounterStartDateTime", label: "Encounter start", default: "2025-01-15T10:00:00Z" },
    { key: "dtrQuestionnaireUrl", label: "DTR questionnaire URL", default: "https://payer.example.com/dtr/adaptive-questionnaire" },
  ]},
];

// Runtime/chained variables (set by tests, not part of the form).
export const RUNTIME_KEYS = [
  "accessToken", "tokenExpiresAt", "discoveredTokenEndpoint", "payerFhirBaseUrl",
  "payerOrgId", "providerFhirId", "insurancePlanId", "insurancePlanName",
  "lastClaimResponseId", "lastClaimResponseOutcome", "lastReviewActionCode",
  "lastReviewNumber", "isoTimestamp", "inquiryDate", "submitterTxnIdValue",
];

const SECRET_KEYS = SCHEMA.flatMap((g) => g.fields.filter((f) => f.secret).map((f) => f.key));
const STORAGE_KEY = "pasInquire.vars";

const form = {};
const runtime = {};

// seed defaults
for (const g of SCHEMA) for (const f of g.fields) form[f.key] = f.default || "";

// restore non-secret form values from this session
try {
  const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  for (const [k, val] of Object.entries(saved)) if (k in form && !SECRET_KEYS.includes(k)) form[k] = val;
} catch { /* ignore */ }

function persist() {
  const out = {};
  for (const [k, val] of Object.entries(form)) if (!SECRET_KEYS.includes(k)) out[k] = val;
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(out)); } catch { /* ignore */ }
}

export const vars = {
  /** Read with Bruno precedence: runtime (chained) overrides form (env). */
  get(key) {
    if (key in runtime && runtime[key] !== "" && runtime[key] != null) return runtime[key];
    return form[key] ?? "";
  },
  getForm(key) { return form[key] ?? ""; },
  setForm(key, value) { form[key] = value; persist(); },
  getRuntime(key) { return runtime[key] ?? ""; },
  setRuntime(key, value) { runtime[key] = value; },
  isSecret(key) { return SECRET_KEYS.includes(key); },
  /** Full merged snapshot (form + runtime) for bundle builders. */
  snapshot() {
    const snap = { ...form };
    for (const [k, val] of Object.entries(runtime)) if (val !== "" && val != null) snap[k] = val;
    return snap;
  },
  runtimeState() { return { ...runtime }; },
};
