// OAuth - Get Access Token  (ported from reference/bruno/OAuth - Get Access Token.bru)
import { fetchToken } from "../api.js";

const A = (label, pass) => ({ label, pass: !!pass });

export const oauthTest = {
  id: "oauth",
  name: "OAuth — Get Access Token",
  group: "Auth",
  doc: "Client-credentials flow. Sets accessToken + tokenExpiresAt for downstream $inquire calls.",
  async run({ vars }) {
    const req = {
      tokenUrl: vars.get("tokenEndpoint"),
      clientId: vars.get("clientId"),
      clientSecret: vars.get("clientSecret"),
      scope: vars.get("oauthScope"),
    };
    if (!req.clientId || !req.clientSecret) {
      return { ok: false, status: 0, request: { ...req, clientSecret: "***" },
        assertions: [A("Client ID & secret provided", false)],
        response: { error: "Enter Client ID and Client Secret in the Variables panel first." } };
    }
    const res = await fetchToken(req);
    const body = res.body || {};
    const hasToken = res.status === 200 && typeof body.access_token === "string" && body.access_token.length > 0;
    if (hasToken) {
      vars.setRuntime("accessToken", body.access_token);
      if (body.expires_in) {
        vars.setRuntime("tokenExpiresAt", new Date(Date.now() + body.expires_in * 1000).toISOString());
      }
    }
    return {
      ok: hasToken, status: res.status, durationMs: res.durationMs,
      request: { ...req, clientSecret: "***", grant_type: "client_credentials" },
      response: hasToken ? { token_type: body.token_type, expires_in: body.expires_in, scope: body.scope,
        access_token: body.access_token.slice(0, 16) + "…(stored in memory)" } : body,
      assertions: [
        A("HTTP 200", res.status === 200),
        A("access_token present", hasToken),
        A("token_type is bearer", (body.token_type || "").toLowerCase() === "bearer"),
      ],
    };
  },
};
