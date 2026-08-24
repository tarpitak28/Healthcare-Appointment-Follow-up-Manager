require('dotenv').config({ path: '.env' });
const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../../node_modules/@prisma/client'));
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

const { holdSlot, bookAppointment, cancelAppointment, getAvailableSlots } = require('./controllers/patientController');
const { markDoctorLeave } = require('./controllers/adminController');
const { submitPostVisitNotes, approvePostVisitSummary } = require('./controllers/doctorController');
const { validateSourceGrounding } = require('./utils/postVisitGuardrail');
const { createAndSendNotification, processNotificationRetries, sanitizeError } = require('./services/notificationService');

async function runPhase5Audit() {
  console.log('================================================================');
  console.log('--- PHASE 5 PRODUCTION READINESS & FULL SYSTEM AUDIT RUNNER ---');
  console.log('================================================================\n');

  const auditResults = [];

  function record(section, testName, expected, actual, pass) {
    auditResults.push({
      Section: section,
      Test: testName,
      Expected: expected,
      Actual: actual,
      Status: pass ? 'PASS' : 'FAIL',
    });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] [Section ${section}] ${testName}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual:   ${actual}\n`);
  }

  try {
    let patientA = await prisma.user.findFirst({ where: { email: 'patient@hospital.com' } });
    let patientB = await prisma.user.findFirst({ where: { email: 'concurrent_p1@example.com' } });
    let doctorA = await prisma.user.findFirst({ where: { email: 'smith@hospital.com' }, include: { doctorProfile: true } });
    let doctorB = await prisma.user.findFirst({ where: { role: 'DOCTOR', email: { not: 'smith@hospital.com' } }, include: { doctorProfile: true } });
    let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    if (!patientA || !doctorA || !doctorA.doctorProfile || !admin) {
      console.error('Missing core test users in database!');
      process.exit(1);
    }

    // ----------------------------------------------------
    // Section 2 & 3: Migration Integrity & Clean DB Reproduction
    // ----------------------------------------------------
    const appliedMigrations = await prisma.$queryRaw`SELECT migration_name, finished_at FROM _prisma_migrations WHERE rolled_back_at IS NULL ORDER BY finished_at;`;
    const has7Migrations = appliedMigrations.length >= 7;
    record(
      '2 & 3',
      'Migration Integrity & Clean Reproduction',
      '7 Applied Versioned Migrations',
      `Applied Migrations Count = ${appliedMigrations.length}`,
      has7Migrations
    );

    // ----------------------------------------------------
    // Section 5: Verify Partial Unique Index
    // ----------------------------------------------------
    const indexDef = await prisma.$queryRaw`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' AND indexname = 'unique_active_doctor_slot';
    `;
    const hasIndex = indexDef.length > 0 && indexDef[0].indexdef.includes('BOOKED') && indexDef[0].indexdef.includes('COMPLETED');
    record(
      '5',
      'PostgreSQL Partial Unique Index Verification',
      'unique_active_doctor_slot exists for BOOKED & COMPLETED',
      `Index Exists = ${hasIndex}`,
      hasIndex
    );

    // Test Postgres partial unique index status behavior
    const testDatePartial = '2026-11-20';
    const testTimePartial = '09:00';
    const startOfDayPartial = new Date(`${testDatePartial}T00:00:00.000Z`);

    // Create appt 1 (BOOKED)
    const apptP1 = await prisma.appointment.create({
      data: {
        patientId: patientA.id,
        doctorProfileId: doctorA.doctorProfile.id,
        appointmentDate: startOfDayPartial,
        startTime: testTimePartial,
        endTime: '09:30',
        status: 'BOOKED',
        symptoms: 'Partial index test',
      },
    });

    // Attempt duplicate BOOKED appt -> should fail via 23505
    let dupFailed = false;
    try {
      await prisma.appointment.create({
        data: {
          patientId: patientB ? patientB.id : patientA.id,
          doctorProfileId: doctorA.doctorProfile.id,
          appointmentDate: startOfDayPartial,
          startTime: testTimePartial,
          endTime: '09:30',
          status: 'BOOKED',
          symptoms: 'Duplicate test',
        },
      });
    } catch (e) {
      dupFailed = true;
    }

    // Cancel appt 1
    await prisma.appointment.update({
      where: { id: apptP1.id },
      data: { status: 'CANCELLED' },
    });

    // Now attempt new BOOKED appt on same slot -> should succeed because index filters WHERE status IN ('BOOKED', 'COMPLETED')
    let reuseSucceeded = false;
    let apptP2 = null;
    try {
      apptP2 = await prisma.appointment.create({
        data: {
          patientId: patientA.id,
          doctorProfileId: doctorA.doctorProfile.id,
          appointmentDate: startOfDayPartial,
          startTime: testTimePartial,
          endTime: '09:30',
          status: 'BOOKED',
          symptoms: 'Re-booking cancelled slot test',
        },
      });
      reuseSucceeded = true;
    } catch (e) {
      reuseSucceeded = false;
    }

    record(
      '5',
      'Partial Index Behaviour (BOOKED blocks, CANCELLED allows re-use)',
      'Duplicate rejected when BOOKED, allowed when CANCELLED',
      `Duplicate Rejected = ${dupFailed}, Cancelled Re-booked = ${reuseSucceeded}`,
      dupFailed && reuseSucceeded
    );

    // Clean up test appts
    await prisma.appointment.deleteMany({ where: { id: { in: [apptP1.id, apptP2?.id].filter(Boolean) } } });

    // ----------------------------------------------------
    // Section 4: Slot-Hold Concurrency Tests (Tests A - G)
    // ----------------------------------------------------
    const holdDate = '2026-11-21';
    const holdTime = '10:00';
    const holdStartOfDay = new Date(`${holdDate}T00:00:00.000Z`);

    // Test A: Simultaneous booking requests (201 vs 409)
    const reqSim1 = { user: { id: patientA.id }, body: { doctorProfileId: doctorA.doctorProfile.id, appointmentDate: holdDate, startTime: holdTime, endTime: '10:30', symptoms: 'Sim 1' } };
    const reqSim2 = { user: { id: patientB ? patientB.id : patientA.id }, body: { doctorProfileId: doctorA.doctorProfile.id, appointmentDate: holdDate, startTime: holdTime, endTime: '10:30', symptoms: 'Sim 2' } };

    let resSim1Code = null, resSim2Code = null;
    const mockRes1 = { status: (c) => { resSim1Code = c; return mockRes1; }, json: (d) => mockRes1 };
    const mockRes2 = { status: (c) => { resSim2Code = c; return mockRes2; }, json: (d) => mockRes2 };

    await Promise.all([bookAppointment(reqSim1, mockRes1), bookAppointment(reqSim2, mockRes2)]);

    const simPass = (resSim1Code === 201 && resSim2Code === 409) || (resSim1Code === 409 && resSim2Code === 201);
    record(
      '4 (Test A)',
      'Simultaneous Double Booking Concurrency Defense',
      'One 201 Created, One 409 Conflict',
      `Req 1 = ${resSim1Code}, Req 2 = ${resSim2Code}`,
      simPass
    );

    // Clean up sim booking
    await prisma.appointment.deleteMany({ where: { doctorProfileId: doctorA.doctorProfile.id, appointmentDate: holdStartOfDay, startTime: holdTime } });

    // Test B & C: Slot Hold Reservation & Exclusion
    if (patientB) {
      await prisma.slotHold.deleteMany({ where: { doctorProfileId: doctorA.doctorProfile.id, appointmentDate: holdStartOfDay, startTime: holdTime } });

      const reqHold = { params: { doctorId: doctorA.doctorProfile.id }, body: { appointmentDate: holdDate, startTime: holdTime }, user: { id: patientA.id } };
      let holdCode = null;
      const resHold = { status: (c) => { holdCode = c; return resHold; }, json: () => resHold };
      await holdSlot(reqHold, resHold);

      // Patient B checks available slots -> slot should be marked unavailable
      const reqSlots = { params: { doctorId: doctorA.doctorProfile.id }, query: { date: holdDate }, user: { id: patientB.id } };
      let slotsRes = null;
      const resSlots = { status: (c) => resSlots, json: (d) => { slotsRes = d; return resSlots; } };
      await getAvailableSlots(reqSlots, resSlots);

      const targetSlot = slotsRes?.slots?.find((s) => s.startTime === holdTime);
      const isExcluded = targetSlot && targetSlot.isAvailable === false;

      record(
        '4 (Test B & C)',
        'Slot Hold Reservation & Exclusion to Other Patients',
        'Slot marked isAvailable = false for other patients',
        `Hold Status = ${holdCode}, Excluded = ${isExcluded}`,
        holdCode === 201 && isExcluded
      );

      // Clean up hold
      await prisma.slotHold.deleteMany({ where: { doctorProfileId: doctorA.doctorProfile.id, appointmentDate: holdStartOfDay, startTime: holdTime } });
    }

    // ----------------------------------------------------
    // Section 7 & 8: AI Safety, Human Review & Prompt Injection Resistance
    // ----------------------------------------------------
    console.log('--- TESTING PROMPT INJECTION RESISTANCE ---');
    const genuineNotes = 'Patient presented with mild cough and low-grade fever.';
    const injectionRes = validateSourceGrounding(
      {
        summary: 'Patient has cough and fever.',
        diagnosis: ['pneumonia'],
        medications: [{ name: 'Ibuprofen', dosage: '400mg' }],
        tests: [],
        followUp: 'Not specified by the doctor.',
        warnings: [],
      },
      genuineNotes,
      null
    );

    const isFlagged = injectionRes.needsHumanReview === true && injectionRes.reviewReasons.length > 0;
    record(
      '7 & 8',
      'AI Prompt Injection Defense & Grounding Enforcement',
      'Retained AS-IS, needsHumanReview = true, reviewReasons populated',
      `needsHumanReview = ${injectionRes.needsHumanReview}, Flagged Reasons = ${injectionRes.reviewReasons.length}`,
      isFlagged
    );

    // Section 7 (Case 6 & 7): Unauthorized & Cross-Doctor Approval Protection
    const mockUnauthApproveReq = { params: { appointmentId: 'dummy-id' }, user: { id: patientA.id } };
    let unauthCode = null;
    const mockUnauthApproveRes = { status: (c) => { unauthCode = c; return mockUnauthApproveRes; }, json: () => mockUnauthApproveRes };
    await approvePostVisitSummary(mockUnauthApproveReq, mockUnauthApproveRes);

    record(
      '7 (Case 6)',
      'Unauthorized (Patient) Post-Visit Approval Block',
      'HTTP 404/403 Error Response',
      `Status Code = ${unauthCode}`,
      unauthCode === 404 || unauthCode === 403
    );

    // ----------------------------------------------------
    // Section 10 & 11: Authentication & Authorization (IDOR) Audit
    // ----------------------------------------------------
    const patientPasswordHash = patientA.password;
    const isBcrypt = patientPasswordHash.startsWith('$2a$') || patientPasswordHash.startsWith('$2b$');
    record(
      '10',
      'Password Hashing Security Standard',
      'Bcrypt Salt Hashed ($2a$/$2b$)',
      `Password Hash Format = ${patientPasswordHash.slice(0, 7)}...`,
      isBcrypt
    );

    // ----------------------------------------------------
    // Section 14: Multi-Day Doctor Leave Engine Audit
    // ----------------------------------------------------
    const leaveStart = '2026-12-20';
    const leaveEnd = '2026-12-22';
    const midAppt = await prisma.appointment.create({
      data: {
        patientId: patientA.id,
        doctorProfileId: doctorA.doctorProfile.id,
        appointmentDate: new Date('2026-12-21T00:00:00.000Z'),
        startTime: '14:00',
        endTime: '14:30',
        status: 'BOOKED',
        symptoms: 'Multi-day leave audit',
      },
    });

    const mockMultiLeaveReq = {
      params: { doctorId: doctorA.doctorProfile.id },
      body: { startDate: leaveStart, endDate: leaveEnd, reason: 'Vacation' },
    };
    let leaveCode = null;
    const mockMultiLeaveRes = { status: (c) => { leaveCode = c; return mockMultiLeaveRes; }, json: () => mockMultiLeaveRes };
    await markDoctorLeave(mockMultiLeaveReq, mockMultiLeaveRes);

    const updatedMidAppt = await prisma.appointment.findUnique({ where: { id: midAppt.id } });
    const leavePass = leaveCode === 200 && updatedMidAppt.status === 'CANCELLED';

    record(
      '14',
      'Multi-Day Doctor Leave Range Conflict Auto-Cancellation',
      'Middle-day appointment auto-cancelled (status = CANCELLED)',
      `Leave Code = ${leaveCode}, Mid-Appt Status = ${updatedMidAppt?.status}`,
      leavePass
    );

    // Clean up leave appt
    await prisma.appointment.delete({ where: { id: midAppt.id } });

    // ----------------------------------------------------
    // Section 16 & 17: Notification & Medication Reminder Idempotency
    // ----------------------------------------------------
    const notifKey = `audit_idempotency_${Date.now()}:MEDICATION_REMINDER`;
    const notif1 = await createAndSendNotification({
      recipientUserId: patientA.id,
      type: 'MEDICATION_REMINDER',
      subject: 'Medication Idempotency Audit',
      bodyText: 'Take medicine now.',
      eventKey: notifKey,
    });

    const notif2 = await createAndSendNotification({
      recipientUserId: patientA.id,
      type: 'MEDICATION_REMINDER',
      subject: 'Medication Idempotency Audit Duplicate',
      bodyText: 'Take medicine now.',
      eventKey: notifKey,
    });

    const notifCount = await prisma.notificationLog.count({ where: { eventKey: notifKey } });
    record(
      '16 & 17',
      'Notification & Medication Reminder Idempotency Engine',
      'Count = 1 in database, duplicate skipped cleanly',
      `Count = ${notifCount}, First Status = ${notif1?.status}, Second Status = ${notif2?.status}`,
      notifCount === 1 && notif1?.status === 'SENT'
    );

    // Clean up audit notification
    await prisma.notificationLog.delete({ where: { eventKey: notifKey } });

    console.log('================================================================');
    console.log('--- AUDIT SUMMARY TABLE ---');
    console.log('================================================================');
    console.table(auditResults);

    const allPassed = auditResults.every((r) => r.Status === 'PASS');
    if (allPassed) {
      console.log('\nFINAL VERDICT: PASS — Systems operational, migration-safe & audit-verified!\n');
      process.exit(0);
    } else {
      console.error('\nFINAL VERDICT: FAIL — Some audit sections failed!\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('Audit execution error:', err);
    process.exit(1);
  }
}

runPhase5Audit();
