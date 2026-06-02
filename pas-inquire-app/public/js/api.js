// Thin client for the pasProxy backend. Same-origin /api in both local and prod
// (Firebase Hosting rewrite). Attaches Firebase Auth + App Check headers.

import { authHeaders } from "./auth.js";

async function post(path, payload) {
  const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
  const r = await fetch(path, { method: "POST", headers, body: JSON.stringify(payload) });
  // The proxy always returns 200 with an envelope, except for auth failures.
  const data = await r.json().catch(() => ({ ok: false, status: r.status, body: { error: "Bad proxy response" } }));
  if (r.status === 401 || r.status === 403) {
    throw new Error(data?.body?.issue?.[0]?.diagnostics || "Not authorized (" + r.status + ")");
  }
  return data;
}

/** OAuth2 client-credentials via the proxy. */
export function fetchToken({ tokenUrl, clientId, clientSecret, scope }) {
  return post("/api/token", { tokenUrl, clientId, clientSecret, scope });
}

/** Forward a FHIR request via the proxy. headers may include the eviCore Bearer. */
export function proxy({ url, method = "POST", headers = {}, body }) {
  return post("/api/proxy", { url, method, headers, body });
}
