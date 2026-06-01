# CMS-0057 Prior Authorization Support (PAS) API Testing Tool

An interactive, highly premium testing dashboard designed to validate and execute CMS-0057 mandated Prior Authorization Support (PAS) FHIR R4 APIs. 

Built using a lightweight Node.js Express CORS-bypass proxy and a modular client-side Vite application, this tool enables providers, developers, and payers to easily draft, inspect, and execute PAS transactions.

---

## 🌟 Key Features

1. **Interactive PAS FHIR Request Builder**: Draft complex FHIR R4 `Bundle` payloads with complete clinical resources (`Claim`, `Patient`, `Coverage`, `Practitioner`, `ServiceRequest`, `MedicationRequest`, `Encounter`).
2. **Built-in Adjudication Sandbox**: Fully functional mock engine that simulates standard approved prior authorizations, expedited/urgent reviews, and medication adjudications locally without requiring external PAS servers.
3. **CORS-Bypass Node.js Proxy**: Resolves all browser CORS restrictions by proxying authorization transactions directly to external payer FHIR endpoints securely.
4. **Clinical Payload Map**: Translates dense FHIR resource properties into clear, human-readable overview panels for immediate inspection.
5. **Real-time Adjudication Decoders**: Automatically parses returned `ClaimResponse` resource bundles, providing color-coded status banners and line-item decision logs.
6. **FHIR-to-X12 278 Mapping Visualizer**: Explains how JSON structures map to standard HIPAA-mandated ASC X12 278 Prior Authorization transaction loops and segments under the hood.

---

## ⚙️ Quick Start

Follow these steps to launch the PAS Testing Suite locally:

### 1. Install Dependencies
Initialize npm dependencies for the project:
```bash
npm install
```

### 2. Launch the Adjudication CORS Proxy (Port 3001)
Start the backend proxy server:
```bash
node server.js
```

### 3. Start the Web Dashboard
Launch the Vite development server in another terminal session:
```bash
npm run dev
```

Open the local address printed by Vite (typically `http://localhost:5173`) in your web browser.

---

## 🔍 How to Test

### Standalone Local Mock Sandbox
1. Set the **Target PAS Server URL** to `mock-pas-server`.
2. Choose a preset template in the sidebar (e.g. **Standard Clinical PA**, **Expedited Urgent PA**, or **Medication Specialty PA**).
3. Review the parsed fields under the **Clinical Payload Map** tab.
4. Click **Send PAS Request** to trigger an adjudication.
5. Verify outcomes under the **FHIR Response (JSON)** and **Adjudication Breakdown** tabs.

### Testing External Payer sandboxes
1. Change the **Target PAS Server URL** to your target server's FHIR endpoint (e.g. `https://sandbox.payer.org/fhir/Claim/$submit`).
2. Add your authentication token in the headers area (e.g., `Authorization` -> `Bearer your-access-token`).
3. Click **Send PAS Request**; our proxy server will securely forward the request, bypass CORS, and return the payer response directly to your inspector.

---

## 🗺️ FHIR ↔ X12 278 Mapping Table

| FHIR Resource & Property | ASC X12 278 Equivalent Segment / Loop | Purpose |
| :--- | :--- | :--- |
| `Patient.name.family / given` | Loop 2010CA, `NM1*IL` (Subscriber Name) | Identifies patient coverage holder |
| `Practitioner.npi` | Loop 2010AA, `NM1*1Y` (Billing Provider NPI) | Identifies requesting clinician |
| `Claim.priority` (e.g. `stat`) | Loop 2000C, `UM03` (Urgent clinical flags) | Requests expedited status |
| `Claim.item.productOrService` | Loop 2000C, `SV1` or `SV2` Service Lines | Specific CPT/HCPCS/RxNorm code |
| `ClaimResponse.outcome` | Loop 2000F, `HCR01` (Action Code e.g. "A" / "A3") | Adjudication decision (Approved, Pended, Denied) |
| `ClaimResponse.id` | Loop 2000F, `HCR03` (Auth Reference Number) | Prior Authorization reference code |
