import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Proxy Request to FHIR Server / Mock Server
app.post('/api/proxy', async (req, res) => {
  const { url, method = 'POST', headers = {}, body } = req.body;

  if (!url) {
    return res.status(400).json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'required',
        diagnostics: 'Missing target "url" parameter in proxy request.'
      }]
    });
  }

  const startTime = Date.now();

  // Handle Mock Server requests locally to allow standalone testing
  if (url.toLowerCase() === 'mock-pas-server' || url.toLowerCase().includes('sandbox.mock')) {
    const isSubmit = url.includes('$submit') || (body && JSON.stringify(body).includes('$submit'));
    const isExpedited = body && JSON.stringify(body).toLowerCase().includes('expedited');
    const isMedication = body && JSON.stringify(body).toLowerCase().includes('medication');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));

    const responseHeaders = {
      'content-type': 'application/fhir+json',
      'x-mock-server': 'CMS0057-PAS-Mock-v1.0'
    };

    if (isSubmit) {
      let claimResponse = {};
      const status = isExpedited ? 'pended' : 'active';
      const outcome = isExpedited ? 'queued' : 'complete';
      const disposition = isExpedited 
        ? 'Prior authorization request received and pended for clinical review. Standard review time up to 72 hours.' 
        : 'Prior authorization request approved. Authorized services valid for 180 days.';

      if (isMedication) {
        // Mock Medication PA ClaimResponse
        claimResponse = {
          resourceType: 'ClaimResponse',
          id: 'mock-cr-med-7729',
          status: 'active',
          use: 'preauthorization',
          outcome: 'complete',
          disposition: 'Approved - Specialty drug criteria met. Prior Authorization is valid for 12 months.',
          created: new Date().toISOString(),
          insurer: { display: 'Apex Health Plan (Payer)' },
          requestor: { display: 'Dr. John Freeman, MD' },
          request: { reference: 'Claim/mock-claim-med-123' },
          total: [{
            category: { coding: [{ code: 'submitted' }] },
            amount: { value: 3200.00, currency: 'USD' }
          }],
          item: [{
            itemSequence: 1,
            adjudication: [{
              category: { coding: [{ code: 'benefit' }] },
              reason: {
                coding: [{
                  system: 'http://terminology.hl7.org/CodeSystem/adjudication-reason',
                  code: 'authorized',
                  display: 'Prior Authorization Approved'
                }]
              }
            }]
          }]
        };
      } else {
        // Mock Clinical/Service PA ClaimResponse
        claimResponse = {
          resourceType: 'ClaimResponse',
          id: `mock-cr-cli-${Math.floor(Math.random() * 90000) + 10000}`,
          status: status,
          use: 'preauthorization',
          outcome: outcome,
          disposition: disposition,
          created: new Date().toISOString(),
          insurer: { display: 'Apex Health Plan (Payer)' },
          requestor: { display: 'Dr. John Freeman, MD' },
          request: { reference: 'Claim/mock-claim-cli-567' },
          total: [{
            category: { coding: [{ code: 'submitted' }] },
            amount: { value: 12500.00, currency: 'USD' }
          }],
          item: [{
            itemSequence: 1,
            adjudication: [{
              category: { coding: [{ code: 'benefit' }] },
              reason: {
                coding: [{
                  system: 'http://terminology.hl7.org/CodeSystem/adjudication-reason',
                  code: isExpedited ? 'pended' : 'authorized',
                  display: isExpedited ? 'Pended for Clinical Review' : 'Prior Authorization Approved'
                }]
              }
            }]
          }]
        };
      }

      const responseBundle = {
        resourceType: 'Bundle',
        id: `mock-bundle-res-${Math.floor(Math.random() * 90000) + 10000}`,
        type: 'collection',
        timestamp: new Date().toISOString(),
        entry: [
          {
            fullUrl: `urn:uuid:${claimResponse.id}`,
            resource: claimResponse
          }
        ]
      };

      return res.status(200).json({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: responseHeaders,
        body: responseBundle,
        durationMs: Date.now() - startTime
      });
    } else {
      // Mock Claim/$inquire response
      const inquireResponse = {
        resourceType: 'Bundle',
        id: 'mock-inquiry-res-8819',
        type: 'collection',
        timestamp: new Date().toISOString(),
        entry: [
          {
            fullUrl: 'urn:uuid:mock-claim-response-inq-12',
            resource: {
              resourceType: 'ClaimResponse',
              id: 'mock-cr-inq-12',
              status: 'active',
              use: 'preauthorization',
              outcome: 'complete',
              disposition: 'Prior Authorization inquiry returned status: APPROVED. Active auth ref: AUTH-CMS-2026-9921',
              created: new Date().toISOString(),
              insurer: { display: 'Apex Health Plan' },
              requestor: { display: 'Dr. John Freeman, MD' }
            }
          }
        ]
      };

      return res.status(200).json({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: responseHeaders,
        body: inquireResponse,
        durationMs: Date.now() - startTime
      });
    }
  }

  // Real Proxy Call
  try {
    const fetchOptions = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json',
        ...headers
      }
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(fetchOptions.method)) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const responseDuration = Date.now() - startTime;
    
    let responseBody = null;
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json') || contentType.includes('application/fhir+json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    const responseHeadersOut = {};
    response.headers.forEach((val, key) => {
      responseHeadersOut[key] = val;
    });

    res.status(200).json({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeadersOut,
      body: responseBody,
      durationMs: responseDuration
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      error: error.message,
      durationMs: Date.now() - startTime,
      body: {
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'fatal',
          code: 'exception',
          diagnostics: `Proxy failed to connect to the target PAS Server. Details: ${error.message}`
        }]
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`CMS-0057 PAS Proxy Server running on http://localhost:${PORT}`);
});
