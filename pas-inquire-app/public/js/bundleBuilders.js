// FHIR request-bundle builders for PAS $inquire, ported from the Bruno collection.
//
// Two shapes (verified against reference/bruno):
//   buildFullBundle    — 11-resource graph (Claim, Coverage, Encounter, Patient,
//                        ServiceRequest, requestor Org, Condition, insurer Org,
//                        PractitionerRole, Practitioner, managing Org + CareTeam).
//                        Used by "Inquire - Full" and "Inquire - Specific PA Lookup".
//   buildMinimalBundle — 5-resource graph (Claim, Coverage, Patient, requestor Org,
//                        insurer Org). Used by Minimum Viable / Broad / By Service Code.
//
// `v` is a variable snapshot (vars.snapshot()). Builders also write back the
// auto-generated ids/timestamps onto a returned `gen` object so callers can echo them.

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function timestamps() {
  const now = new Date();
  return { iso: now.toISOString(), date: now.toISOString().split("T")[0] };
}

function txnId(v) {
  const existing = v.submitterTxnIdValue;
  if (existing && existing !== "auto") return existing;
  return "INQ-" + new Date().getFullYear() + "-" + String(Date.now()).slice(-6);
}

// ─── FULL bundle (Specific PA Lookup / Full Bundle UAT) ───────────────────────
// opts (all optional): providerNpiOverride (INQ-005), caseId (INQ-002),
// certExpiration (INQ-008) — mirror the buildMinimalBundle options.
export function buildFullBundle(v, opts = {}) {
  const { iso, date } = timestamps();
  const id = {
    claim: uuid(), coverage: uuid(), encounter: uuid(), patient: uuid(),
    serviceRequest: uuid(), requestorOrg: uuid(), condition: uuid(),
    insurerOrg: uuid(), practitionerRole: uuid(), practitioner: uuid(), managingOrg: uuid(),
  };
  const txn = txnId(v);
  const enc = v.encounterStartDateTime || iso.replace(/\.\d+Z$/, "Z");

  const bundle = {
    resourceType: "Bundle",
    id: "searchset",
    meta: { profile: ["http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-pas-request-bundle"] },
    type: "searchset",
    total: 1,
    link: [{ relation: "self", url: `${v.payerFhirBaseUrl || v.baseUrl}/Claim?_id=${id.claim}&_include=*` }],
    entry: [
      { fullUrl: `urn:uuid:${id.claim}`, resource: {
        resourceType: "Claim", id: id.claim,
        meta: { profile: ["http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-claim-inquiry"] },
        extension: [{ url: "http://hl7.org/fhir/5.0/StructureDefinition/extension-Claim.encounter", valueReference: { reference: `Encounter/${id.encounter}` } }],
        status: "active", use: "preauthorization", created: date,
        type: { coding: [{ code: v.claimTypeCode, display: cap(v.claimTypeCode), system: "http://terminology.hl7.org/CodeSystem/claim-type" }], text: cap(v.claimTypeCode) },
        priority: { coding: [{ code: "normal", display: "Normal", system: "http://terminology.hl7.org/CodeSystem/processpriority" }], text: "Normal" },
        patient: { reference: `Patient/${id.patient}` },
        provider: { reference: `Organization/${id.requestorOrg}` },
        insurer: { reference: `Organization/${id.insurerOrg}` },
        insurance: [{ sequence: 1, focal: true, coverage: { reference: `Coverage/${id.coverage}` } }],
        identifier: [
          { system: v.submitterTxnIdSystem, use: "usual", value: txn },
          ...(opts.caseId && v.caseIdValue ? [{ system: v.caseIdSystem, use: "usual", value: v.caseIdValue }] : []),
        ],
        enterer: { reference: `Practitioner/${id.practitioner}` },
        careTeam: [
          { sequence: 1, extension: [scope()], provider: { reference: `Organization/${id.requestorOrg}` }, role: x12Role("FA", "Facility") },
          { sequence: 2, extension: [scope()], provider: { reference: `PractitionerRole/${id.practitionerRole}` }, role: x12Role("71", "Attending Physician") },
        ],
        diagnosis: [{ sequence: 1, diagnosisCodeableConcept: codeable(v.diagnosisCode, v.diagnosisDisplay, v.diagnosisSystem) }],
        item: [{
          sequence: 1, careTeamSequence: [1, 2], diagnosisSequence: [1],
          extension: [
            ext("extension-serviceItemRequestType", { valueCodeableConcept: { coding: [{ code: v.serviceItemRequestTypeCode, display: "Health Services Review", system: "https://codesystem.x12.org/005010/1525" }] } }),
            ext("extension-administrationReferenceNumber", { valueString: v.priorAuthRefNumber }),
            ext("extension-requestedService", { valueReference: { reference: `ServiceRequest/${id.serviceRequest}` } }),
            ext("extension-itemTraceNumber", { valueIdentifier: { system: v.itemTraceNumberSystem, value: txn } }),
            ...(opts.certExpiration ? certDateExtensions(v) : []),
          ],
          category: codeable(v.serviceCategoryCode, v.serviceCategoryDisplay, "https://codesystem.x12.org/005010/1365"),
          locationCodeableConcept: codeable(v.placeOfServiceCode, v.placeOfServiceDisplay, v.placeOfServiceSystem),
          productOrService: codeable(v.productOrServiceCode, v.productOrServiceDisplay, v.productOrServiceSystem),
          quantity: { code: "1", system: "http://unitsofmeasure.org", unit: "unit", value: 1 },
        }],
      }},
      { fullUrl: `urn:uuid:${id.coverage}`, resource: coverageResource(v, id, true, opts) },
      { fullUrl: `urn:uuid:${id.encounter}`, resource: {
        resourceType: "Encounter", id: id.encounter,
        meta: { profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-encounter"] },
        status: "in-progress",
        class: { code: "AMB", display: "Ambulatory", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode" },
        diagnosis: [{ condition: { reference: `Condition/${id.condition}` } }],
        identifier: [{ system: v.encounterIdentifierSystem, use: "official", value: id.encounter }],
        participant: [{ individual: { reference: `Practitioner/${id.practitioner}` }, period: { start: enc } }],
        period: { start: enc },
        serviceProvider: { reference: `Organization/${id.requestorOrg}` },
        subject: { reference: `Patient/${id.patient}` },
        type: [codeable("2", "Established", "http://snomed.info/sct")],
      }},
      { fullUrl: `urn:uuid:${id.patient}`, resource: patientResource(v, id, true, opts) },
      { fullUrl: `urn:uuid:${id.serviceRequest}`, resource: {
        resourceType: "ServiceRequest", id: id.serviceRequest,
        meta: { profile: ["http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-servicerequest"] },
        status: "active", intent: "order", priority: "routine", authoredOn: date,
        code: codeable(v.productOrServiceCode, v.productOrServiceDisplay, v.productOrServiceSystem),
        encounter: { reference: `Encounter/${id.encounter}` },
        insurance: [{ reference: `Coverage/${id.coverage}` }],
        performer: [{ reference: `Organization/${id.requestorOrg}` }],
        reasonReference: [{ reference: `Condition/${id.condition}` }],
        requester: { reference: `PractitionerRole/${id.practitionerRole}` },
        subject: { reference: `Patient/${id.patient}` },
      }},
      { fullUrl: `urn:uuid:${id.requestorOrg}`, resource: requestorOrg(v, id, false, opts) },
      { fullUrl: `urn:uuid:${id.condition}`, resource: {
        resourceType: "Condition", id: id.condition,
        meta: { profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns"] },
        clinicalStatus: codeable("active", "Active", "http://terminology.hl7.org/CodeSystem/condition-clinical"),
        verificationStatus: codeable("confirmed", "Confirmed", "http://terminology.hl7.org/CodeSystem/condition-ver-status"),
        code: codeable(v.diagnosisCode, v.diagnosisDisplay, v.diagnosisSystem),
        subject: { reference: `Patient/${id.patient}` },
        encounter: { reference: `Encounter/${id.encounter}` },
        onsetDateTime: enc,
      }},
      { fullUrl: `urn:uuid:${id.insurerOrg}`, resource: insurerOrg(v, id) },
      { fullUrl: `urn:uuid:${id.practitionerRole}`, resource: {
        resourceType: "PractitionerRole", id: id.practitionerRole,
        meta: { profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-practitionerrole"] },
        active: true,
        organization: { reference: `Organization/${id.requestorOrg}` },
        practitioner: { reference: `Practitioner/${id.practitioner}` },
        telecom: [{ system: "phone", value: v.practitionerPhone }],
      }},
      { fullUrl: `urn:uuid:${id.practitioner}`, resource: {
        resourceType: "Practitioner", id: id.practitioner,
        meta: { profile: ["http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-practitioner"] },
        active: true, gender: "male", address: [{ country: "US" }],
        identifier: [{ system: "http://hl7.org/fhir/sid/us-npi", value: opts.providerNpiOverride || v.practitionerNpi }],
        name: [{ family: v.practitionerLastName, given: [v.practitionerFirstName] }],
        telecom: [{ system: "email", value: v.practitionerEmail }],
      }},
      { fullUrl: `urn:uuid:${id.managingOrg}`, resource: {
        resourceType: "Organization", id: id.managingOrg,
        meta: { profile: ["http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-organization"] },
        active: true, name: v.managingOrgName,
        address: [{ line: [v.managingOrgAddressLine], city: v.managingOrgCity, state: v.managingOrgState, postalCode: v.managingOrgPostalCode, country: "US" }],
        identifier: [{ system: "http://hl7.org/fhir/sid/us-npi", use: "official", value: v.managingOrgNpi }],
        telecom: [{ system: "phone", value: v.managingOrgPhone }],
        type: [orgType("prov", "Healthcare Provider")],
      }},
    ],
  };
  return { bundle, gen: { ...id, submitterTxnIdValue: txn, isoTimestamp: iso, inquiryDate: date } };
}

// ─── MINIMAL bundle (Minimum Viable / Broad / By Service Code) ────────────────
// opts.serviceMode:        "na" (returns all) | "cpt" (filter by productOrServiceCode)
// opts.withPaRef:          include administrationReferenceNumber from priorAuthRefNumber
// opts.authRefOverride:    use this string as the administrationReferenceNumber (INQ-007 bad Auth ID)
// opts.caseId:             add Claim.identifier carrying the eviCore Case ID / IOCaseNumber (INQ-002)
// opts.memberOverride "bad": use v.badMemberIdValue as the member ID (INQ-007 unknown member)
// opts.certExpiration:     add itemCertification(Expiration|Effective|Issue)Date extensions (INQ-008)
// opts.serviceDate:        add Claim.supportingInfo[patientEvent] service date range (INQ-008)
// opts.providerNpiOverride: add a careTeam attending provider carrying this NPI (INQ-005)
export function buildMinimalBundle(v, opts = {}) {
  const { iso, date } = timestamps();
  const id = { claim: uuid(), coverage: uuid(), patient: uuid(), requestorOrg: uuid(), insurerOrg: uuid() };
  const txn = txnId(v);
  const service = opts.serviceMode === "cpt"
    ? codeable(v.productOrServiceCode, v.productOrServiceDisplay, v.productOrServiceSystem)
    : { coding: [{ code: "not-applicable", system: "http://hl7.org/fhir/us/davinci-pas/CodeSystem/PASCodeSystem" }] };
  const authRef = opts.authRefOverride || v.priorAuthRefNumber;

  const itemExt = [
    ext("extension-serviceItemRequestType", { valueCodeableConcept: { coding: [{ code: v.serviceItemRequestTypeCode, display: "Health Services Review", system: "https://codesystem.x12.org/005010/1525" }] } }),
    ext("extension-certificationType", { valueCodeableConcept: { coding: [{ code: v.certificationTypeCode, display: "Initial", system: "https://codesystem.x12.org/005010/1322" }] } }),
  ];
  if ((opts.withPaRef || opts.authRefOverride) && authRef) {
    itemExt.push(ext("extension-administrationReferenceNumber", { valueString: authRef }));
  }
  if (opts.certExpiration) itemExt.push(...certDateExtensions(v));

  const claim = {
    resourceType: "Claim", id: "claim-1",
    meta: { profile: ["http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-claim-inquiry"] },
    status: "active", use: "preauthorization", created: date,
    type: codeable(v.claimTypeCode, undefined, "http://terminology.hl7.org/CodeSystem/claim-type"),
    patient: { reference: "urn:uuid:patient-1" },
    insurer: { reference: "urn:uuid:insurer-1" },
    provider: { reference: "urn:uuid:requestor-1" },
    priority: codeable("normal", undefined, "http://terminology.hl7.org/CodeSystem/processpriority"),
    insurance: [{ sequence: 1, focal: true, coverage: { reference: "urn:uuid:coverage-1" } }],
    item: [{ sequence: 1, extension: itemExt, productOrService: service }],
  };
  // Claim.identifier carries either the Auth ref (legacy) or the eviCore Case ID (INQ-002).
  const identifiers = [];
  if ((opts.withPaRef || opts.authRefOverride) && authRef) identifiers.push({ system: v.submitterTxnIdSystem, value: authRef });
  if (opts.caseId && v.caseIdValue) identifiers.push({ system: v.caseIdSystem, use: "usual", value: v.caseIdValue });
  if (identifiers.length) claim.identifier = identifiers;
  // INQ-005: narrow a broad member search to a specific servicing/rendering NPI.
  if (opts.providerNpiOverride) {
    claim.careTeam = [{ sequence: 1, extension: [scope()], provider: { reference: "urn:uuid:requestor-1" }, role: x12Role("71", "Attending Physician") }];
  }
  // INQ-008: service-date range via supportingInfo[patientEvent].
  if (opts.serviceDate && (v.serviceDateStart || v.serviceDateEnd)) {
    claim.supportingInfo = [{
      sequence: 1,
      category: codeable("patientEvent", "Patient Event Date", "http://hl7.org/fhir/us/davinci-pas/CodeSystem/PASSupportingInfoType"),
      timingPeriod: { start: v.serviceDateStart || undefined, end: v.serviceDateEnd || undefined },
    }];
  }

  const bundle = {
    resourceType: "Bundle",
    identifier: { system: v.submitterTxnIdSystem, value: txn },
    type: "collection",
    timestamp: iso,
    entry: [
      { fullUrl: "urn:uuid:claim-1", resource: claim },
      { fullUrl: "urn:uuid:patient-1", resource: patientResource(v, { patient: "patient-1" }, false, opts) },
      { fullUrl: "urn:uuid:requestor-1", resource: requestorOrg(v, { requestorOrg: "requestor-1" }, true, opts) },
      { fullUrl: "urn:uuid:insurer-1", resource: insurerOrg(v, { insurerOrg: "insurer-1" }) },
      { fullUrl: "urn:uuid:coverage-1", resource: coverageResource(v, { coverage: "coverage-1", patient: "patient-1", insurerOrg: "insurer-1" }, false, opts) },
    ],
  };
  return { bundle, gen: { submitterTxnIdValue: txn, isoTimestamp: iso, inquiryDate: date } };
}

// ─── shared resource fragments ────────────────────────────────────────────────
// `opts.memberOverride === "bad"` swaps in v.badMemberIdValue (INQ-007 unknown member).
function effectiveMemberId(v, opts) {
  return (opts && opts.memberOverride === "bad" && v.badMemberIdValue) ? v.badMemberIdValue : v.memberIdValue;
}

function patientResource(v, id, full, opts) {
  const profile = full
    ? "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-beneficiary"
    : "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-subscriber";
  const r = {
    resourceType: "Patient", id: id.patient,
    meta: { profile: [profile] },
    active: true, gender: v.patientGender, birthDate: v.patientBirthDate,
    identifier: [memberId(v, opts)],
    name: [{ use: "official", family: v.patientLastName, given: [v.patientFirstName] }],
  };
  if (full) {
    r.extension = [{ url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex", valueCode: v.patientBirthSex }];
    r.managingOrganization = { reference: `Organization/${id.managingOrg}` };
  }
  return r;
}

function coverageResource(v, id, full, opts) {
  return {
    resourceType: "Coverage", id: id.coverage,
    meta: { profile: ["http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-coverage"] },
    status: "active", subscriberId: v.subscriberId,
    beneficiary: { reference: full ? `Patient/${id.patient}` : `urn:uuid:${id.patient}` },
    subscriber: { reference: full ? `Patient/${id.patient}` : `urn:uuid:${id.patient}` },
    payor: [{ reference: full ? `Organization/${id.insurerOrg}` : `urn:uuid:${id.insurerOrg}` }],
    identifier: [{ use: "official", value: effectiveMemberId(v, opts), system: v.memberIdSystem, type: codeable("MB", undefined, "http://terminology.hl7.org/CodeSystem/v2-0203") }],
    class: [{ type: codeable("plan", "Plan", "http://terminology.hl7.org/CodeSystem/coverage-class"), value: v.coveragePlanName, name: v.coveragePlanName }],
    relationship: codeable(v.relationshipCode, "Self", "http://terminology.hl7.org/CodeSystem/subscriber-relationship"),
  };
}

// `opts.providerNpiOverride` swaps the org NPI to the queried servicing provider (INQ-005).
function requestorOrg(v, id, minimal, opts) {
  const npi = (opts && opts.providerNpiOverride) || v.providerNpi;
  const r = {
    resourceType: "Organization", id: id.requestorOrg,
    meta: { profile: ["http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-requestor"] },
    active: true, name: v.providerOrgName,
    identifier: [
      { system: "http://hl7.org/fhir/sid/us-npi", use: "official", value: npi },
      { system: "urn:oid:2.16.840.1.113883.4.4", use: "official", value: v.providerTin },
    ],
    type: [orgType("prov", "Healthcare Provider")],
  };
  if (!minimal) {
    r.address = [{ line: [v.providerAddressLine], city: v.providerCity, state: v.providerState, postalCode: v.providerPostalCode, country: "US" }];
    r.telecom = [{ system: "phone", value: v.providerPhone }];
  }
  return r;
}

function insurerOrg(v, id) {
  return {
    resourceType: "Organization", id: id.insurerOrg,
    meta: { profile: ["http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-insurer"] },
    active: true, name: v.payerOrgName, address: [{ country: "US" }],
    identifier: [{ system: "http://sid/us-insurer-id", use: "official", value: v.payerIdentifierValue, type: codeable("NIIP", "National Insurance Payor Identifier (Payor)", "http://terminology.hl7.org/CodeSystem/v2-0203") }],
    type: [orgType("pay", "Payer")],
  };
}

// ─── tiny helpers ─────────────────────────────────────────────────────────────
const PAS = "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/";
function ext(name, rest) { return { url: PAS + name, ...rest }; }
function scope() { return { url: PAS + "extension-careTeamClaimScope", valueBoolean: true }; }
function x12Role(code, display) { return { coding: [{ code, display, system: "https://codesystem.x12.org/005010/98" }], text: display }; }
function orgType(code, display) { return { coding: [{ code, display, system: "http://terminology.hl7.org/CodeSystem/organization-type" }], text: display }; }
function memberId(v, opts) { return { use: "official", value: effectiveMemberId(v, opts), system: v.memberIdSystem, type: codeable("MB", "Member Match Identifier", "http://terminology.hl7.org/CodeSystem/v2-0203") }; }
// INQ-008: inquiry-only certification date extensions (issue / effective / expiration).
function certDateExtensions(v) {
  const out = [];
  if (v.certIssueDate) out.push(ext("extension-itemCertificationIssueDate", { valueDate: v.certIssueDate }));
  if (v.certEffectiveDate) out.push(ext("extension-itemCertificationEffectiveDate", { valueDate: v.certEffectiveDate }));
  if (v.certExpirationDateStart || v.certExpirationDateEnd) {
    out.push(ext("extension-itemCertificationExpirationDate", { valuePeriod: { start: v.certExpirationDateStart || undefined, end: v.certExpirationDateEnd || undefined } }));
  }
  return out;
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function codeable(code, display, system) {
  const c = { code }; if (system) c.system = system; if (display) c.display = display;
  const out = { coding: [c] }; if (display) out.text = display; return out;
}
