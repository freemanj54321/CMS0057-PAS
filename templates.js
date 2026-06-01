// Da Vinci Prior Authorization Support (PAS) FHIR R4 Templates

export const CLINICAL_SUBMIT = {
  resourceType: "Bundle",
  id: "pas-bundle-clinical-submit-101",
  type: "collection",
  timestamp: new Date().toISOString(),
  entry: [
    {
      fullUrl: "urn:uuid:patient-john-doe",
      resource: {
        resourceType: "Patient",
        id: "patient-john-doe",
        active: true,
        name: [
          {
            use: "official",
            family: "Doe",
            given: ["John", "Edward"]
          }
        ],
        gender: "male",
        birthDate: "1978-05-15",
        address: [
          {
            use: "home",
            line: ["123 Pinecrest Lane"],
            city: "Metropolis",
            state: "NY",
            postalCode: "10001",
            country: "USA"
          }
        ]
      }
    },
    {
      fullUrl: "urn:uuid:practitioner-john-freeman",
      resource: {
        resourceType: "Practitioner",
        id: "practitioner-john-freeman",
        active: true,
        name: [
          {
            use: "official",
            family: "Freeman",
            given: ["John"]
          }
        ],
        telecom: [
          {
            system: "phone",
            value: "555-0199",
            use: "work"
          }
        ],
        qualification: [
          {
            code: {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/v2-0360",
                  code: "MD",
                  display: "Doctor of Medicine"
                }
              ]
            }
          }
        ]
      }
    },
    {
      fullUrl: "urn:uuid:coverage-apex-blue",
      resource: {
        resourceType: "Coverage",
        id: "coverage-apex-blue",
        status: "active",
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
              code: "PPO",
              display: "Preferred Provider Organization"
            }
          ]
        },
        subscriber: {
          reference: "urn:uuid:patient-john-doe"
        },
        beneficiary: {
          reference: "urn:uuid:patient-john-doe"
        },
        relationship: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/subscriber-relationship",
              code: "self"
            }
          ]
        },
        payor: [
          {
            display: "Apex Health Plan"
          }
        ]
      }
    },
    {
      fullUrl: "urn:uuid:claim-clinical-001",
      resource: {
        resourceType: "Claim",
        id: "claim-clinical-001",
        status: "active",
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/claim-type",
              code: "professional",
              display: "Professional"
            }
          ]
        },
        use: "preauthorization",
        patient: {
          reference: "urn:uuid:patient-john-doe"
        },
        created: new Date().toISOString(),
        insurer: {
          display: "Apex Health Plan"
        },
        provider: {
          reference: "urn:uuid:practitioner-john-freeman"
        },
        priority: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/processpriority",
              code: "normal",
              display: "Normal"
            }
          ]
        },
        insurance: [
          {
            sequence: 1,
            focal: true,
            coverage: {
              reference: "urn:uuid:coverage-apex-blue"
            }
          }
        ],
        item: [
          {
            sequence: 1,
            productOrService: {
              coding: [
                {
                  system: "http://www.ama-assn.org/go/cpt",
                  code: "97110",
                  display: "Therapeutic procedure, 1 or more areas, each 15 minutes (Physical Therapy)"
                }
              ]
            },
            quantity: {
              value: 12,
              unit: "sessions"
            },
            net: {
              value: 1200.0,
              currency: "USD"
            }
          }
        ]
      }
    },
    {
      fullUrl: "urn:uuid:servicerequest-physical-therapy",
      resource: {
        resourceType: "ServiceRequest",
        id: "servicerequest-physical-therapy",
        status: "active",
        intent: "order",
        category: [
          {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "91251008",
                display: "Physical therapy procedure"
              }
            ]
          }
        ],
        code: {
          coding: [
            {
              system: "http://www.ama-assn.org/go/cpt",
              code: "97110",
              display: "Therapeutic exercises"
            }
          ]
        },
        subject: {
          reference: "urn:uuid:patient-john-doe"
        },
        occurrenceTiming: {
          repeat: {
            frequency: 3,
            period: 1,
            periodUnit: "wk"
          }
        },
        reasonCode: [
          {
            coding: [
              {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: "M54.50",
                display: "Low back pain, unspecified"
              }
            ]
          }
        ]
      }
    }
  ]
};

export const EXPEDITED_SUBMIT = {
  resourceType: "Bundle",
  id: "pas-bundle-expedited-submit-202",
  type: "collection",
  timestamp: new Date().toISOString(),
  entry: [
    {
      fullUrl: "urn:uuid:patient-john-doe",
      resource: {
        resourceType: "Patient",
        id: "patient-john-doe",
        active: true,
        name: [
          {
            use: "official",
            family: "Doe",
            given: ["John", "Edward"]
          }
        ],
        gender: "male",
        birthDate: "1978-05-15",
        address: [
          {
            use: "home",
            line: ["123 Pinecrest Lane"],
            city: "Metropolis",
            state: "NY",
            postalCode: "10001"
          }
        ]
      }
    },
    {
      fullUrl: "urn:uuid:practitioner-john-freeman",
      resource: {
        resourceType: "Practitioner",
        id: "practitioner-john-freeman",
        active: true,
        name: [
          {
            use: "official",
            family: "Freeman",
            given: ["John"]
          }
        ]
      }
    },
    {
      fullUrl: "urn:uuid:coverage-apex-blue",
      resource: {
        resourceType: "Coverage",
        id: "coverage-apex-blue",
        status: "active",
        subscriber: {
          reference: "urn:uuid:patient-john-doe"
        },
        beneficiary: {
          reference: "urn:uuid:patient-john-doe"
        },
        payor: [
          {
            display: "Apex Health Plan"
          }
        ]
      }
    },
    {
      fullUrl: "urn:uuid:claim-expedited-002",
      resource: {
        resourceType: "Claim",
        id: "claim-expedited-002",
        status: "active",
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/claim-type",
              code: "professional",
              display: "Professional"
            }
          ]
        },
        use: "preauthorization",
        patient: {
          reference: "urn:uuid:patient-john-doe"
        },
        created: new Date().toISOString(),
        insurer: {
          display: "Apex Health Plan"
        },
        provider: {
          reference: "urn:uuid:practitioner-john-freeman"
        },
        priority: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/processpriority",
              code: "stat",
              display: "Urgent/Expedited"
            }
          ]
        },
        insurance: [
          {
            sequence: 1,
            focal: true,
            coverage: {
              reference: "urn:uuid:coverage-apex-blue"
            }
          }
        ],
        item: [
          {
            sequence: 1,
            productOrService: {
              coding: [
                {
                  system: "http://www.ama-assn.org/go/cpt",
                  code: "27447",
                  display: "Total Knee Arthroplasty (Knee Joint Replacement Surgery)"
                }
              ]
            },
            quantity: {
              value: 1,
              unit: "procedure"
            },
            net: {
              value: 45000.0,
              currency: "USD"
            }
          }
        ]
      }
    },
    {
      fullUrl: "urn:uuid:encounter-clinical-urgent",
      resource: {
        resourceType: "Encounter",
        id: "encounter-clinical-urgent",
        status: "finished",
        class: {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
          code: "EMER",
          display: "emergency"
        },
        subject: {
          reference: "urn:uuid:patient-john-doe"
        },
        reasonCode: [
          {
            coding: [
              {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: "M17.11",
                display: "Unilateral primary osteoarthritis, right knee"
              }
            ]
          }
        ]
      }
    }
  ]
};

export const MEDICATION_SUBMIT = {
  resourceType: "Bundle",
  id: "pas-bundle-medication-submit-303",
  type: "collection",
  timestamp: new Date().toISOString(),
  entry: [
    {
      fullUrl: "urn:uuid:patient-john-doe",
      resource: {
        resourceType: "Patient",
        id: "patient-john-doe",
        active: true,
        name: [
          {
            use: "official",
            family: "Doe",
            given: ["John", "Edward"]
          }
        ],
        gender: "male",
        birthDate: "1978-05-15"
      }
    },
    {
      fullUrl: "urn:uuid:practitioner-john-freeman",
      resource: {
        resourceType: "Practitioner",
        id: "practitioner-john-freeman",
        name: [
          {
            use: "official",
            family: "Freeman",
            given: ["John"]
          }
        ]
      }
    },
    {
      fullUrl: "urn:uuid:coverage-apex-blue",
      resource: {
        resourceType: "Coverage",
        id: "coverage-apex-blue",
        status: "active",
        subscriber: {
          reference: "urn:uuid:patient-john-doe"
        },
        beneficiary: {
          reference: "urn:uuid:patient-john-doe"
        },
        payor: [
          {
            display: "Apex Health Plan"
          }
        ]
      }
    },
    {
      fullUrl: "urn:uuid:claim-medication-003",
      resource: {
        resourceType: "Claim",
        id: "claim-medication-003",
        status: "active",
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/claim-type",
              code: "pharmacy",
              display: "Pharmacy"
            }
          ]
        },
        use: "preauthorization",
        patient: {
          reference: "urn:uuid:patient-john-doe"
        },
        created: new Date().toISOString(),
        insurer: {
          display: "Apex Health Plan"
        },
        provider: {
          reference: "urn:uuid:practitioner-john-freeman"
        },
        priority: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/processpriority",
              code: "normal",
              display: "Normal"
            }
          ]
        },
        insurance: [
          {
            sequence: 1,
            focal: true,
            coverage: {
              reference: "urn:uuid:coverage-apex-blue"
            }
          }
        ],
        item: [
          {
            sequence: 1,
            productOrService: {
              coding: [
                {
                  system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                  code: "1948256",
                  display: "Dupilumab 300 MG/2ML Injection (Dupixent)"
                }
              ]
            },
            quantity: {
              value: 2,
              unit: "syringes"
            },
            net: {
              value: 3200.0,
              currency: "USD"
            }
          }
        ]
      }
    },
    {
      fullUrl: "urn:uuid:medicationrequest-specialty",
      resource: {
        resourceType: "MedicationRequest",
        id: "medicationrequest-specialty",
        status: "active",
        intent: "order",
        medicationCodeableConcept: {
          coding: [
            {
              system: "http://www.nlm.nih.gov/research/umls/rxnorm",
              code: "1948256",
              display: "Dupilumab 300 MG/2ML Injection"
            }
          ]
        },
        subject: {
          reference: "urn:uuid:patient-john-doe"
        },
        reasonCode: [
          {
            coding: [
              {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: "L20.9",
                display: "Atopic dermatitis, unspecified (Severe Eczema)"
              }
            ]
          }
        ]
      }
    }
  ]
};

export const STATUS_INQUIRY = {
  resourceType: "Bundle",
  id: "pas-bundle-inquire-404",
  type: "collection",
  timestamp: new Date().toISOString(),
  entry: [
    {
      fullUrl: "urn:uuid:patient-john-doe",
      resource: {
        resourceType: "Patient",
        id: "patient-john-doe",
        name: [
          {
            family: "Doe",
            given: ["John"]
          }
        ],
        birthDate: "1978-05-15"
      }
    },
    {
      fullUrl: "urn:uuid:claim-inquiry-101",
      resource: {
        resourceType: "Claim",
        id: "claim-inquiry-101",
        status: "active",
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/claim-type",
              code: "professional"
            }
          ]
        },
        use: "preauthorization",
        patient: {
          reference: "urn:uuid:patient-john-doe"
        },
        created: new Date().toISOString(),
        insurer: {
          display: "Apex Health Plan"
        },
        originalPrescription: {
          reference: "Claim/claim-clinical-001" // Reference to original PA request ID
        }
      }
    }
  ]
};
