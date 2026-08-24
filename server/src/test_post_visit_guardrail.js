require('dotenv').config({ path: '.env' });
const {
  PostVisitSummarySchema,
  normalizeText,
  getPostVisitFallback,
  validateSourceGrounding,
} = require('./utils/postVisitGuardrail');
const { generatePostVisitSummary } = require('./services/llmService');
const { submitPostVisitNotes } = require('./controllers/doctorController');
const prisma = require('./config/db');

async function runPostVisitGuardrailTests() {
  console.log('====================================================');
  console.log('--- STARTING PHASE 3 ZERO-HALLUCINATION GUARDRAIL TESTS ---');
  console.log('====================================================\n');

  const testResults = [];

  function recordResult(testName, expected, actual, pass) {
    testResults.push({
      Test: testName,
      Expected: expected,
      Actual: actual,
      Status: pass ? 'PASS' : 'FAIL',
    });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${testName}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual:   ${actual}\n`);
  }

  try {
    // ----------------------------------------------------
    // Test 1: Valid Summary
    // ----------------------------------------------------
    const source1Notes = 'Patient has fever. Prescribed paracetamol 500 mg twice daily for 3 days.';
    const source1Rx = {
      diagnosis: 'Fever',
      medicines: [{ name: 'paracetamol', dosage: '500 mg', frequency: 'twice daily', duration: '3 days' }],
    };
    const validAiOutput1 = {
      summary: 'Patient presented with fever and was prescribed paracetamol.',
      diagnosis: ['Fever'],
      medications: [{ name: 'paracetamol', dosage: '500 mg', frequency: 'twice daily', duration: '3 days' }],
      tests: [],
      followUp: 'Not specified by the doctor.',
      warnings: [],
    };

    const g1 = validateSourceGrounding(validAiOutput1, source1Notes, source1Rx);
    recordResult(
      'Test 1: Valid Summary',
      'Grounding Valid = true',
      `Grounding Valid = ${g1.valid}`,
      g1.valid === true
    );

    // ----------------------------------------------------
    // Test 2: Hallucinated Diagnosis
    // ----------------------------------------------------
    const source2Notes = 'Patient has mild fever.';
    const hallucinatedDiagAi = {
      summary: 'Patient has high fever.',
      diagnosis: ['Pneumonia'],
      medications: [],
      tests: [],
      followUp: 'Not specified by the doctor.',
      warnings: [],
    };

    const g2 = validateSourceGrounding(hallucinatedDiagAi, source2Notes, null);
    recordResult(
      'Test 2: Hallucinated Diagnosis',
      'Grounding Valid = false (Rejected)',
      `Grounding Valid = ${g2.valid} (${g2.reason})`,
      g2.valid === false && g2.reason.includes('Hallucinated diagnosis')
    );

    // ----------------------------------------------------
    // Test 3: Hallucinated Medication
    // ----------------------------------------------------
    const source3Notes = 'Patient has mild fever.';
    const hallucinatedMedAi = {
      summary: 'Patient has fever.',
      diagnosis: [],
      medications: [{ name: 'Ibuprofen', dosage: '400 mg', frequency: 'once', duration: '1 day' }],
      tests: [],
      followUp: 'Not specified by the doctor.',
      warnings: [],
    };

    const g3 = validateSourceGrounding(hallucinatedMedAi, source3Notes, null);
    recordResult(
      'Test 3: Hallucinated Medication',
      'Grounding Valid = false (Rejected)',
      `Grounding Valid = ${g3.valid} (${g3.reason})`,
      g3.valid === false && g3.reason.includes('Hallucinated medication')
    );

    // ----------------------------------------------------
    // Test 4: Hallucinated Follow-Up
    // ----------------------------------------------------
    const source4Notes = 'Patient has mild fever. Rest well.';
    const hallucinatedFollowUpAi = {
      summary: 'Patient has fever.',
      diagnosis: [],
      medications: [],
      tests: [],
      followUp: 'Return after 7 days for mandatory checkup.',
      warnings: [],
    };

    const g4 = validateSourceGrounding(hallucinatedFollowUpAi, source4Notes, null);
    recordResult(
      'Test 4: Hallucinated Follow-Up',
      'Sanitized to "Not specified by the doctor."',
      `Follow-up: "${g4.data.followUp}"`,
      g4.valid === true && g4.data.followUp === 'Not specified by the doctor.'
    );

    // ----------------------------------------------------
    // Test 5: Valid Formatting Difference
    // ----------------------------------------------------
    const source5Notes = 'Paracetamol 500mg prescribed.';
    const formatAi = {
      summary: 'Prescribed paracetamol.',
      diagnosis: [],
      medications: [{ name: 'paracetamol', dosage: '500 mg', frequency: null, duration: null }],
      tests: [],
      followUp: 'Not specified by the doctor.',
      warnings: [],
    };

    const g5 = validateSourceGrounding(formatAi, source5Notes, null);
    recordResult(
      'Test 5: Valid Formatting Difference',
      'Grounding Valid = true (Accepted via normalization)',
      `Grounding Valid = ${g5.valid}`,
      g5.valid === true
    );

    // ----------------------------------------------------
    // Test 6: Invalid Gemini JSON
    // ----------------------------------------------------
    const invalidJsonFallback = getPostVisitFallback('Valid clinical note');
    const isValidSchema = PostVisitSummarySchema.safeParse({ invalid: 'json structure' }).success;
    recordResult(
      'Test 6: Invalid Gemini JSON',
      'Schema safeParse = false (Triggers Fallback)',
      `Schema safeParse = ${isValidSchema}`,
      isValidSchema === false && typeof invalidJsonFallback === 'object'
    );

    // ----------------------------------------------------
    // Test 7: Gemini API Failure Simulation
    // ----------------------------------------------------
    const fallbackRes7 = getPostVisitFallback('Patient note');
    recordResult(
      'Test 7: Gemini API Failure',
      'Returns deterministic fallback object',
      `Summary: "${fallbackRes7.summary.slice(0, 45)}..."`,
      typeof fallbackRes7 === 'object' && fallbackRes7.followUp === 'Not specified by the doctor.'
    );

    // ----------------------------------------------------
    // Test 8: Empty Notes
    // ----------------------------------------------------
    const emptyNotesResult = await generatePostVisitSummary('   ', null);
    recordResult(
      'Test 8: Empty Notes',
      'Bypasses Gemini & returns safe fallback',
      `Summary: "${emptyNotesResult.summary}"`,
      emptyNotesResult.summary === 'No clinical summary was provided by the doctor.'
    );

    // ----------------------------------------------------
    // Test 9: Multiple Prescriptions
    // ----------------------------------------------------
    const source9Notes = 'Prescribed Amoxicillin 500mg and Metformin 850mg.';
    const source9Rx = {
      medicines: [
        { name: 'Amoxicillin', dosage: '500mg' },
        { name: 'Metformin', dosage: '850mg' },
      ],
    };
    const ai9 = {
      summary: 'Prescribed antibiotics and blood sugar management.',
      diagnosis: [],
      medications: [
        { name: 'amoxicillin', dosage: '500 mg', frequency: null, duration: null },
        { name: 'metformin', dosage: '850 mg', frequency: null, duration: null },
      ],
      tests: [],
      followUp: 'Not specified by the doctor.',
      warnings: [],
    };
    const g9 = validateSourceGrounding(ai9, source9Notes, source9Rx);
    recordResult(
      'Test 9: Multiple Prescriptions',
      'Grounding Valid = true',
      `Grounding Valid = ${g9.valid}`,
      g9.valid === true
    );

    // ----------------------------------------------------
    // Test 10: No Diagnosis (Symptoms not converted to Diagnosis)
    // ----------------------------------------------------
    const source10Notes = 'Patient presents with severe chest pain.';
    const hallucinatedCardiacAi = {
      summary: 'Patient has chest pain.',
      diagnosis: ['Cardiac Disease'],
      medications: [],
      tests: [],
      followUp: 'Not specified by the doctor.',
      warnings: [],
    };
    const g10 = validateSourceGrounding(hallucinatedCardiacAi, source10Notes, null);
    recordResult(
      'Test 10: No Diagnosis (Symptoms != Diagnosis)',
      'Grounding Valid = false (Rejected)',
      `Grounding Valid = ${g10.valid} (${g10.reason})`,
      g10.valid === false && g10.reason.includes('Hallucinated diagnosis')
    );

    // ----------------------------------------------------
    // Test 11: End-to-End Controller Endpoint Integration
    // ----------------------------------------------------
    let doctorUser = await prisma.user.findFirst({
      where: { role: 'DOCTOR' },
      include: { doctorProfile: true },
    });
    let patientUser = await prisma.user.findFirst({ where: { role: 'PATIENT' } });

    if (doctorUser && doctorUser.doctorProfile && patientUser) {
      const testAppt = await prisma.appointment.create({
        data: {
          patientId: patientUser.id,
          doctorProfileId: doctorUser.doctorProfile.id,
          appointmentDate: new Date('2026-11-20T00:00:00.000Z'),
          startTime: '14:00',
          endTime: '14:30',
          status: 'BOOKED',
          symptoms: 'Integration test symptoms',
        },
      });

      const mockReq = {
        params: { appointmentId: testAppt.id },
        user: { id: doctorUser.id },
        body: {
          clinicalNotes: 'Patient has acute sore throat. Prescribed Azithromycin 250 mg for 5 days.',
          prescription: {
            diagnosis: 'Acute Sore Throat',
            medicines: [{ name: 'Azithromycin', dosage: '250 mg', frequency: 'once daily', duration: '5 days' }],
          },
        },
      };

      let statusCode = null;
      let responseBody = null;
      const mockRes = {
        status: (code) => {
          statusCode = code;
          return mockRes;
        },
        json: (data) => {
          responseBody = data;
          return mockRes;
        },
      };

      await submitPostVisitNotes(mockReq, mockRes);

      const passController = statusCode === 200 && responseBody?.success === true && responseBody?.appointment?.status === 'COMPLETED';
      recordResult(
        'Test 11: Endpoint Integration (submitPostVisitNotes)',
        'Status 200 OK & Appointment Status COMPLETED',
        `Status ${statusCode} - Appt Status: ${responseBody?.appointment?.status}`,
        passController
      );

      // Clean up test appointment
      await prisma.appointment.delete({ where: { id: testAppt.id } });
    }

    console.log('====================================================');
    console.log('--- TEST SUMMARY TABLE ---');
    console.log('====================================================');
    console.table(testResults);

    const allPassed = testResults.every((t) => t.Status === 'PASS');
    if (allPassed) {
      console.log('\nFINAL VERDICT: PASS — All Phase 3 Zero-Hallucination Guardrail requirements verified!\n');
      process.exit(0);
    } else {
      console.error('\nFINAL VERDICT: FAIL — Some guardrail tests failed!\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runPostVisitGuardrailTests();
