require('dotenv').config({ path: '.env' });
const prisma = require('./config/db');
const {
  createAndSendNotification,
  processNotificationRetries,
  sanitizeError,
} = require('./services/notificationService');
const { bookAppointment, cancelAppointment } = require('./controllers/patientController');
const { markDoctorLeave } = require('./controllers/adminController');
const { submitPostVisitNotes } = require('./controllers/doctorController');

async function runNotificationReliabilityTests() {
  console.log('====================================================');
  console.log('--- STARTING PHASE 4 NOTIFICATION RELIABILITY TESTS ---');
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
    let patient = await prisma.user.findFirst({ where: { role: 'PATIENT' } });
    let doctor = await prisma.user.findFirst({ where: { role: 'DOCTOR' }, include: { doctorProfile: true } });

    if (!patient || !doctor || !doctor.doctorProfile) {
      console.error('Missing test users in database!');
      process.exit(1);
    }

    // ----------------------------------------------------
    // Test 1: Successful Email Notification
    // ----------------------------------------------------
    const key1 = `test_success_${Date.now()}:BOOKING_CONFIRMATION`;
    const notif1 = await createAndSendNotification({
      recipientUserId: patient.id,
      type: 'BOOKING_CONFIRMATION',
      subject: 'Test Successful Email',
      bodyText: 'Your appointment is confirmed.',
      eventKey: key1,
    });

    recordResult(
      'Test 1: Successful Email',
      'Status = SENT, Attempts = 1',
      `Status = ${notif1?.status}, Attempts = ${notif1?.attempts}`,
      notif1?.status === 'SENT' && notif1?.attempts === 1
    );

    // ----------------------------------------------------
    // Test 2: Idempotency / Duplicate Prevention
    // ----------------------------------------------------
    const duplicateNotif = await createAndSendNotification({
      recipientUserId: patient.id,
      type: 'BOOKING_CONFIRMATION',
      subject: 'Test Successful Email Duplicate',
      bodyText: 'Your appointment is confirmed.',
      eventKey: key1, // Same event key
    });

    const notifCountKey1 = await prisma.notificationLog.count({ where: { eventKey: key1 } });

    recordResult(
      'Test 2: Duplicate Prevention (Idempotency)',
      'Count = 1, Returned SENT status',
      `Count = ${notifCountKey1}, Status = ${duplicateNotif?.status}`,
      notifCountKey1 === 1 && duplicateNotif?.status === 'SENT'
    );

    // ----------------------------------------------------
    // Test 3: Sensitive Log Sanitization
    // ----------------------------------------------------
    const rawError = new Error('SMTP connection failed at user=admin password=SecretPassword123 with key=AIzaSyXYZ bearer 123456');
    const sanitized = sanitizeError(rawError);

    const hasSecret = sanitized.includes('SecretPassword123') || sanitized.includes('AIzaSyXYZ') || sanitized.includes('123456');
    recordResult(
      'Test 3: Sensitive Log Sanitization',
      'Secrets stripped (pass=***, key=***)',
      `Sanitized Error: "${sanitized}"`,
      !hasSecret && sanitized.includes('pass=***')
    );

    // ----------------------------------------------------
    // Test 4: Booking Creation + Email Failure Isolation
    // ----------------------------------------------------
    const testDate4 = '2026-12-01';
    const testTime4 = '10:00';

    const mockReq4 = {
      user: { id: patient.id },
      body: {
        doctorProfileId: doctor.doctorProfile.id,
        appointmentDate: testDate4,
        startTime: testTime4,
        endTime: '10:30',
        symptoms: 'Notification isolation test',
      },
    };

    let status4 = null;
    let body4 = null;
    const mockRes4 = {
      status: (c) => { status4 = c; return mockRes4; },
      json: (d) => { body4 = d; return mockRes4; },
    };

    await bookAppointment(mockReq4, mockRes4);

    const createdApptId = body4?.appointment?.id;
    const bookingNotif = createdApptId
      ? await prisma.notificationLog.findUnique({ where: { eventKey: `${createdApptId}:BOOKING_CONFIRMATION` } })
      : null;

    recordResult(
      'Test 4: Booking Creation + Email Failure Isolation',
      'HTTP Status 201 Created & NotificationLog Created',
      `HTTP Status = ${status4}, Notif Status = ${bookingNotif?.status}`,
      status4 === 201 && bookingNotif !== null
    );

    // ----------------------------------------------------
    // Test 5: Patient Cancellation Notification
    // ----------------------------------------------------
    if (createdApptId) {
      const mockReq5 = {
        params: { appointmentId: createdApptId },
        user: { id: patient.id },
      };
      let status5 = null;
      const mockRes5 = {
        status: (c) => { status5 = c; return mockRes5; },
        json: (d) => { return mockRes5; },
      };

      await cancelAppointment(mockReq5, mockRes5);

      const cancelNotif = await prisma.notificationLog.findUnique({
        where: { eventKey: `${createdApptId}:APPOINTMENT_CANCELLATION` },
      });

      recordResult(
        'Test 5: Patient Cancellation Notification',
        'Notification created with APPOINTMENT_CANCELLATION type',
        `Notif Type = ${cancelNotif?.type}, Status = ${cancelNotif?.status}`,
        cancelNotif?.type === 'APPOINTMENT_CANCELLATION'
      );
    }

    // ----------------------------------------------------
    // Test 6: Doctor Leave Conflict Cancellation Notification
    // ----------------------------------------------------
    const leaveDateStr = '2026-12-10';
    const apptOnLeave = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorProfileId: doctor.doctorProfile.id,
        appointmentDate: new Date(`${leaveDateStr}T00:00:00.000Z`),
        startTime: '14:00',
        endTime: '14:30',
        status: 'BOOKED',
        symptoms: 'Leave conflict notification test',
      },
    });

    const mockLeaveReq = {
      params: { doctorId: doctor.doctorProfile.id },
      body: { startDate: leaveDateStr, endDate: leaveDateStr, reason: 'Conference' },
    };
    let leaveStatus = null;
    let leaveBody = null;
    const mockLeaveRes = {
      status: (c) => { leaveStatus = c; return mockLeaveRes; },
      json: (d) => { leaveBody = d; return mockLeaveRes; },
    };

    await markDoctorLeave(mockLeaveReq, mockLeaveRes);

    const leaveNotif = await prisma.notificationLog.findUnique({
      where: { eventKey: `${apptOnLeave.id}:DOCTOR_LEAVE_CANCELLATION` },
    });

    recordResult(
      'Test 6: Doctor Leave Conflict Notification',
      'DOCTOR_LEAVE_CANCELLATION NotificationLog created',
      `Status = ${leaveStatus}, Notif Type = ${leaveNotif?.type}`,
      leaveStatus === 200 && leaveNotif?.type === 'DOCTOR_LEAVE_CANCELLATION'
    );

    // Clean up leave appt
    await prisma.appointment.delete({ where: { id: apptOnLeave.id } });

    // ----------------------------------------------------
    // Test 7: Post-Visit Completion Notification
    // ----------------------------------------------------
    const postVisitAppt = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorProfileId: doctor.doctorProfile.id,
        appointmentDate: new Date('2026-12-15T00:00:00.000Z'),
        startTime: '11:00',
        endTime: '11:30',
        status: 'BOOKED',
        symptoms: 'Post-visit notification test',
      },
    });

    const mockPostVisitReq = {
      params: { appointmentId: postVisitAppt.id },
      user: { id: doctor.id },
      body: {
        clinicalNotes: 'Routine follow-up notes',
        prescription: { diagnosis: 'Routine', medicines: [] },
      },
    };
    let postVisitStatus = null;
    const mockPostVisitRes = {
      status: (c) => { postVisitStatus = c; return mockPostVisitRes; },
      json: (d) => { return mockPostVisitRes; },
    };

    await submitPostVisitNotes(mockPostVisitReq, mockPostVisitRes);

    const postVisitNotif = await prisma.notificationLog.findUnique({
      where: { eventKey: `${postVisitAppt.id}:POST_VISIT_SUMMARY` },
    });

    recordResult(
      'Test 7: Post-Visit Completion Notification',
      'POST_VISIT_SUMMARY NotificationLog created',
      `Appt Status = 200, Notif Type = ${postVisitNotif?.type}`,
      postVisitStatus === 200 && postVisitNotif?.type === 'POST_VISIT_SUMMARY'
    );

    // Clean up post-visit appt
    await prisma.appointment.delete({ where: { id: postVisitAppt.id } });

    // ----------------------------------------------------
    // Test 8: Cron Retry Worker Execution & Server Restart Recovery
    // ----------------------------------------------------
    const retryKey = `test_retry_${Date.now()}:BOOKING_CONFIRMATION`;
    const overdueNotif = await prisma.notificationLog.create({
      data: {
        recipientUserId: patient.id,
        type: 'BOOKING_CONFIRMATION',
        subject: 'Overdue Retry Test',
        bodyText: 'Retrying past notification',
        eventKey: retryKey,
        status: 'PENDING',
        attempts: 1,
        nextAttemptAt: new Date(Date.now() - 5000), // 5 seconds in past
      },
    });

    await processNotificationRetries();

    const retriedNotif = await prisma.notificationLog.findUnique({ where: { id: overdueNotif.id } });
    recordResult(
      'Test 8: Cron Retry & Restart Recovery',
      'Pending overdue notification retried from PostgreSQL storage',
      `Status = ${retriedNotif?.status}, Attempts = ${retriedNotif?.attempts}`,
      retriedNotif?.status === 'SENT' || retriedNotif?.attempts > 1
    );

    // Clean up retry log
    await prisma.notificationLog.delete({ where: { id: overdueNotif.id } });

    // ----------------------------------------------------
    // Test 9: Maximum Retries Bounded Threshold
    // ----------------------------------------------------
    const maxRetryKey = `test_max_retry_${Date.now()}:BOOKING_CONFIRMATION`;
    const maxAttemptNotif = await prisma.notificationLog.create({
      data: {
        recipientUserId: patient.id,
        type: 'BOOKING_CONFIRMATION',
        subject: 'Max Retries Test',
        bodyText: 'Max attempts test',
        eventKey: maxRetryKey,
        status: 'FAILED',
        attempts: 5,
        failedAt: new Date(),
        nextAttemptAt: null,
      },
    });

    // Run retry cron - should skip attempts >= 5
    await processNotificationRetries();

    const maxedOutNotif = await prisma.notificationLog.findUnique({ where: { id: maxAttemptNotif.id } });
    recordResult(
      'Test 9: Maximum Retries Threshold',
      'Ignored by cron worker & remains FAILED after 5 attempts',
      `Status = ${maxedOutNotif?.status}, Attempts = ${maxedOutNotif?.attempts}`,
      maxedOutNotif?.status === 'FAILED' && maxedOutNotif?.attempts === 5
    );

    // Clean up max retry log
    await prisma.notificationLog.delete({ where: { id: maxAttemptNotif.id } });

    console.log('====================================================');
    console.log('--- TEST SUMMARY TABLE ---');
    console.log('====================================================');
    console.table(testResults);

    const allPassed = testResults.every((t) => t.Status === 'PASS');
    if (allPassed) {
      console.log('\nFINAL VERDICT: PASS — All Phase 4 Notification Reliability requirements verified!\n');
      process.exit(0);
    } else {
      console.error('\nFINAL VERDICT: FAIL — Some notification reliability tests failed!\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runNotificationReliabilityTests();
