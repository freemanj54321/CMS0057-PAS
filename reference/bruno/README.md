# PAS $inquire — Bruno API Collection

Complete Bruno collection for testing Da Vinci PAS (Prior Authorization Support)
`$inquire` operations per STU 2.0.1.

## Request Inventory

### Plan Net — Payer Directory (unauthenticated)
| # | Request | Purpose |
|---|---------|---------|
| 0 | Capability Statement | Discover server capabilities |
| 1 | Resolve Payer Organization | Find payer by NPI → sets `payerOrgId`, `payerOrgName` |
| 2 | Discover Payer FHIR Endpoint | Find PAS endpoint → sets `payerFhirBaseUrl`, `discoveredTokenEndpoint` |
| 3 | Verify Provider in Network | Confirm provider → sets `providerFhirId` |
| 4 | Lookup Insurance Plans | Find plans → sets `insurancePlanId`, `insurancePlanName` |
| 5 | Search Healthcare Services | Browse available services |

### OAuth
| Request | Purpose |
|---------|---------|
| OAuth - Get Access Token | Client credentials flow → sets `accessToken`, `tokenExpiresAt` |

### $inquire Requests
| Request | Description | Use When |
|---------|-------------|----------|
| **Inquire - Full Bundle (UAT)** | Complete FHIR bundle matching eviCore UAT structure. Includes Encounter, Condition, ServiceRequest, PractitionerRole, Practitioner, managing Org, and full CareTeam. | Testing against eviCore or payers requiring full resource graph |
| Inquire - Specific PA Lookup | Minimal bundle querying by PA reference number | You have the payer-assigned auth number |
| Inquire - Broad Patient Query | Minimal bundle querying all auths for a patient | Check all authorizations for a member |
| Inquire - By Service Code | Minimal bundle filtered by CPT/HCPCS code | Find auths for a specific service |
| Inquire - Minimum Viable Request | Bare-bones Claim + Patient + Coverage + Orgs | Connectivity testing / smoke tests |

## Quick Start

### Option A — Full Chain (recommended)
1. Select the **UAT - eviCore** environment (or configure Default)
2. Run requests in order:
   - Plan Net Step 1 → Step 2 → OAuth → any $inquire variant
   - Each step auto-populates variables for the next

### Option B — Direct (skip Plan Net)
1. Set `baseUrl` directly to payer's PAS FHIR base URL
2. Set `accessToken` manually (or run OAuth only)
3. Run any $inquire variant directly

### Option C — UAT with Full Bundle
1. Select the **UAT - eviCore** environment
2. Run **OAuth - Get Access Token**
3. Run **Inquire - Full Bundle (UAT)**
   - All UAT values pre-populated
   - UUIDs auto-generated per request

## Environments

### Default
Generic placeholder values. Copy and customize for your payer.

### UAT - eviCore
Pre-populated with actual eviCore UAT test data extracted from the project's
`PAS $Inquire.bru` file. Ready to use once OAuth credentials are confirmed.

## Variable Reference

### Variable Mapping — Project File → Collection

Below shows every hardcoded value from the original `PAS__Inquire.bru` and
its corresponding environment variable:

| Original Hardcoded Value | Variable | Section |
|--------------------------|----------|---------|
| **URL & Auth** | | |
| `https://evicorebrpoc.evicore.com/hi2br/pas/Claim/$inquire` | `{{payerFhirBaseUrl}}/Claim/$inquire` | auto |
| Hardcoded JWT bearer token | `{{accessToken}}` | auto |
| **Patient / Member** | | |
| `INDVBXERLY` | `{{patientLastName}}` | Patient |
| `AJMEOARWN` | `{{patientFirstName}}` | Patient |
| `male` | `{{patientGender}}` | Patient |
| `1973-07-05` | `{{patientBirthDate}}` | Patient |
| `M` (birthsex) | `{{patientBirthSex}}` | Patient |
| `U1000774901` (member ID) | `{{memberIdValue}}` | Patient |
| `U1000774901` (subscriber) | `{{subscriberId}}` | Patient |
| `self` | `{{relationshipCode}}` | Patient |
| `BurdenReduction` | `{{coveragePlanName}}` | Patient |
| **Requestor Organization** | | |
| `INOVA FAIRFAX HOSPITAL` | `{{providerOrgName}}` | Provider |
| `1427227578` (NPI) | `{{providerNpi}}` | Provider |
| `540620889` (TIN) | `{{providerTin}}` | Provider |
| `3300 GALLOWS RD` | `{{providerAddressLine}}` | Provider |
| `FALLS CHURCH` | `{{providerCity}}` | Provider |
| `VA` | `{{providerState}}` | Provider |
| `22042` | `{{providerPostalCode}}` | Provider |
| `7037764001` | `{{providerPhone}}` | Provider |
| `5747646736` | `{{providerContactPhone}}` | Provider |
| **Attending Practitioner** | | |
| `9999999999` (NPI) | `{{practitionerNpi}}` | Practitioner |
| `Garudwar` | `{{practitionerLastName}}` | Practitioner |
| `Sainath` | `{{practitionerFirstName}}` | Practitioner |
| `sainath.garudwar@evicore.com` | `{{practitionerEmail}}` | Practitioner |
| `9028813347` | `{{practitionerPhone}}` | Practitioner |
| **Payer (Insurer)** | | |
| `CIGNA` | `{{payerOrgName}}` | Payer |
| `11060` | `{{payerIdentifierValue}}` | Payer |
| `11060` | `{{payerNpi}}` | Payer |
| **Managing Organization** | | |
| `EVICORE ORG` | `{{managingOrgName}}` | Managing Org |
| `1053609073` (NPI) | `{{managingOrgNpi}}` | Managing Org |
| `123 Main Street` | `{{managingOrgAddressLine}}` | Managing Org |
| `Franklin` | `{{managingOrgCity}}` | Managing Org |
| `TN` | `{{managingOrgState}}` | Managing Org |
| `38305` | `{{managingOrgPostalCode}}` | Managing Org |
| `+1 (650) 555-0111` | `{{managingOrgPhone}}` | Managing Org |
| **Clinical / Inquiry** | | |
| `M62.81` | `{{diagnosisCode}}` | Clinical |
| `Muscle weakness (generalized)` | `{{diagnosisDisplay}}` | Clinical |
| `http://hl7.org/fhir/sid/icd-10-cm` | `{{diagnosisSystem}}` | Clinical |
| `37799` | `{{productOrServiceCode}}` | Clinical |
| `https://evicore.com/cpt` | `{{productOrServiceSystem}}` | Clinical |
| `Unlisted, non-specific code...` | `{{productOrServiceDisplay}}` | Clinical |
| `32` (place of service) | `{{placeOfServiceCode}}` | Service Item |
| `Hospital Outpatient Surgery...` | `{{placeOfServiceDisplay}}` | Service Item |
| `https://www.nubc.org/CodeSystem/TypeOfBill` | `{{placeOfServiceSystem}}` | Service Item |
| `1` (Medical Care) | `{{serviceCategoryCode}}` | Service Item |
| `HS` (Health Services Review) | `{{serviceItemRequestTypeCode}}` | Inquiry |
| `A251852874` | `{{priorAuthRefNumber}}` | Inquiry |
| `urn:trnorg:5` | `{{submitterTxnIdSystem}}` | Inquiry |
| `3029250941` | `{{submitterTxnIdValue}}` | auto-generated |
| `2025-11-26` (created date) | `{{inquiryDate}}` | auto-generated |
| **UUIDs** (all resource IDs) | Auto-generated per request | pre-request script |

### Auto-Generated Variables (set by pre-request scripts)

| Variable | Generated By | Description |
|----------|-------------|-------------|
| `isoTimestamp` | All $inquire requests | Current ISO 8601 timestamp |
| `inquiryDate` | All $inquire requests | Current date (YYYY-MM-DD) |
| `submitterTxnIdValue` | All $inquire requests | Unique transaction ID per request |
| `claimUuid` | Full Bundle only | UUID for Claim resource |
| `coverageUuid` | Full Bundle only | UUID for Coverage resource |
| `encounterUuid` | Full Bundle only | UUID for Encounter resource |
| `patientUuid` | Full Bundle only | UUID for Patient resource |
| `serviceRequestUuid` | Full Bundle only | UUID for ServiceRequest resource |
| `requestorOrgUuid` | Full Bundle only | UUID for Requestor Organization |
| `conditionUuid` | Full Bundle only | UUID for Condition resource |
| `insurerOrgUuid` | Full Bundle only | UUID for Insurer Organization |
| `practitionerRoleUuid` | Full Bundle only | UUID for PractitionerRole |
| `practitionerUuid` | Full Bundle only | UUID for Practitioner |
| `managingOrgUuid` | Full Bundle only | UUID for Managing Organization |

### Auto-Populated by Chain (set by prior requests)

| Variable | Set By | Description |
|----------|--------|-------------|
| `accessToken` | OAuth request | Bearer token for API calls |
| `tokenExpiresAt` | OAuth request | Token expiry timestamp |
| `discoveredTokenEndpoint` | Plan Net Step 2 | Token URL from Endpoint resource |
| `payerFhirBaseUrl` | Plan Net Step 2 | PAS FHIR base URL from payer directory |
| `payerOrgId` | Plan Net Step 1 | Payer's FHIR Organization.id |
| `providerFhirId` | Plan Net Step 3 | Provider's FHIR resource ID |
| `insurancePlanId` | Plan Net Step 4 | InsurancePlan resource ID |
| `lastClaimResponseId` | Any $inquire | First ClaimResponse.id from response |
| `lastClaimResponseOutcome` | Any $inquire | Outcome (complete/queued/error) |
| `lastReviewActionCode` | Any $inquire | Review action (A1/A2/A3/A4/A6/CT) |
| `lastReviewNumber` | Any $inquire | Payer's admin reference number |

## Response Parsing

All $inquire requests include post-response scripts that automatically:

1. Extract ClaimResponse resources from the response Bundle
2. Parse `outcome` and `disposition` fields
3. Decode `reviewActionCode` (A1=Certified, A2=Modified, A3=Denied, A4=Pended, A6=Cancelled, CT=Contact Payer)
4. Extract identifiers (Service Request ID, Case Number, Claim Identifier)
5. Parse item-level `administrationReferenceNumber` and `itemAuthorizedDetail`
6. Detect `CommunicationRequest` resources (payer needs additional documentation)
7. Handle `OperationOutcome` error responses
8. Store key values as variables for downstream use

## Full Bundle vs. Simplified Templates

The **Full Bundle (UAT)** request preserves the complete resource graph from the
project's original `PAS__Inquire.bru` test file, including resources that the
simplified templates omit:

- **Bundle profile**: Uses `profile-pas-request-bundle` (searchset) vs. simplified
  templates' `profile-pas-inquiry-request-bundle` (collection)
- **Encounter**: Full ambulatory encounter with diagnosis and participant
- **Condition**: Linked condition resource with onset, clinical/verification status
- **ServiceRequest**: Includes CRD `ext-coverage-information` with DTR questionnaire link
- **PractitionerRole + Practitioner**: Attending physician with NPI, contact info
- **Managing Organization**: Separate from the requestor org
- **CareTeam**: Facility (FA) + Attending Physician (71) roles

The simplified templates follow the PAS IG's minimal requirements and use
`urn:uuid:` references. Use them for clean compliance testing. Use the Full Bundle
for payer-specific UAT validation.

## IG References
- Da Vinci PAS STU 2.0.1: http://hl7.org/fhir/us/davinci-pas/STU2/
- Plan Net STU 1.1.0: http://hl7.org/fhir/us/davinci-pdex-plan-net/STU1.1/
- CMS-0057-F: Federal Register 89 FR 8758 (Feb 8, 2024)
