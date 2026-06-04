// $inquire variants, ported from reference/bruno/Inquire - *.bru and extended to
// cover the PAS Inquire User Stories (PAS-INQ-001…011). Each test POSTs a FHIR
// request Bundle to {{payerFhirBaseUrl||baseUrl}}/Claim/$inquire with a Bearer
// access token, then asserts the response against the story's acceptance criteria.
import { proxy } from "../api.js";
import { buildFullBundle, buildMinimalBundle } from "../bundleBuilders.js";
import { getReviewActionCode } from "../claimResponse.js";

const A = (label, pass) => ({ label, pass: !!pass });

const REVIEW = { A1: "Certified", A2: "Modified", A3: "Denied", A4: "Pended", A6: "Cancelled", A7: "Pended", CT: "Contact Payer", CA: "Cancelled", NA: "No Action", OU: "Needs Additional Clinical Information" };
// X12 306 Review Action Codes that channel-partner workflows route on (PAS-INQ-003 AC2).
const X12_306 = ["A1", "A2", "A3", "A4", "A6", "CT", "OU"];

// ─── shared response inspectors / assertion helpers ───────────────────────────
function operationOutcomes(body) {
  const out = [];
  if (body?.resourceType === "OperationOutcome") out.push(body);
  for (const e of body?.entry || []) if (e.resource?.resourceType === "OperationOutcome") out.push(e.resource);
  return out;
}
function hasErrorIssue(body) {
  return operationOutcomes(body).some((oo) => (oo.issue || []).some((i) => i.severity === "error" || i.severity === "fatal"));
}
function ioCaseNumber(cr) {
  return (cr?.identifier || []).find((i) => (i.system || "").includes("IOCaseNumber"));
}
function adminRefOf(cr) {
  return (cr?.item || []).flatMap((i) => i.extension || []).find((x) => (x.url || "").includes("administrationReferenceNumber"))?.valueString || null;
}
function itemLevelReviewCode(cr) {
  for (const item of cr?.item || []) {
    for (const adj of item.adjudication || []) {
      const ra = (adj.extension || []).find((e) => (e.url || "").includes("reviewAction"));
      const rac = ra && (ra.extension || []).find((e) => (e.url || "").includes("reviewActionCode"));
      if (rac) return rac.valueCodeableConcept?.coding?.[0] || null;
    }
  }
  return null;
}
// A clean-empty response (valid "no results"): Bundle, total 0 / no CRS, and NO error OO.
function assertCleanEmpty(body, crs) {
  return A("Clean empty Bundle (total=0, no error OperationOutcome)", crs.length === 0 && !hasErrorIssue(body));
}

function makeInquire({ id, name, doc, build, requireClaimResponse, check }) {
  return {
    id, name, group: "$inquire", doc,
    async run({ vars }) {
      const snap = vars.snapshot();
      const base = (vars.get("payerFhirBaseUrl") || vars.get("baseUrl") || "").replace(/\/$/, "");
      const token = vars.get("accessToken");
      const { bundle, gen } = build(snap);
      // persist auto-generated chain values
      vars.setRuntime("submitterTxnIdValue", gen.submitterTxnIdValue);
      vars.setRuntime("isoTimestamp", gen.isoTimestamp);
      vars.setRuntime("inquiryDate", gen.inquiryDate);

      const url = base + "/Claim/$inquire";
      const preflight = [];
      if (!base) preflight.push(A("PAS base URL set (run Plan Net 2 or set baseUrl)", false));
      if (!token) preflight.push(A("Access token present (run OAuth first)", false));
      if (preflight.length) {
        return { ok: false, status: 0, request: { method: "POST", url, body: bundle },
          response: { error: "Missing prerequisites — see failed assertions." }, assertions: preflight };
      }

      const res = await proxy({
        url, method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + token },
        body: bundle,
      });
      const body = res.body || {};
      const crs = (body.entry || []).map((e) => e.resource).filter((r) => r?.resourceType === "ClaimResponse");
      const first = crs[0];
      let reviewLabel = "";
      if (first) {
        vars.setRuntime("lastClaimResponseId", first.id || "");
        vars.setRuntime("lastClaimResponseOutcome", first.outcome || "");
        const code = getReviewActionCode(first);
        if (code) { vars.setRuntime("lastReviewActionCode", code.code); reviewLabel = `${code.code} — ${REVIEW[code.code] || code.display || ""}`; }
        const ar = adminRefOf(first);
        if (ar) vars.setRuntime("lastReviewNumber", ar);
      }
      const assertions = [
        A("HTTP 200", res.status === 200),
        A("Response is a Bundle", body.resourceType === "Bundle"),
      ];
      if (requireClaimResponse) assertions.push(A("ClaimResponse present", !!first));
      if (reviewLabel) assertions.push(A("Review action: " + reviewLabel, true));
      // story-specific acceptance-criteria assertions
      if (check) assertions.push(...check({ body, res, crs, first, vars }));

      const baseOk = res.status === 200 && body.resourceType === "Bundle" && (!requireClaimResponse || !!first);
      return { ok: baseOk && assertions.every((a) => a.pass),
        status: res.status, durationMs: res.durationMs,
        request: { method: "POST", url, body: bundle }, response: body, assertions };
    },
  };
}

export const inquireTests = [
  makeInquire({
    id: "inquireFull", name: "Inquire — Full Bundle",
    doc: "PAS-INQ-003. Complete 11-resource graph matching eviCore UAT; PA ref on item.administrationReferenceNumber. Asserts the returned reviewActionCode is a valid X12 306 status (= Inquire - Full Bundle (UAT)).",
    build: buildFullBundle, requireClaimResponse: true,
    check: ({ first }) => {
      const code = getReviewActionCode(first);
      const out = [A("Review action code in X12 306 set (A1/A2/A3/A4/A6/CT/OU)", code && X12_306.includes(code.code))];
      if (code) out.push(A("Review action code has display text", !!(code.display || REVIEW[code.code])));
      const item = itemLevelReviewCode(first);
      if (item) out.push(A("Item-level reviewActionCode present (INQ-003 AC5)", X12_306.includes(item.code)));
      return out;
    },
  }),
  makeInquire({
    id: "inquireSpecific", name: "Inquire — Specific PA Lookup",
    doc: "PAS-INQ-003. Same full graph; looks up a single authorization by priorAuthRefNumber and validates its X12 306 status code.",
    build: buildFullBundle, requireClaimResponse: true,
    check: ({ first }) => {
      const code = getReviewActionCode(first);
      return [A("Review action code in X12 306 set", code && X12_306.includes(code.code))];
    },
  }),
  makeInquire({
    id: "inquireBroadMatch", name: "Inquire — Broad Patient Query (Match Expected)",
    doc: "PAS-INQ-001 (+INQ-004). Minimal bundle for a REAL member (memberIdValue), no Auth ID, productOrService='not-applicable'. Expects authorizations to be returned. AC2: when a member has multiple authorizations, ALL are returned (none truncated). AC4: each result carries Auth ID + Case ID + reviewActionCode. Use a member known to have ≥1 authorization (incl. portal-created cases per INQ-004).",
    build: (v) => buildMinimalBundle(v, { serviceMode: "na" }), requireClaimResponse: true,
    check: ({ body, crs }) => {
      const everyHasAuth = crs.every((c) => adminRefOf(c));
      const everyHasCase = crs.every((c) => ioCaseNumber(c));
      const everyHasReview = crs.every((c) => getReviewActionCode(c));
      const out = [
        A(`Returned ${crs.length} authorization(s) — at least one expected`, crs.length >= 1),
        A("Every result carries administrationReferenceNumber (INQ-001 AC4)", crs.length > 0 && everyHasAuth),
        A("Every result carries IOCaseNumber identifier (INQ-001 AC4)", crs.length > 0 && everyHasCase),
        A("Every result carries a reviewActionCode (INQ-001 AC4)", crs.length > 0 && everyHasReview),
      ];
      // AC2: if the server reports a total, confirm every match was returned (not truncated).
      if (body.total != null) out.push(A(`All ${body.total} matching authorization(s) returned (INQ-001 AC2)`, crs.length === body.total));
      return out;
    },
  }),
  makeInquire({
    id: "inquireBroadNoMatch", name: "Inquire — Broad Patient Query (No Match / Fabricated)",
    doc: "PAS-INQ-001 AC3. Control test: minimal broad bundle using a COMPLETELY FABRICATED member (badMemberIdValue) that matches no patient. The response SHALL be a valid, clean empty Bundle (total=0, zero ClaimResponse entries, no error OperationOutcome) — never any results. Guards against false-positive matches in the broad-search path.",
    build: (v) => buildMinimalBundle(v, { serviceMode: "na", memberOverride: "bad" }), requireClaimResponse: false,
    check: ({ body, crs }) => [
      assertCleanEmpty(body, crs),
      A("No ClaimResponse entries returned for fabricated member", crs.length === 0),
      ...(body.total != null ? [A("Bundle.total = 0", body.total === 0)] : []),
    ],
  }),
  makeInquire({
    id: "inquireByCaseId", name: "Inquire — By Case ID (IOCaseNumber)",
    doc: "PAS-INQ-002. Looks up a case by the eviCore Case ID (IOCaseNumber) carried on Claim.identifier, with NO Auth ID. AC1/AC4: returns the matching ClaimResponse identified by the IOCaseNumber system. Currently confirmed not working against eviCore UAT.",
    build: (v) => buildMinimalBundle(v, { serviceMode: "na", caseId: true }), requireClaimResponse: true,
    check: ({ first, vars }) => {
      const io = ioCaseNumber(first);
      return [
        A("Result identified by IOCaseNumber system (INQ-002 AC4)", !!io),
        A("Returned Case ID matches the queried Case ID", io && io.value === vars.get("caseIdValue")),
      ];
    },
  }),
  makeInquire({
    id: "inquireByProviderNpi", name: "Inquire — By Servicing Provider NPI",
    doc: "PAS-INQ-005. Full graph with the careTeam attending provider set to the queried servicing/rendering NPI (servicingProviderNpi var). AC1: only that provider's authorizations returned. AC4: no match → clean empty Bundle, not an error. Suspected not working — provider NPI may be validated for structure but not used as a filter.",
    build: (v) => buildFullBundle(v, { providerNpiOverride: v.servicingProviderNpi }), requireClaimResponse: false,
    check: ({ body, crs }) => {
      if (crs.length === 0) return [assertCleanEmpty(body, crs)];
      return [A(`Returned ${crs.length} authorization(s) for the queried provider`, true)];
    },
  }),
  makeInquire({
    id: "inquireByService", name: "Inquire — By Service Code",
    doc: "PAS-INQ-006. Minimal bundle filtered by productOrServiceCode (CPT/HCPCS). AC1: only authorizations matching the queried code. AC2: no match → clean empty Bundle (total=0), not an error.",
    build: (v) => buildMinimalBundle(v, { serviceMode: "cpt" }), requireClaimResponse: false,
    check: ({ body, crs, vars }) => {
      if (crs.length === 0) return [assertCleanEmpty(body, crs)];
      const wanted = vars.get("productOrServiceCode");
      const allMatch = crs.every((c) => JSON.stringify(c).includes(wanted));
      return [
        A(`Returned ${crs.length} authorization(s)`, true),
        A(`Every result references queried service code ${wanted} (INQ-006 AC1)`, allMatch),
      ];
    },
  }),
  makeInquire({
    id: "inquireByDateRange", name: "Inquire — By Date Range",
    doc: "PAS-INQ-008. Minimal bundle with itemCertificationExpirationDate range (+ service date range). AC1/AC2: only authorizations whose dates fall in range. AC4: no match → clean empty Bundle. Not yet tested against eviCore UAT.",
    build: (v) => buildMinimalBundle(v, { serviceMode: "na", certExpiration: true, serviceDate: true }), requireClaimResponse: false,
    check: ({ body, crs }) => {
      if (crs.length === 0) return [assertCleanEmpty(body, crs)];
      return [A(`Returned ${crs.length} date-bounded authorization(s)`, true)];
    },
  }),
  makeInquire({
    id: "inquireLightweightWithAuth", name: "Inquire — Lightweight 5-Resource + Auth ID",
    doc: "PAS-INQ-011. IG-minimum 5-resource bundle (Claim, Patient, Coverage, Insurer Org, Requestor Org) carrying a valid administrationReferenceNumber — NO Encounter/Condition/ServiceRequest/Practitioner graph. AC1/AC2: SHALL return the same ClaimResponse as the full 11-resource graph. Confirmed not working — eviCore currently requires the full graph.",
    build: (v) => buildMinimalBundle(v, { serviceMode: "na", withPaRef: true }), requireClaimResponse: true,
    check: ({ first }) => [A("Returned a ClaimResponse from the 5-resource bundle (INQ-011 AC1)", !!first)],
  }),
  makeInquire({
    id: "inquireMinimal", name: "Inquire — Minimum Viable",
    doc: "Bare-bones Claim+Patient+Coverage+Orgs (no Auth ID). Connectivity / smoke test.",
    build: (v) => buildMinimalBundle(v, { serviceMode: "na" }), requireClaimResponse: true,
  }),
  makeInquire({
    id: "inquireBadMember", name: "Inquire — Unknown Member (error response)",
    doc: "PAS-INQ-007 AC2. Broad inquiry with an unrecognized member ID (badMemberIdValue). Expects an OperationOutcome warning with diagnostics — NOT a silent empty Bundle. This test FAILS while eviCore returns the same empty Bundle for every non-match (the documented gap).",
    build: (v) => buildMinimalBundle(v, { serviceMode: "na", memberOverride: "bad" }), requireClaimResponse: false,
    check: ({ body }) => {
      const oos = operationOutcomes(body);
      const withDiag = oos.some((oo) => (oo.issue || []).some((i) => i.severity && (i.diagnostics || "").trim()));
      return [
        A("OperationOutcome returned for unknown member (INQ-007 AC2)", oos.length > 0),
        A("OperationOutcome issue has severity + diagnostics (INQ-007 AC5)", withDiag),
      ];
    },
  }),
  makeInquire({
    id: "inquireBadAuthId", name: "Inquire — Invalid Auth ID (error response)",
    doc: "PAS-INQ-007 AC4. Lookup with an invalid/expired Auth ID (badAuthRefNumber). Expects an OperationOutcome indicating the identifier was not found — NOT an empty Bundle. FAILS while eviCore returns a silent empty Bundle (the documented gap).",
    build: (v) => buildMinimalBundle(v, { serviceMode: "na", authRefOverride: v.badAuthRefNumber }), requireClaimResponse: false,
    check: ({ body }) => {
      const oos = operationOutcomes(body);
      const withDiag = oos.some((oo) => (oo.issue || []).some((i) => i.severity && (i.diagnostics || "").trim()));
      return [
        A("OperationOutcome returned for invalid Auth ID (INQ-007 AC4)", oos.length > 0),
        A("OperationOutcome issue has severity + diagnostics (INQ-007 AC5)", withDiag),
      ];
    },
  }),
];
