// Plan Net — Payer Directory discovery (steps 0–5), ported from
// reference/bruno/Plan Net - Payer Directory/*.bru. Unauthenticated GETs.
// Each step chains values onto the runtime store for later steps / $inquire.
import { proxy } from "../api.js";

const A = (label, pass) => ({ label, pass: !!pass });
const NPI = "http://hl7.org/fhir/sid/us-npi";

async function getJson(vars, path) {
  const base = vars.get("planNetBaseUrl");
  const url = base.replace(/\/$/, "") + path;
  const res = await proxy({ url, method: "GET", headers: { Accept: "application/fhir+json" } });
  return { url, res, body: res.body };
}

function bundleEntries(body, type) {
  return (body?.entry || []).map((e) => e.resource).filter((r) => r && (!type || r.resourceType === type));
}

export const planNetTests = [
  {
    id: "planNet0", name: "Plan Net 0 — Capability Statement", group: "Plan Net", chain: true,
    doc: "GET /metadata. Verifies the Plan Net base URL is reachable and FHIR R4.",
    async run({ vars }) {
      const { url, res, body } = await getJson(vars, "/metadata");
      return { ok: res.status === 200 && body?.resourceType === "CapabilityStatement", status: res.status, durationMs: res.durationMs,
        request: { method: "GET", url }, response: body,
        assertions: [A("HTTP 200", res.status === 200), A("CapabilityStatement", body?.resourceType === "CapabilityStatement"),
          A("FHIR R4 (4.0.1)", body?.fhirVersion === "4.0.1")] };
    },
  },
  {
    id: "planNet1", name: "Plan Net 1 — Resolve Payer Organization", group: "Plan Net", chain: true,
    doc: "Finds the payer Organization by NPI → sets payerOrgId, payerOrgName.",
    async run({ vars }) {
      const { url, res, body } = await getJson(vars, `/Organization?identifier=${encodeURIComponent(NPI + "|" + vars.get("payerNpi"))}&type=pay`);
      const orgs = bundleEntries(body, "Organization");
      if (orgs[0]) {
        vars.setRuntime("payerOrgId", orgs[0].id || "");
        if (orgs[0].name) vars.setRuntime("payerOrgName", orgs[0].name);
      }
      return { ok: res.status === 200 && orgs.length > 0, status: res.status, durationMs: res.durationMs,
        request: { method: "GET", url }, response: body,
        assertions: [A("HTTP 200", res.status === 200), A("Bundle", body?.resourceType === "Bundle"),
          A("≥1 Organization", orgs.length > 0), A("payerOrgId captured", !!vars.getRuntime("payerOrgId"))] };
    },
  },
  {
    id: "planNet2", name: "Plan Net 2 — Discover Payer FHIR Endpoint", group: "Plan Net", chain: true,
    doc: "Finds the PAS FHIR base URL → sets payerFhirBaseUrl (+ discoveredTokenEndpoint if published).",
    async run({ vars }) {
      const { url, res, body } = await getJson(vars, `/Endpoint?organization=${encodeURIComponent(vars.get("payerOrgId"))}&connection-type=hl7-fhir-rest`);
      const eps = bundleEntries(body, "Endpoint");
      const pas = eps.find((e) => /pas|prior/i.test(e.name || "")) || eps[0];
      if (pas?.address) vars.setRuntime("payerFhirBaseUrl", pas.address);
      const smart = (pas?.extension || []).find((x) => /smart|oauth|token/i.test(x.url || ""));
      if (smart?.valueUrl) vars.setRuntime("discoveredTokenEndpoint", smart.valueUrl);
      return { ok: res.status === 200 && !!pas?.address, status: res.status, durationMs: res.durationMs,
        request: { method: "GET", url }, response: body,
        assertions: [A("HTTP 200", res.status === 200), A("≥1 Endpoint", eps.length > 0),
          A("payerFhirBaseUrl captured", !!vars.getRuntime("payerFhirBaseUrl"))] };
    },
  },
  {
    id: "planNet3", name: "Plan Net 3 — Verify Provider in Network", group: "Plan Net", chain: true,
    doc: "Confirms the requesting provider exists → sets providerFhirId.",
    async run({ vars }) {
      const { url, res, body } = await getJson(vars, `/Practitioner?identifier=${encodeURIComponent(NPI + "|" + vars.get("providerNpi"))}&_revinclude=PractitionerRole:practitioner`);
      const pracs = bundleEntries(body, "Practitioner");
      if (pracs[0]) vars.setRuntime("providerFhirId", pracs[0].id || "");
      return { ok: res.status === 200 && pracs.length > 0, status: res.status, durationMs: res.durationMs,
        request: { method: "GET", url }, response: body,
        assertions: [A("HTTP 200", res.status === 200), A("Bundle", body?.resourceType === "Bundle"),
          A("≥1 Practitioner", pracs.length > 0)] };
    },
  },
  {
    id: "planNet4", name: "Plan Net 4 — Lookup Insurance Plans", group: "Plan Net", chain: true,
    doc: "Lists active InsurancePlans for the payer → sets insurancePlanId/Name.",
    async run({ vars }) {
      const { url, res, body } = await getJson(vars, `/InsurancePlan?owned-by=${encodeURIComponent(vars.get("payerOrgId"))}&status=active`);
      const plans = bundleEntries(body, "InsurancePlan");
      if (plans[0]) { vars.setRuntime("insurancePlanId", plans[0].id || ""); if (plans[0].name) vars.setRuntime("insurancePlanName", plans[0].name); }
      return { ok: res.status === 200 && body?.resourceType === "Bundle", status: res.status, durationMs: res.durationMs,
        request: { method: "GET", url }, response: body,
        assertions: [A("HTTP 200", res.status === 200), A("Bundle", body?.resourceType === "Bundle")] };
    },
  },
  {
    id: "planNet5", name: "Plan Net 5 — Search Healthcare Services", group: "Plan Net", chain: true,
    doc: "Lists HealthcareServices offered by the payer (informational).",
    async run({ vars }) {
      const { url, res, body } = await getJson(vars, `/HealthcareService?organization=${encodeURIComponent(vars.get("payerOrgId"))}&_count=20`);
      return { ok: res.status === 200 && body?.resourceType === "Bundle", status: res.status, durationMs: res.durationMs,
        request: { method: "GET", url }, response: body,
        assertions: [A("HTTP 200", res.status === 200), A("Bundle", body?.resourceType === "Bundle")] };
    },
  },
];
