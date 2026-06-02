// PAS $inquire Tester — UI controller.
import { onUser, signOutUser } from "./auth.js";
import { SCHEMA, RUNTIME_KEYS, vars } from "./vars.js";
import { TESTS } from "./tests/index.js";
import { renderFormatted, syntaxHighlight, esc } from "./claimResponse.js";

const $ = (sel) => document.querySelector(sel);
const results = {};      // testId -> result
let selected = null;

// ─── Auth gate: bounce to login.html when signed out ───────────────────────────
onUser((user) => {
  if (!user) { location.replace("login.html"); return; }
  $("#loading").hidden = true;
  $("#app").hidden = false;
  $("#userEmail").textContent = user.email || "";
  if (!$("#app").dataset.built) { buildApp(); $("#app").dataset.built = "1"; }
});

$("#signOutBtn").addEventListener("click", () => signOutUser());

// ─── Build the app once signed in ──────────────────────────────────────────────
function buildApp() {
  renderVars();
  renderRuntime();
  renderTests();
  $("#runAllBtn").addEventListener("click", runAll);
  $("#resetRuntimeBtn").addEventListener("click", () => {
    for (const k of RUNTIME_KEYS) vars.setRuntime(k, "");
    renderRuntime();
    toast("Runtime variables cleared");
  });
}

// ─── Variables panel ────────────────────────────────────────────────────────────
function renderVars() {
  const host = $("#varsPanel");
  host.innerHTML = "";
  for (const grp of SCHEMA) {
    const det = document.createElement("details");
    det.open = ["Endpoints", "OAuth"].includes(grp.group);
    det.innerHTML = `<summary>${esc(grp.group)}</summary>`;
    const wrap = document.createElement("div");
    wrap.className = "vgroup";
    for (const f of grp.fields) {
      const id = "var_" + f.key;
      const field = document.createElement("div");
      field.className = "field";
      let control;
      if (f.type === "select") {
        control = `<select id="${id}">${f.options.map((o) => `<option ${o === vars.getForm(f.key) ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
      } else {
        control = `<input id="${id}" type="${f.type || "text"}" value="${esc(vars.getForm(f.key))}" placeholder="${esc(f.placeholder || "")}" ${f.secret ? "autocomplete=\"off\"" : ""}/>`;
      }
      field.innerHTML = `<label for="${id}">${esc(f.label)}${f.secret ? ' <span class="secret-tag">secret · not stored</span>' : ""}</label>${control}`;
      wrap.appendChild(field);
    }
    det.appendChild(wrap);
    host.appendChild(det);
  }
  host.addEventListener("input", (e) => {
    const key = e.target.id.replace(/^var_/, "");
    if (key && key !== e.target.id) vars.setForm(key, e.target.value);
  });
}

function renderRuntime() {
  const host = $("#runtimePanel");
  const rows = RUNTIME_KEYS.map((k) => {
    const val = vars.getRuntime(k);
    const shown = k === "accessToken" && val ? val.slice(0, 12) + "…" : val;
    return `<tr><td>${esc(k)}</td><td class="mono">${esc(shown) || '<span class="muted">—</span>'}</td></tr>`;
  }).join("");
  host.innerHTML = `<table class="kv">${rows}</table>`;
}

// ─── Tests list ──────────────────────────────────────────────────────────────
function renderTests() {
  const host = $("#testList");
  host.innerHTML = "";
  let lastGroup = null;
  for (const t of TESTS) {
    if (t.group !== lastGroup) {
      const h = document.createElement("div");
      h.className = "group-label";
      h.textContent = t.group;
      host.appendChild(h);
      lastGroup = t.group;
    }
    const card = document.createElement("div");
    card.className = "test-card";
    card.id = "card_" + t.id;
    card.innerHTML = `
      <div class="dot" id="dot_${t.id}"></div>
      <div class="tc-body">
        <div class="tc-name">${esc(t.name)}</div>
        <div class="tc-doc">${esc(t.doc || "")}</div>
        <div class="tc-status" id="status_${t.id}"></div>
      </div>
      <button class="btn btn-sm" id="run_${t.id}">Run</button>`;
    card.querySelector(".tc-body").addEventListener("click", () => select(t.id));
    card.querySelector("#run_" + t.id).addEventListener("click", (e) => { e.stopPropagation(); runTest(t); });
    host.appendChild(card);
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────
async function runTest(t) {
  setDot(t.id, "spin");
  $("#status_" + t.id).textContent = "Running…";
  try {
    const result = await t.run({ vars });
    results[t.id] = result;
    setDot(t.id, result.ok ? "ok" : "err");
    const passed = result.assertions.filter((a) => a.pass).length;
    $("#status_" + t.id).innerHTML =
      `<span class="${result.ok ? "status-ok" : "status-err"}">${result.ok ? "PASS" : "FAIL"}</span> · ${passed}/${result.assertions.length} checks · HTTP ${result.status}${result.durationMs != null ? " · " + result.durationMs + "ms" : ""}`;
  } catch (e) {
    results[t.id] = { ok: false, status: 0, assertions: [{ label: "Request error", pass: false }], response: { error: e.message }, request: {} };
    setDot(t.id, "err");
    $("#status_" + t.id).innerHTML = `<span class="status-err">ERROR</span> · ${esc(e.message)}`;
  }
  renderRuntime();
  select(t.id);
}

async function runAll() {
  $("#runAllBtn").disabled = true;
  for (const t of TESTS) { await runTest(t); }
  $("#runAllBtn").disabled = false;
}

function setDot(id, state) { $("#dot_" + id).className = "dot " + state; }

// ─── Detail viewer ─────────────────────────────────────────────────────────────
function select(testId) {
  selected = testId;
  document.querySelectorAll(".test-card").forEach((c) => c.classList.toggle("active", c.id === "card_" + testId));
  renderDetail();
}

function renderDetail() {
  const host = $("#detail");
  const r = results[selected];
  const t = TESTS.find((x) => x.id === selected);
  if (!r) {
    host.innerHTML = `<div class="empty-state"><p>Select a test and click <strong>Run</strong> to see assertions, the formatted ClaimResponse, raw JSON, and the request bundle.</p></div>`;
    return;
  }
  const hasClaimResponse = r.response?.entry?.some?.((e) => e.resource?.resourceType === "ClaimResponse");
  const tab = host.dataset.tab && ["assert", "formatted", "raw", "request"].includes(host.dataset.tab) ? host.dataset.tab : (hasClaimResponse ? "formatted" : "assert");

  const tabs = [
    ["assert", "Assertions"],
    ...(hasClaimResponse ? [["formatted", "Formatted"]] : []),
    ["raw", "Response JSON"],
    ["request", "Request"],
  ];
  let bodyHtml = "";
  if (tab === "assert") {
    bodyHtml = `<div class="detail-pad"><div class="card-title" style="margin-bottom:8px">${esc(t.name)}</div>` +
      r.assertions.map((a) => `<div class="assert-row"><span class="${a.pass ? "status-ok" : "status-err"}">${a.pass ? "✓" : "✗"}</span> ${esc(a.label)}</div>`).join("") +
      `</div>`;
  } else if (tab === "formatted") {
    bodyHtml = `<div class="detail-pad">${renderFormatted(r.response)}</div>`;
  } else if (tab === "raw") {
    bodyHtml = `<pre class="pre-wrap">${syntaxHighlight(JSON.stringify(r.response ?? {}, null, 2))}</pre>`;
  } else {
    bodyHtml = `<div class="detail-pad"><div class="card-sub">${esc(r.request?.method || "")} ${esc(r.request?.url || "")}</div></div>` +
      `<pre class="pre-wrap">${syntaxHighlight(JSON.stringify(r.request?.body ?? r.request ?? {}, null, 2))}</pre>`;
  }
  host.innerHTML = `<div class="tabs">${tabs.map(([k, lbl]) => `<div class="tab ${k === tab ? "active" : ""}" data-tab="${k}">${lbl}</div>`).join("")}</div><div class="tab-body">${bodyHtml}</div>`;
  host.querySelectorAll(".tab").forEach((el) => el.addEventListener("click", () => { host.dataset.tab = el.dataset.tab; renderDetail(); }));
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1800);
}
