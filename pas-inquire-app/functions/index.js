/**
 * pasProxy — Cloud Function (2nd gen) backing the PAS $inquire Tester.
 *
 * Two jobs:
 *   POST /api/token  — OAuth2 client-credentials broker (client sends clientId/secret,
 *                      we mint an eviCore access token and return it).
 *   POST /api/proxy  — generic CORS-bypass forwarder to the payer FHIR server.
 *
 * Every call is gated by Firebase Auth (ID token) + App Check. No credentials,
 * tokens, or request bodies are ever logged or persisted.
 *
 * The eviCore access token is carried inside the JSON body's `headers` object
 * (NOT the HTTP Authorization header — that header holds the Firebase ID token).
 */
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";
import express from "express";

initializeApp();

const IS_EMULATOR = process.env.FUNCTIONS_EMULATOR === "true";
// App Check is enforced in prod only when APP_CHECK_REQUIRED=true (set it after you
// register a reCAPTCHA Enterprise key). Firebase Auth is ALWAYS required regardless.
const ENFORCE_APP_CHECK = process.env.APP_CHECK_REQUIRED === "true";

// Optional server-side allow-list (defense in depth alongside the client gate).
// Configure via function env: ALLOWED_EMAILS="a@x.com,b@x.com" / ALLOWED_EMAIL_DOMAIN="x.com"
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || "")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "").trim().toLowerCase();

const app = express();
app.use(express.json({ limit: "10mb" }));

// Same-origin in prod (hosting rewrite). Allow localhost during dev.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Firebase-AppCheck");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(204).send("");
  next();
});

function emailAllowed(email) {
  if (!email) return false;
  const e = email.toLowerCase();
  if (ALLOWED_EMAILS.length && ALLOWED_EMAILS.includes(e)) return true;
  if (ALLOWED_EMAIL_DOMAIN && e.endsWith("@" + ALLOWED_EMAIL_DOMAIN)) return true;
  return !ALLOWED_EMAILS.length && !ALLOWED_EMAIL_DOMAIN; // unconfigured = allow any verified user
}

// Auth + App Check gate.
async function gate(req, res) {
  // App Check (skipped against the local emulator; enforced in prod only when configured)
  if (!IS_EMULATOR && ENFORCE_APP_CHECK) {
    const acToken = req.header("X-Firebase-AppCheck");
    if (!acToken) { res.status(401).json(err("Missing App Check token")); return null; }
    try { await getAppCheck().verifyToken(acToken); }
    catch { res.status(401).json(err("Invalid App Check token")); return null; }
  }
  // Firebase Auth ID token
  const authz = req.header("Authorization") || "";
  const m = authz.match(/^Bearer\s+(.+)$/i);
  if (!m) { res.status(401).json(err("Missing Firebase ID token")); return null; }
  let decoded;
  try { decoded = await getAuth().verifyIdToken(m[1]); }
  catch { res.status(401).json(err("Invalid Firebase ID token")); return null; }
  if (!emailAllowed(decoded.email)) {
    res.status(403).json(err("User not authorized for this app")); return null;
  }
  return decoded;
}

function err(message) {
  return {
    ok: false, status: 0, statusText: "Proxy Error",
    body: { resourceType: "OperationOutcome", issue: [{ severity: "error", code: "security", diagnostics: message }] },
  };
}

// ─── POST /api/token — OAuth2 client credentials ──────────────────────────────
app.post("/token", async (req, res) => {
  if (!(await gate(req, res))) return;
  const { tokenUrl, clientId, clientSecret, scope } = req.body || {};
  if (!tokenUrl || !clientId || !clientSecret) {
    return res.status(400).json(err("token request requires tokenUrl, clientId, clientSecret"));
  }
  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (scope) form.set("scope", scope);

  const started = Date.now();
  try {
    const r = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: form.toString(),
    });
    const text = await r.text();
    let parsed; try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    return res.status(200).json({
      ok: r.ok, status: r.status, statusText: r.statusText,
      body: parsed, durationMs: Date.now() - started,
    });
  } catch (e) {
    return res.status(200).json({ ok: false, status: 0, statusText: "Token fetch failed",
      body: { error: "network_error", error_description: e.message }, durationMs: Date.now() - started });
  }
});

// ─── POST /api/proxy — forward an arbitrary FHIR request ──────────────────────
app.post("/proxy", async (req, res) => {
  if (!(await gate(req, res))) return;
  const { url, method = "POST", headers = {}, body } = req.body || {};
  if (!url) return res.status(400).json(err('proxy request requires "url"'));

  const started = Date.now();
  try {
    const opts = {
      method: method.toUpperCase(),
      headers: { Accept: "application/json", ...headers },
    };
    if (body != null && ["POST", "PUT", "PATCH"].includes(opts.method)) {
      opts.body = typeof body === "string" ? body : JSON.stringify(body);
      if (!Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) {
        opts.headers["Content-Type"] = "application/json";
      }
    }
    const r = await fetch(url, opts);
    const ct = r.headers.get("content-type") || "";
    const respBody = ct.includes("json") ? await r.json().catch(() => null) : await r.text();
    const outHeaders = {};
    r.headers.forEach((v, k) => { outHeaders[k] = v; });
    return res.status(200).json({
      ok: r.ok, status: r.status, statusText: r.statusText,
      headers: outHeaders, body: respBody, durationMs: Date.now() - started,
    });
  } catch (e) {
    return res.status(200).json({ ok: false, status: 0, statusText: "Proxy failed",
      body: { resourceType: "OperationOutcome", issue: [{ severity: "fatal", code: "exception", diagnostics: e.message }] },
      durationMs: Date.now() - started });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok", emulator: IS_EMULATOR }));

// Hosting rewrites strip nothing, so requests arrive as /api/token etc.
const router = express();
router.use("/api", app);
router.use("/", app); // allow direct emulator calls without the /api prefix

export const pasProxy = onRequest({ region: "us-central1", cors: false }, router);
