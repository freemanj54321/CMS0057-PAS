// ClaimResponse / Bundle rendering, ported from reference/mockup/pas-inquire-tester.html.
// Pure functions: given a FHIR response body, return HTML strings.

export function getExtVal(extensions, urlFragment) {
  if (!extensions) return null;
  return extensions.find((e) => e.url && e.url.includes(urlFragment)) || null;
}

export function getReviewActionCode(cr) {
  for (const adj of cr.adjudication || []) {
    const ra = getExtVal(adj.extension, "reviewAction");
    if (ra) {
      const rac = getExtVal(ra.extension, "reviewActionCode");
      if (rac) return rac.valueCodeableConcept?.coding?.[0] || null;
    }
  }
  return null;
}

// A1/A2/A3 certified-ish, A4/A6/A7 pended, CA/CT/NA denied.
export function reviewBadge(code) {
  if (!code) return '<span class="badge badge-neutral">—</span>';
  const approved = ["A1", "A2", "A3"], denied = ["CA", "CT", "NA"], pending = ["A4", "A6", "A7", "P1", "P2", "P3"];
  let cls = "badge-queued";
  if (approved.includes(code.code)) cls = "badge-approved";
  else if (denied.includes(code.code)) cls = "badge-denied";
  else if (pending.includes(code.code)) cls = "badge-pending";
  return `<span class="badge ${cls}">${esc(code.code)}${code.display ? " — " + esc(code.display) : ""}</span>`;
}

function itemAuthorizedDetail(item) {
  const ext = getExtVal(item.extension, "itemAuthorizedDetail");
  if (!ext) return null;
  const inner = ext.extension || [];
  return {
    cpt: inner.find((e) => e.url === "productOrServiceCode")?.valueCodeableConcept?.coding?.[0],
    qty: inner.find((e) => e.url === "quantity")?.valueQuantity,
    loc: inner.find((e) => e.url === "locationCodeableConcept")?.valueCodeableConcept?.coding?.[0],
  };
}
function communicatedDiag(item) {
  const c = getExtVal(item.extension, "communicatedDiagnosis")?.valueCodeableConcept?.coding?.[0];
  return c ? `${c.code} — ${c.display || ""}` : null;
}
function adminRef(item) { return getExtVal(item.extension, "administrationReferenceNumber")?.valueString || null; }

export function renderFormatted(data) {
  if (!data?.entry?.length) return `<div class="error-banner">Response has no bundle entries.</div>`;
  const cr = data.entry.filter((e) => e.resource?.resourceType === "ClaimResponse").map((e) => e.resource);
  const orgs = data.entry.filter((e) => e.resource?.resourceType === "Organization").map((e) => e.resource);
  const pats = data.entry.filter((e) => e.resource?.resourceType === "Patient").map((e) => e.resource);
  if (!cr.length) return `<div class="error-banner">No ClaimResponse resource in the bundle.</div>`;

  let html = "";
  for (const c of cr) {
    const review = getReviewActionCode(c);
    const ids = (c.identifier || []).map((i) => ({ label: i.type?.text || (i.system || "").split("/").pop(), val: i.value }));
    html += `<div class="card"><div class="card-header">
      <div><div class="card-title">ClaimResponse</div><div class="card-sub">${esc(c.id || "")}</div></div>
      <div style="text-align:right">${reviewBadge(review)}${c.disposition ? `<div class="card-sub">${esc(c.disposition)}</div>` : ""}</div>
    </div><table class="kv">
      <tr><td>Status</td><td>${esc(c.status || "—")}</td></tr>
      <tr><td>Outcome</td><td>${esc(c.outcome || "—")}</td></tr>
      <tr><td>Created</td><td>${esc(c.created || "—")}</td></tr>
      ${ids.map((i) => `<tr><td>${esc(i.label)}</td><td class="mono">${esc(i.val)}</td></tr>`).join("")}
    </table>`;
    if (c.item?.length) {
      html += `<div class="section-label" style="margin-top:12px">Line items</div>`;
      for (const item of c.item) {
        const d = itemAuthorizedDetail(item), dx = communicatedDiag(item), ar = adminRef(item);
        const adj = (item.adjudication || []).map((a) => a.category?.coding?.[0]?.code).filter(Boolean).join(", ");
        html += `<div class="item-box"><div class="mono" style="font-weight:600;margin-bottom:6px">Item ${item.itemSequence ?? ""}</div><div class="mini-grid">`;
        if (ar) html += mini("Admin ref #", ar, true);
        if (d?.cpt) html += mini("Auth CPT", d.cpt.code, true);
        if (d?.qty) html += mini("Qty", `${d.qty.value} ${d.qty.unit || ""}`);
        if (d?.loc) html += mini("Location", d.loc.code, true);
        if (adj) html += mini("Adjudication", adj);
        if (dx) html += mini("Diagnosis", dx, false, true);
        html += `</div></div>`;
      }
    }
    html += `</div>`;
  }
  if (pats.length) {
    const p = pats[0], nm = p.name?.[0];
    html += `<div class="card"><div class="card-title">Patient</div><table class="kv">
      <tr><td>Name</td><td>${esc(nm ? `${(nm.given || []).join(" ")} ${nm.family || ""}`.trim() : "—")}</td></tr>
      <tr><td>DOB</td><td>${esc(p.birthDate || "—")}</td></tr>
      <tr><td>Gender</td><td>${esc(p.gender || "—")}</td></tr>
    </table></div>`;
  }
  if (orgs.length) {
    html += `<div class="card"><div class="card-title">Organizations</div>`;
    for (const o of orgs) {
      const npi = o.identifier?.find((i) => (i.system || "").includes("npi"))?.value;
      html += `<div class="org-row"><div><div>${esc(o.name || "Unnamed")}</div><div class="card-sub">${npi ? "NPI " + esc(npi) : ""}</div></div>
        <span class="badge badge-neutral">${esc(o.type?.[0]?.coding?.[0]?.code || "—")}</span></div>`;
    }
    html += `</div>`;
  }
  return html;
}

function mini(label, val, mono, span) {
  return `<div class="mini-card${span ? " span2" : ""}"><div class="mc-label">${esc(label)}</div><div class="mc-val${mono ? " mono" : ""}">${esc(val)}</div></div>`;
}

export function syntaxHighlight(json) {
  return esc(json).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (m) => {
      let cls = "json-num";
      if (/^"/.test(m)) cls = /:$/.test(m) ? "json-key" : "json-str";
      else if (/true|false/.test(m)) cls = "json-bool";
      else if (/null/.test(m)) cls = "json-null";
      return `<span class="${cls}">${m}</span>`;
    }
  );
}

export function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
