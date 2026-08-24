require('dotenv').config({ path: '.env' });
const prisma = require('../src/config/db');
const emailService = require('../src/utils/emailService');
const { processNotificationRetries, createAndSendNotification } = require('../src/services/notificationService');

describe('Notification Reliability, Retries & Idempotency Test Suite', () => {
  let patient;

  beforeAll(async () => {
    patient = await prisma.user.findFirst({ where: { role: 'PATIENT' } });
    if (!patient) {
      patient = await prisma.user.create({
        data: {
          name: 'Notif Patient',
          email: 'notif_patient@example.com',
          password: '$2a$10$abcdefghijklmnopqrstuu',
          role: 'PATIENT',
        },
      });
    }
  });

  test('Idempotency: Concurrently requesting identical notification eventKey results in exactly one database record', async () => {
    const eventKey = `test_idempotency_${Date.now()}:BOOKING_CONFIRMATION`;

    // Dispatch notification twice concurrently
    const [res1, res2] = await Promise.all([
      createAndSendNotification({
        recipientUserId: patient.id,
        type: 'BOOKING_CONFIRMATION',
        subject: 'Idempotency Test 1',
        bodyText: 'Idempotency Body 1',
        eventKey,
      }),
      createAndSendNotification({
        recipientUserId: patient.id,
        type: 'BOOKING_CONFIRMATION',
        subject: 'Idempotency Test 2',
        bodyText: 'Idempotency Body 2',
        eventKey,
      }),
    ]);

    expect(res1).not.toBeNull();
    expect(res2).not.toBeNull();

    // Verify DB contains exactly 1 record for this eventKey
    const dbCount = await prisma.notificationLog.count({
      where: { eventKey },
    });

    expect(dbCount).toBe(1);

    // Cleanup
    await prisma.notificationLog.deleteMany({ where: { eventKey } });
  });

  test('Forced Failure & Backoff Schedule: Failed email delivery sets nextAttemptAt in future and processNotificationRetries filters on nextAttemptAt <= NOW', async () => {
    // 1. Mock sendEmail to fail with SMTP error
    const origSendEmail = emailService.sendEmail;
    emailService.sendEmail = jest.fn().mockResolvedValue(false);

    const eventKey = `test_forced_failure_${Date.now()}:BOOKING_CONFIRMATION`;

    // Initial send attempt (Attempt 1 Failure)
    const notif1 = await createAndSendNotification({
      recipientUserId: patient.id,
      type: 'BOOKING_CONFIRMATION',
      subject: 'Forced Failure Test',
      bodyText: 'Forced Failure Body',
      eventKey,
    });

    expect(notif1.status).toBe('PENDING');
    expect(notif1.attempts).toBe(1);
    expect(new Date(notif1.nextAttemptAt).getTime()).toBeGreaterThan(Date.now());

    // Execute premature cron tick 10 seconds later (before nextAttemptAt)
    await processNotificationRetries();

    const state1_5 = await prisma.notificationLog.findUnique({ where: { id: notif1.id } });
    expect(state1_5.attempts).toBe(1); // Unchanged! Proves WHERE nextAttemptAt <= NOW filtered it out

    // Update nextAttemptAt to past to simulate 1-minute backoff expiry
    await prisma.notificationLog.update({
      where: { id: notif1.id },
      data: { nextAttemptAt: new Date(Date.now() - 1000) },
    });

    // Execute cron tick 2 (Attempt 2 Failure)
    await processNotificationRetries();

    const state2 = await prisma.notificationLog.findUnique({ where: { id: notif1.id } });
    expect(state2.status).toBe('PENDING');
    expect(state2.attempts).toBe(2);
    expect(new Date(state2.nextAttemptAt).getTime()).toBeGreaterThan(Date.now());

    // Restore original sendEmail and cleanup
    emailService.sendEmail = origSendEmail;
    await prisma.notificationLog.deleteMany({ where: { id: notif1.id } });
  });

  test('Max Attempts Bounding: Notifications failing 5 times transition to status=FAILED and stop retrying', async () => {
    const eventKey = `test_max_attempts_${Date.now()}:BOOKING_CONFIRMATION`;

    const notif = await prisma.notificationLog.create({
      data: {
        recipientUserId: patient.id,
        type: 'BOOKING_CONFIRMATION',
        subject: 'Max Attempts Test',
        bodyText: 'Max Attempts Body',
        eventKey,
        status: 'PENDING',
        attempts: 4, // 4 prior failures
        nextAttemptAt: new Date(Date.now() - 1000), // Due now
      },
    });

    // Mock sendEmail to fail on attempt 5
    const origSendEmail = emailService.sendEmail;
    emailService.sendEmail = jest.fn().mockResolvedValue(false);

    await processNotificationRetries();

    const finalState = await prisma.notificationLog.findUnique({ where: { id: notif.id } });
    expect(finalState.status).toBe('FAILED');
    expect(finalState.attempts).toBe(5);

    // Restore sendEmail and cleanup
    emailService.sendEmail = origSendEmail;
    await prisma.notificationLog.deleteMany({ where: { id: notif.id } });
  });
});
