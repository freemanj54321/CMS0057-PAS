# CMS-0057 PAS — Project Overview

A developer overview of this codebase and the broader **Status Check API → Da Vinci PAS migration** effort it supports.

---

## 1. The app — `pas-inquire-app/` (default)

The project's app is **[pas-inquire-app/](pas-inquire-app/)** — a locked-down web app that makes **native** API calls to the CMS-0057 / Da Vinci PAS **`Claim/$inquire`** endpoint (plus its OAuth and Plan-Net discovery calls). Each request from the Bruno collection (§3) is reproduced as its own runnable **test** with pass/fail assertions.

- **No secrets in the repo** — OAuth Client ID/Secret are entered in the UI per session, held in memory only.
- **Runs locally and on Firebase** from one codebase (Hosting + a Cloud Function proxy).
- **Gated** by Firebase Authentication + App Check.

### Architecture

```
Browser (Hosting, vanilla JS)  ──/api/**──►  pasProxy (Cloud Function, Node 20)  ──►  payer UAT
   public/js/*                  (Hosting rewrite)   verifies Auth + App Check        OAuth / Plan-Net / $inquire
```

The browser never calls the payer directly (CORS + secret hygiene). The function adds no credentials of its own — the payer access token rides inside the proxied request body's `headers`, while the HTTP `Authorization` header carries the Firebase ID token.

- **`public/js/vars.js`** — full ~50-variable schema (grouped, editable) seeded with non-sensitive placeholders.
- **`public/js/bundleBuilders.js`** — FHIR request-bundle builders (full 11-resource graph + minimal 5-resource graph), ported from the Bruno `.bru` bodies.
- **`public/js/tests/*`** — one test per Bruno request: OAuth, Plan-Net 0–5, and the `$inquire` variants. "Run all" chains them (discovery → token → inquire).
- **`functions/index.js`** — `pasProxy`: `/api/token` (OAuth broker) + `/api/proxy` (FHIR forwarder), Auth + App Check gating.

### Run it

See **[pas-inquire-app/README.md](pas-inquire-app/README.md)** for full setup. In short:

```bash
cd pas-inquire-app/functions && npm install && cd ..
cp public/js/firebaseConfig.example.js public/js/firebaseConfig.js   # fill in your project
firebase emulators:start --only functions,hosting,auth
```

---

## 2. Business context — the Status Check API project

This tool exists to support the migration of eviCore's commercial **Status Check API** onto the **CMS-0057 / Da Vinci PAS** standard. Background gathered from the *Status Check API* project files (Google Drive → "Status Check API" folder; mirrored under [reference/](reference/)):

### History (from `Status_API_History.pptx` / `eviCore API Strategy and Tactics.docx`)

| Period | Milestone |
|--------|-----------|
| 2022 | Security audit finds ~100M bot logins/yr on eviCore portals. Shape (F5) + MFA deployed; a "special header" + whitelist created as a workaround to avoid partner disruption. |
| Pre-2024 | **Bot era** — RCM channel partners scrape the eviCore portal with fragile bots. |
| 2024 | **Status Check API launches** — FHIR REST API replaces bots; 10+ RCM partners onboarded; ~$800K ARR projected. |
| Early 2025 | Scale & friction — BCBS AL, Scott & White go live; NPI-mismatch and pipeline-latency issues. |
| Jul 2025 | **CMS business case (P-029178) approved** — migration to **Da Vinci PAS `$inquire`** mandated; new sales/implementations paused. |
| Dec 2025 | Security crisis — Shape + Auth0 overhaul breaks all bots; emergency "special headers" deployed. |
| 2026 | Migration in progress; blocked on USR-463 (Burden Reduction); ~25 open issues tracked in `Migration_to_PAS_Issue_Log.docx`. |

### Regulatory driver — CMS-0057-F

Passed **Jan 17, 2024** (89 FR 8758, effective Feb 8 2024). Mandates three FHIR APIs for burden reduction: **CRD** (Coverage Requirements Discovery), **DTR** (Documentation Templates & Rules), and **PAS** (Prior Authorization Support). **Compliance deadline: January 1, 2027.** Migrating partners from bots/Status Check API to standards-based PAS is both a compliance requirement and a way to retire the security workarounds.

---

## 3. `reference/` — build spec

Mirrored from the Status Check API project. The app in §1 was **ported from** this material; it is not executed at runtime.

- **[reference/bruno/](reference/bruno/)** — the complete **"Da Vinci PAS `$inquire` (STU 2.0.1)"** Bruno API collection (23 files) for testing real payer (eviCore) PAS endpoints. Includes the OAuth client-credentials request, the five `$inquire` variants plus the original `PAS $Inquire.bru` and `Inquire - Full Bundle (UAT).bru`, a `Plan Net - Payer Directory/` discovery folder (steps 0–5), and `Default` / `UAT` / `UAT - eviCore` environments. See [reference/bruno/README.md](reference/bruno/README.md) for the full request inventory, variable map, and run order. Copied byte-for-byte from the source collection at `…/eviCore-John-PC/pas-inquire-collection`.

> The original `pas-inquire-tester.html` mockup that informed the app's UI was removed from this repo; the source remains at `C:\Users\freem\Dev\Status Check\`.

> ⚠️ **Secrets:** the Bruno `UAT` / `UAT - eviCore` environment `clientId`/`clientSecret` values have been replaced with `YOUR_CLIENT_ID` / `YOUR_CLIENT_SECRET` placeholders. The files still contain eviCore's synthetic UAT test data (member, NPIs); rotate/clear before any public push if that matters to you.

---

## 4. Key references

- Da Vinci PAS IG (STU 2.0.1): https://hl7.org/fhir/us/davinci-pas/STU2/
- Da Vinci Plan Net (STU 1.1.0): http://hl7.org/fhir/us/davinci-pdex-plan-net/STU1.1/
- CMS-0057-F final rule: https://www.cms.gov/prior-authorization-interoperability-and-patient-access-final-rule-cms-0057-f
