// CMS-0057 PAS API Testing Tool - Client Application Logic
import { CLINICAL_SUBMIT, EXPEDITED_SUBMIT, MEDICATION_SUBMIT, STATUS_INQUIRY } from './templates.js';

// DOM Elements
const fhirServerUrlInput = document.getElementById('fhirServerUrl');
const operationSelect = document.getElementById('operationSelect');
const authKeyInput = document.getElementById('authKey');
const authValInput = document.getElementById('authVal');
const jsonEditor = document.getElementById('jsonEditor');
const btnFormatJson = document.getElementById('btnFormatJson');
const btnResetJson = document.getElementById('btnResetJson');
const btnExecute = document.getElementById('btnExecute');

// Preset Buttons
const btnTplClinical = document.getElementById('btnTplClinical');
const btnTplExpedited = document.getElementById('btnTplExpedited');
const btnTplMedication = document.getElementById('btnTplMedication');
const btnTplInquiry = document.getElementById('btnTplInquiry');

// Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Indicators & Outputs
const proxyStatusIndicator = document.getElementById('proxyStatusIndicator');
const proxyStatusText = document.getElementById('proxyStatusText');
const responsePlaceholder = document.getElementById('responsePlaceholder');
const responseViewContainer = document.getElementById('responseViewContainer');
const responseViewer = document.getElementById('responseViewer');
const resMetaIndicators = document.getElementById('resMetaIndicators');
const resStatusPill = document.getElementById('resStatusPill');
const resTimePill = document.getElementById('resTimePill');
const resSizePill = document.getElementById('resSizePill');

// Adjudication Elements
const adjudicationPlaceholder = document.getElementById('adjudicationPlaceholder');
const adjudicationView = document.getElementById('adjudicationView');
const decisionBanner = document.getElementById('decisionBanner');
const decisionBadge = document.getElementById('decisionBadge');
const decisionReason = document.getElementById('decisionReason');
const adjOutcome = document.getElementById('adjOutcome');
const adjInsurer = document.getElementById('adjInsurer');
const adjCreated = document.getElementById('adjCreated');
const adjId = document.getElementById('adjId');
const adjItemContainer = document.getElementById('adjItemContainer');

// Clinical Mapping Map Fields
const mapPatName = document.getElementById('mapPatName');
const mapPatGender = document.getElementById('mapPatGender');
const mapPatDob = document.getElementById('mapPatDob');
const mapClaimUse = document.getElementById('mapClaimUse');
const mapClaimPriority = document.getElementById('mapClaimPriority');
const mapClaimService = document.getElementById('mapClaimService');
const mapCoveragePayer = document.getElementById('mapCoveragePayer');
const mapCoverageType = document.getElementById('mapCoverageType');
const mapClaimProvider = document.getElementById('mapClaimProvider');
const mapReasonType = document.getElementById('mapReasonType');
const mapReasonCode = document.getElementById('mapReasonCode');

// Active state
let activeTemplateName = 'clinical';

// Proxy Server Configuration
const PROXY_SERVER = 'http://localhost:3001/api/proxy';
const HEALTH_ENDPOINT = 'http://localhost:3001/api/health';

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadTemplate(activeTemplateName);
  checkProxyStatus();
  
  // Save settings in local storage
  if (localStorage.getItem('fhirServerUrl')) {
    fhirServerUrlInput.value = localStorage.getItem('fhirServerUrl');
  }

  // Setup event listeners
  fhirServerUrlInput.addEventListener('change', () => {
    localStorage.setItem('fhirServerUrl', fhirServerUrlInput.value);
  });

  operationSelect.addEventListener('change', handleOperationChange);
  
  btnTplClinical.addEventListener('click', () => selectTemplate('clinical', btnTplClinical));
  btnTplExpedited.addEventListener('click', () => selectTemplate('expedited', btnTplExpedited));
  btnTplMedication.addEventListener('click', () => selectTemplate('medication', btnTplMedication));
  btnTplInquiry.addEventListener('click', () => selectTemplate('inquiry', btnTplInquiry));

  btnFormatJson.addEventListener('click', formatEditorJson);
  btnResetJson.addEventListener('click', () => loadTemplate(activeTemplateName));
  btnExecute.addEventListener('click', executePasRequest);

  jsonEditor.addEventListener('input', updateClinicalMap);
});

// Tab Setup
function setupTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      
      // Handle sibling tabs based on whether button belongs to request or response panel
      const parentPanel = btn.closest('.editor-panel') || btn.closest('.response-panel');
      
      parentPanel.querySelectorAll('.tab-btn').forEach(tb => tb.classList.remove('active'));
      parentPanel.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

// Select Template
function selectTemplate(name, buttonElement) {
  // Update active preset buttons
  document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));
  buttonElement.classList.add('active');
  
  activeTemplateName = name;
  loadTemplate(name);
  
  // Auto switch operation selector based on template
  if (name === 'inquiry') {
    operationSelect.value = '$inquire';
  } else {
    operationSelect.value = '$submit';
  }
  handleOperationChange();
}

// Load FHIR Payload Template
function loadTemplate(name) {
  let templateObj;
  switch (name) {
    case 'clinical':
      templateObj = CLINICAL_SUBMIT;
      break;
    case 'expedited':
      templateObj = EXPEDITED_SUBMIT;
      break;
    case 'medication':
      templateObj = MEDICATION_SUBMIT;
      break;
    case 'inquiry':
      templateObj = STATUS_INQUIRY;
      break;
    default:
      templateObj = CLINICAL_SUBMIT;
  }
  
  // Clone object to avoid side-effects, update timestamps to now
  const clone = JSON.parse(JSON.stringify(templateObj));
  clone.timestamp = new Date().toISOString();
  
  // Update created date in Claim resource if present
  const claimEntry = clone.entry.find(e => e.resource && e.resource.resourceType === 'Claim');
  if (claimEntry) {
    claimEntry.resource.created = new Date().toISOString();
  }

  jsonEditor.value = JSON.stringify(clone, null, 2);
  updateClinicalMap();
}

// Format JSON
function formatEditorJson() {
  try {
    const parsed = JSON.parse(jsonEditor.value);
    jsonEditor.value = JSON.stringify(parsed, null, 2);
  } catch (err) {
    alert('Invalid JSON formatting: ' + err.message);
  }
}

// Handle operation dropdown changes
function handleOperationChange() {
  const op = operationSelect.value;
  const currentUrl = fhirServerUrlInput.value;
  
  if (currentUrl === 'mock-pas-server') {
    return;
  }
  
  // Intelligently clean URL and append active operation
  let base = currentUrl.split('/$')[0];
  fhirServerUrlInput.value = `${base}/${op}`;
  localStorage.setItem('fhirServerUrl', fhirServerUrlInput.value);
}

// Check if Local Proxy is active
async function checkProxyStatus() {
  try {
    const res = await fetch(HEALTH_ENDPOINT);
    if (res.ok) {
      proxyStatusIndicator.className = 'pulse-indicator status-green';
      proxyStatusText.textContent = 'Proxy Online';
    } else {
      throw new Error('Unhealthy');
    }
  } catch (err) {
    proxyStatusIndicator.className = 'pulse-indicator status-red';
    proxyStatusText.textContent = 'Proxy Offline (Run node server.js)';
  }
}

// Update the human-readable Clinical Payload Map tab
function updateClinicalMap() {
  try {
    const bundle = JSON.parse(jsonEditor.value);
    if (!bundle.entry || !Array.isArray(bundle.entry)) return;

    // Extract patient
    const patEntry = bundle.entry.find(e => e.resource && e.resource.resourceType === 'Patient');
    if (patEntry && patEntry.resource) {
      const p = patEntry.resource;
      const family = p.name?.[0]?.family || '';
      const given = p.name?.[0]?.given?.join(' ') || '';
      mapPatName.textContent = `${given} ${family}`.trim() || 'N/A';
      mapPatGender.textContent = p.gender || 'N/A';
      mapPatDob.textContent = p.birthDate || 'N/A';
    }

    // Extract claim
    const claimEntry = bundle.entry.find(e => e.resource && e.resource.resourceType === 'Claim');
    if (claimEntry && claimEntry.resource) {
      const c = claimEntry.resource;
      mapClaimUse.textContent = c.use || 'N/A';
      mapClaimPriority.textContent = c.priority?.coding?.[0]?.display || c.priority?.coding?.[0]?.code || 'normal';
      
      const itemService = c.item?.[0]?.productOrService?.coding?.[0];
      mapClaimService.textContent = itemService ? `[${itemService.code}] ${itemService.display || ''}` : 'N/A';
      mapClaimProvider.textContent = c.provider?.reference || 'N/A';
    }

    // Extract coverage
    const covEntry = bundle.entry.find(e => e.resource && e.resource.resourceType === 'Coverage');
    if (covEntry && covEntry.resource) {
      const cov = covEntry.resource;
      mapCoveragePayer.textContent = cov.payor?.[0]?.display || 'Apex Health Plan';
      mapCoverageType.textContent = cov.type?.coding?.[0]?.display || cov.type?.coding?.[0]?.code || 'PPO';
    }

    // Extract clinical clinical/reason resource (ServiceRequest, MedicationRequest, Encounter, etc.)
    const reasonResource = bundle.entry.find(e => e.resource && ['ServiceRequest', 'MedicationRequest', 'Encounter'].includes(e.resource.resourceType));
    if (reasonResource && reasonResource.resource) {
      const r = reasonResource.resource;
      mapReasonType.textContent = r.resourceType;
      
      let codeText = 'N/A';
      if (r.resourceType === 'ServiceRequest') {
        codeText = r.code?.coding?.[0]?.display || r.code?.coding?.[0]?.code || '';
      } else if (r.resourceType === 'MedicationRequest') {
        codeText = r.medicationCodeableConcept?.coding?.[0]?.display || r.medicationCodeableConcept?.coding?.[0]?.code || '';
      } else if (r.resourceType === 'Encounter') {
        codeText = r.reasonCode?.[0]?.coding?.[0]?.display || r.reasonCode?.[0]?.coding?.[0]?.code || '';
      }
      mapReasonCode.textContent = codeText;
    }

  } catch (e) {
    // Fail silently during typing
  }
}

// Execute the PAS Request via proxy
async function executePasRequest() {
  let parsedPayload = null;
  try {
    parsedPayload = JSON.parse(jsonEditor.value);
  } catch (err) {
    alert('JSON Syntax Error: Please fix formatting errors in request editor before sending.');
    return;
  }

  // Update button UI state
  btnExecute.disabled = true;
  btnExecute.classList.add('loading');
  btnExecute.querySelector('.btn-execute-text').textContent = 'Executing Adjudication...';
  btnExecute.querySelector('.btn-execute-icon').textContent = '⏳';

  // Toggle response view loaders
  responsePlaceholder.style.display = 'none';
  responseViewContainer.style.display = 'block';
  responseViewer.textContent = '// Contacting Proxy & adjudicating FHIR transaction...\n// Processing Da Vinci Prior Auth rules...';
  resMetaIndicators.style.display = 'none';

  // Prepare custom headers if any
  const customHeaders = {};
  if (authKeyInput.value && authValInput.value) {
    customHeaders[authKeyInput.value.trim()] = authValInput.value.trim();
  }

  const reqUrl = fhirServerUrlInput.value.trim();
  const requestBody = {
    url: reqUrl === 'mock-pas-server' ? `mock-pas-server/${operationSelect.value}` : reqUrl,
    method: 'POST',
    headers: customHeaders,
    body: parsedPayload
  };

  try {
    const res = await fetch(PROXY_SERVER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await res.json();
    displayResponse(data);
    await checkProxyStatus(); // Update connection health indicators
  } catch (err) {
    displayResponse({
      ok: false,
      status: 500,
      statusText: 'Proxy Offline Error',
      headers: {},
      durationMs: 0,
      body: {
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'fatal',
          code: 'exception',
          diagnostics: `Could not connect to the local PAS proxy server. Please verify you ran "node server.js" in the root directory. Error details: ${err.message}`
        }]
      }
    });
  } finally {
    // Reset button UI
    btnExecute.disabled = false;
    btnExecute.classList.remove('loading');
    btnExecute.querySelector('.btn-execute-text').textContent = 'Send PAS Request';
    btnExecute.querySelector('.btn-execute-icon').textContent = '🚀';
  }
}

// Display Adjudicated Response
function displayResponse(data) {
  // Update metadata pills
  resMetaIndicators.style.display = 'flex';
  
  resStatusPill.className = `indicator-pill ${data.ok ? 'success' : 'danger'}`;
  resStatusPill.textContent = `HTTP ${data.status} ${data.statusText || ''}`;
  
  resTimePill.textContent = `Latency: ${data.durationMs}ms`;
  
  const sizeKb = (JSON.stringify(data.body).length / 1024).toFixed(2);
  resSizePill.textContent = `Payload: ${sizeKb} KB`;

  // Syntax Highlighted JSON
  responseViewer.textContent = JSON.stringify(data.body, null, 2);

  // Parse Adjudication Breakdown
  parseAdjudication(data.body);
}

// Parse Adjudication response and display clinical reasons
function parseAdjudication(body) {
  if (!body) return;

  adjudicationPlaceholder.style.display = 'none';
  adjudicationView.style.display = 'block';

  try {
    // Locate the ClaimResponse inside the Bundle
    let claimResponse = null;
    if (body.resourceType === 'ClaimResponse') {
      claimResponse = body;
    } else if (body.resourceType === 'Bundle' && body.entry) {
      const crEntry = body.entry.find(e => e.resource && e.resource.resourceType === 'ClaimResponse');
      if (crEntry) claimResponse = crEntry.resource;
    }

    if (!claimResponse) {
      decisionBanner.className = 'decision-banner pended';
      decisionBadge.textContent = 'WARNING';
      decisionBadge.className = 'decision-badge pended';
      decisionReason.textContent = 'Returned FHIR payload is not a valid PAS ClaimResponse or Response Bundle.';
      
      adjOutcome.textContent = 'N/A';
      adjInsurer.textContent = 'N/A';
      adjCreated.textContent = 'N/A';
      adjId.textContent = 'N/A';
      adjItemContainer.innerHTML = '<p class="text-danger">No active ClaimResponse resource detected in FHIR response bundle.</p>';
      return;
    }

    const cr = claimResponse;
    const outcome = cr.outcome || 'queued';
    const disposition = cr.disposition || 'No disposition details provided.';
    const insurer = cr.insurer?.display || cr.insurer?.reference || 'Unknown Payer';
    const created = cr.created ? new Date(cr.created).toLocaleString() : 'N/A';
    const id = cr.id || 'N/A';

    // Update fields
    adjOutcome.textContent = outcome.toUpperCase();
    adjInsurer.textContent = insurer;
    adjCreated.textContent = created;
    adjId.textContent = id;

    // Apply color styling to banner based on outcome
    if (outcome === 'complete' && disposition.toLowerCase().includes('approved')) {
      decisionBanner.className = 'decision-banner approved';
      decisionBadge.textContent = 'APPROVED';
      decisionBadge.className = 'decision-badge approved';
      decisionReason.textContent = disposition;
    } else if (outcome === 'queued' || disposition.toLowerCase().includes('pended')) {
      decisionBanner.className = 'decision-banner pended';
      decisionBadge.textContent = 'PENDED';
      decisionBadge.className = 'decision-badge pended';
      decisionReason.textContent = disposition;
    } else {
      decisionBanner.className = 'decision-banner denied';
      decisionBadge.textContent = 'DENIED';
      decisionBadge.className = 'decision-badge denied';
      decisionReason.textContent = disposition;
    }

    // Populate itemized table/details
    adjItemContainer.innerHTML = '';
    if (cr.item && cr.item.length > 0) {
      cr.item.forEach(itm => {
        const seq = itm.itemSequence;
        const adjReason = itm.adjudication?.[0]?.reason?.coding?.[0]?.display || 
                          itm.adjudication?.[0]?.reason?.coding?.[0]?.code || 'Line item approved';
        const code = itm.adjudication?.[0]?.reason?.coding?.[0]?.code || 'authorized';
        const isApproved = code === 'authorized' || code === 'approved';

        const itemRow = document.createElement('div');
        itemRow.className = 'adjudication-item-row';
        itemRow.innerHTML = `
          <div class="item-seq">Seq #${seq}</div>
          <div class="item-desc">${adjReason}</div>
          <div class="item-status-tag ${isApproved ? 'approved' : 'pended'}">${code.toUpperCase()}</div>
        `;
        adjItemContainer.appendChild(itemRow);
      });
    } else {
      adjItemContainer.innerHTML = '<p class="text-muted">No itemized adjudication lines present.</p>';
    }

  } catch (err) {
    adjItemContainer.innerHTML = `<p class="text-danger">Failed parsing adjudication details: ${err.message}</p>`;
  }
}
