// $inquire variants, ported from reference/bruno/Inquire - *.bru.
// All POST a FHIR request Bundle to {{payerFhirBaseUrl||baseUrl}}/Claim/$inquire
// with a Bearer access token, then assert + decode the ClaimResponse.
import { proxy } from "../api.js";
import { buildFullBundle, buildMinimalBundle } from "../bundleBuilders.js";
import { getReviewActionCode } from "../claimResponse.js";

const A = (label, pass) => ({ label, pass: !!pass });

const REVIEW = { A1: "Certified", A2: "Modified", A3: "Denied", A4: "Pended", A6: "Cancelled", A7: "Pended", CT: "Contact Payer", CA: "Cancelled", NA: "No Action" };

function makeInquire({ id, name, doc, build, requireClaimResponse }) {
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
        const ar = (first.item || []).flatMap((i) => i.extension || []).find((x) => (x.url || "").includes("administrationReferenceNumber"));
        if (ar?.valueString) vars.setRuntime("lastReviewNumber", ar.valueString);
      }
      const assertions = [
        A("HTTP 200", res.status === 200),
        A("Response is a Bundle", body.resourceType === "Bundle"),
      ];
      if (requireClaimResponse) assertions.push(A("ClaimResponse present", !!first));
      if (reviewLabel) assertions.push(A("Review action: " + reviewLabel, true));

      return { ok: res.status === 200 && body.resourceType === "Bundle" && (!requireClaimResponse || !!first),
        status: res.status, durationMs: res.durationMs,
        request: { method: "POST", url, body: bundle }, response: body, assertions };
    },
  };
}

export const inquireTests = [
  makeInquire({ id: "inquireFull", name: "Inquire — Full Bundle", doc: "Complete 11-resource graph matching eviCore UAT. PA ref on item.administrationReferenceNumber. (= PAS $Inquire / Inquire - Full Bundle (UAT).)", build: buildFullBundle, requireClaimResponse: true }),
  makeInquire({ id: "inquireSpecific", name: "Inquire — Specific PA Lookup", doc: "Same full graph; looks up a single authorization by priorAuthRefNumber.", build: buildFullBundle, requireClaimResponse: true }),
  makeInquire({ id: "inquireBroad", name: "Inquire — Broad Patient Query", doc: "Minimal bundle returning all authorizations on file for the member.", build: (v) => buildMinimalBundle(v, { serviceMode: "na" }), requireClaimResponse: false }),
  makeInquire({ id: "inquireByService", name: "Inquire — By Service Code", doc: "Minimal bundle filtered by productOrServiceCode (CPT/HCPCS).", build: (v) => buildMinimalBundle(v, { serviceMode: "cpt" }), requireClaimResponse: false }),
  makeInquire({ id: "inquireMinimal", name: "Inquire — Minimum Viable", doc: "Bare-bones Claim+Patient+Coverage+Orgs. Connectivity / smoke test.", build: (v) => buildMinimalBundle(v, { serviceMode: "na" }), requireClaimResponse: true }),
];
