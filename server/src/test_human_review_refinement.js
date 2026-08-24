require('dotenv').config({ path: '.env' });
const { validateSourceGrounding } = require('./utils/postVisitGuardrail');
const { approvePostVisitSummary } = require('./controllers/doctorController');
const prisma = require('./config/db');

async function testHumanReviewRefinement() {
  console.log('====================================================');
  console.log('--- TESTING HUMAN-IN-THE-LOOP REVIEW REFINEMENT ---');
  console.log('====================================================\n');

  // Case (a): Fully grounded summary
  console.log('--- CASE (a): FULLY GROUNDED SUMMARY ---');
  const notesA = 'Patient has fever. Prescribed paracetamol 500 mg for 3 days.';
  const rxA = { medicines: [{ name: 'paracetamol', dosage: '500 mg', duration: '3 days' }] };
  const aiA = {
    summary: 'Patient presented with fever and was prescribed paracetamol.',
    diagnosis: [],
    medications: [{ name: 'paracetamol', dosage: '500 mg', frequency: null, duration: '3 days' }],
    tests: [],
    followUp: 'Not specified by the doctor.',
    warnings: [],
  };

  const resA = validateSourceGrounding(aiA, notesA, rxA);
  console.log('RAW OUTPUT OBJECT (a):', JSON.stringify(resA.data, null, 2));

  const passA = resA.valid === true && resA.needsHumanReview === false && resA.reviewReasons.length === 0;
  console.log(`CASE (a) VERDICT: ${passA ? 'PASS' : 'FAIL'}\n`);

  // Case (b): Summary with hallucinated medication
  console.log('--- CASE (b): HALLUCINATED MEDICATION (RETAINED AS-IS & FLAGGED) ---');
  const notesB = 'Patient has mild fever.';
  const aiB = {
    summary: 'Patient has mild fever.',
    diagnosis: [],
    medications: [{ name: 'Ibuprofen', dosage: '400 mg', frequency: null, duration: null }],
    tests: [],
    followUp: 'Not specified by the doctor.',
    warnings: [],
  };

  const resB = validateSourceGrounding(aiB, notesB, null);
  console.log('RAW OUTPUT OBJECT (b):', JSON.stringify(resB.data, null, 2));

  const passB = resB.valid === true && resB.needsHumanReview === true && resB.reviewReasons.includes('Hallucinated medication detected: "Ibuprofen"');
  console.log(`CASE (b) VERDICT: ${passB ? 'PASS' : 'FAIL'}\n`);

  // Case (c): Paraphrase case ("Amox 500" vs "Amoxicillin 500mg")
  console.log('--- CASE (c): PARAPHRASED TERM NORMALIZATION ---');
  const notesC = 'Patient has throat infection. Prescribed Amox 500 twice daily.';
  const aiC = {
    summary: 'Patient has throat infection. Prescribed antibiotics.',
    diagnosis: [],
    medications: [{ name: 'Amoxicillin 500mg', dosage: '500mg', frequency: 'twice daily', duration: null }],
    tests: [],
    followUp: 'Not specified by the doctor.',
    warnings: [],
  };

  const resC = validateSourceGrounding(aiC, notesC, null);
  console.log('RAW OUTPUT OBJECT (c):', JSON.stringify(resC.data, null, 2));

  const passC = resC.valid === true && resC.needsHumanReview === false;
  console.log(`CASE (c) VERDICT: ${passC ? 'PASS' : 'FAIL'}\n`);

  // Case (d): Doctor Approval Endpoint & Audit Logging Test
  console.log('--- CASE (d): DOCTOR APPROVAL ENDPOINT & AUDIT LOGGING ---');
  let doctorUser = await prisma.user.findFirst({
    where: { role: 'DOCTOR' },
    include: { doctorProfile: true },
  });
  let patientUser = await prisma.user.findFirst({ where: { role: 'PATIENT' } });

  let passD = false;
  if (doctorUser && doctorUser.doctorProfile && patientUser) {
    const testAppt = await prisma.appointment.create({
      data: {
        patientId: patientUser.id,
        doctorProfileId: doctorUser.doctorProfile.id,
        appointmentDate: new Date('2026-11-25T00:00:00.000Z'),
        startTime: '15:00',
        endTime: '15:30',
        status: 'COMPLETED',
        symptoms: 'Approval test',
        needsHumanReview: true,
        reviewReasons: ['Hallucinated medication detected: "Ibuprofen"'],
      },
    });

    const mockReq = {
      params: { appointmentId: testAppt.id },
      user: { id: doctorUser.id },
    };
    let statusCode = null;
    let responseBody = null;
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: (data) => { responseBody = data; return mockRes; },
    };

    await approvePostVisitSummary(mockReq, mockRes);

    const updatedAppt = await prisma.appointment.findUnique({ where: { id: testAppt.id } });
    passD = statusCode === 200 && updatedAppt.needsHumanReview === false;

    console.log(`Approve Endpoint Response: Status ${statusCode} - Appt needsHumanReview = ${updatedAppt.needsHumanReview}`);
    await prisma.appointment.delete({ where: { id: testAppt.id } });
  }

  console.log(`CASE (d) VERDICT: ${passD ? 'PASS' : 'FAIL'}\n`);

  const allPassed = passA && passB && passC && passD;
  if (allPassed) {
    console.log('SUCCESS: Human-in-the-loop review refinement verification PASSED cleanly!\n');
    process.exit(0);
  } else {
    console.error('FAILURE: Human-in-the-loop review refinement test failed!\n');
    process.exit(1);
  }
}

testHumanReviewRefinement();
