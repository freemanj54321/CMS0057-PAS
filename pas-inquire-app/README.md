# PAS `$inquire` Tester

A locked-down web app for exercising the CMS-0057 / Da Vinci PAS **`Claim/$inquire`**
endpoint (and its supporting OAuth + Plan-Net discovery calls) with **native API
calls**. Each request from the Bruno collection is reproduced as its own runnable
**test** with pass/fail assertions.

- **No secrets in the repo.** OAuth Client ID/Secret are entered in the UI per session
  and held in memory only.
- **Runs locally and on Firebase** from one codebase (Hosting + a Cloud Function proxy).
- **Gated** by Firebase Authentication + App Check.

> The Bruno collection and the original HTML mockup live in `../reference/` and are the
> **specification** these tests were ported from — they are not executed at runtime.

## Architecture

```
Browser (Hosting, vanilla JS)  ──/api/**──►  pasProxy (Cloud Function, Node 20)  ──►  payer UAT
   public/js/*                  (Hosting rewrite)   verifies Auth + App Check        OAuth / Plan-Net / $inquire
```

The browser never calls the payer directly (CORS + secret hygiene). The function
adds no credentials of its own — the eviCore access token travels inside the proxied
request body's `headers`, while the HTTP `Authorization` header carries the Firebase ID token.

## Files

| Path | Purpose |
|------|---------|
| `public/index.html`, `css/styles.css` | UI shell |
| `public/js/vars.js` | full variable schema (from `reference/.../Default.bru`) + form/runtime stores |
| `public/js/bundleBuilders.js` | FHIR request-bundle builders (full + minimal graphs) |
| `public/js/claimResponse.js` | ClaimResponse formatter |
| `public/js/auth.js`, `api.js` | Firebase Auth/App Check + proxy client |
| `public/js/tests/*` | one test per Bruno request (OAuth, Plan-Net 0–5, 5 `$inquire` variants) |
| `functions/index.js` | `pasProxy`: `/api/token` + `/api/proxy`, Auth + App Check gating |

## Prerequisites

- Node 20, `firebase-tools` (`npm i -g firebase-tools`)
- A Firebase project on the **Blaze** plan (Cloud Functions need billing for outbound calls)
- Auth: enable **Google** sign-in; App Check: register a **reCAPTCHA Enterprise** web key

## Setup

```bash
cd pas-inquire-app
# 1. backend deps
cd functions && npm install && cd ..
# 2. project + web config (NOT committed)
#    set your project id in .firebaserc, then:
cp public/js/firebaseConfig.example.js public/js/firebaseConfig.js
#    edit firebaseConfig.js with your web config + reCAPTCHA key + allowed users
```

`firebaseConfig.js` controls who may sign in (`ALLOWED_EMAILS` / `ALLOWED_EMAIL_DOMAIN`).
Mirror the same allow-list on the function via env (`ALLOWED_EMAILS`, `ALLOWED_EMAIL_DOMAIN`)
for server-side enforcement.

## Run locally

```bash
firebase emulators:start --only functions,hosting,auth
# open the Hosting URL (default http://localhost:5000)
```

Local notes: the Auth emulator is used for sign-in; App Check is **skipped** in the
emulator (the client sends a debug token, the function bypasses App Check when
`FUNCTIONS_EMULATOR` is set). For local sign-in you can add a user in the Auth emulator UI.

## Deploy (manual)

```bash
firebase deploy   # hosting + functions
```

After deploy, **enforce App Check** on the function in the Firebase console and confirm
only allow-listed users can sign in.

## Deploy (CI/CD — GitHub Actions)

Workflows live in `.github/workflows/` (repo root):

- **`firebase-deploy.yml`** — on push to `main` (touching `pas-inquire-app/**`): installs deps, syntax-checks, regenerates `firebaseConfig.js` + the function env, and deploys **hosting + functions** to live. Also runnable via *Run workflow* (workflow_dispatch).
- **`firebase-pr-preview.yml`** — on pull requests: syntax checks + deploys a 7-day **Hosting preview channel** (`pr-<number>`). Previews route `/api/**` to the **live** `pasProxy` function, so deploy live once first.

Because `public/js/firebaseConfig.js` and `functions/.env.*` are git-ignored, CI **regenerates** them: the public web config is baked into the workflow, while the allow-list / App Check toggle come from repo **Variables**.

### One-time GitHub setup

1. **Service account** (Google Cloud console → *IAM & Admin → Service Accounts*, project `cms0057-pas-inquire`):
   - Create `github-deployer`, grant: **Firebase Hosting Admin**, **Cloud Functions Admin**, **Cloud Run Admin**, **Artifact Registry Administrator**, **Service Account User**, **Firebase Authentication Viewer** (or simply **Editor** + **Service Account User** for an internal project).
   - Create a **JSON key** and download it.
2. **Repo secret** (GitHub → *Settings → Secrets and variables → Actions → Secrets*):
   - `FIREBASE_SERVICE_ACCOUNT` = the full JSON key contents.
3. **Repo variables** (same screen → *Variables*, all optional):
   - `ALLOWED_EMAILS` (comma-separated), `ALLOWED_EMAIL_DOMAIN`, `APP_CHECK_SITE_KEY`, `APP_CHECK_REQUIRED` (`true`/`false`).
4. Ensure the project is on **Blaze** (functions deploy needs billing).

Push to `main` (or run the workflow manually) to deploy.

## Using it

1. Open the app, sign in.
2. In **Variables**, enter the payer endpoints and your **Client ID / Secret** (OAuth group).
3. Run tests individually, or **Run all (in order)**:
   `Plan Net 0–5` (discovery, populates `payerFhirBaseUrl`/`payerOrgId`) → `OAuth` (mints token) → `$inquire` variants.
4. Each test shows **PASS/FAIL** with assertions, the formatted ClaimResponse, raw JSON, and the outgoing request bundle. Chained values appear under **Runtime variables**.

If the payer doesn't publish Plan-Net, skip steps 1–5 and set `PAS FHIR base URL` (`baseUrl`) directly, then run OAuth + an `$inquire`.

## Tests (one per Bruno request)

`OAuth — Get Access Token` · `Plan Net 0–5` · `Inquire — Full Bundle` · `Inquire — Specific PA Lookup` · `Inquire — Broad Patient Query` · `Inquire — By Service Code` · `Inquire — Minimum Viable`.
(`PAS $Inquire.bru` and `Inquire - Full.bru`/`Inquire - Full Bundle (UAT).bru` are byte-identical; collapsed into one **Full Bundle** test.)

## Known gaps / to verify

- **OAuth shape** — implemented per `OAuth - Get Access Token.bru` (form-urlencoded `grant_type=client_credentials`). The old mockup used multipart `Client_Id`/`Client_Secret`; confirm which eviCore UAT accepts and adjust `functions/index.js#/token` if needed.
- **eviCore UAT IP allow-listing** — if the payer restricts source IPs, add a VPC connector + Cloud NAT for a static egress IP (Cloud Functions egress is otherwise dynamic).
- **Minimal-variant fidelity** — Broad / By-Service / Minimum-Viable share one minimal builder parameterized by service code; sufficient for native calls but not a byte copy of each `.bru` body.
- **Token expiry** — `tokenExpiresAt` is tracked/surfaced; re-run OAuth when expired.
