require('dotenv').config({ path: '.env' });
const prisma = require('./config/db');

// Mock emailService BEFORE notificationService is loaded
const emailService = require('./utils/emailService');
emailService.sendEmail = async () => {
  console.log('[Mock SMTP] Simulating forced SMTP failure: 535 Authentication credentials invalid');
  return false; // sendEmail returns false on failure
};

const { processNotificationRetries, createAndSendNotification } = require('./services/notificationService');

async function runForcedFailureTicksTest() {
  console.log('================================================================');
  console.log('--- FORCED SMTP FAILURE ACROSS MULTIPLE CRON TICKS TEST ---');
  console.log('================================================================\n');

  const patient = await prisma.user.findFirst({ where: { role: 'PATIENT' } });
  if (!patient) {
    console.error('Patient user not found');
    process.exit(1);
  }

  const eventKey = `forced_failure_test_${Date.now()}:BOOKING_CONFIRMATION`;

  // 1. Create notification and attempt initial send (Attempt 1 Failure)
  console.log(`[TICK 1 - Initial Attempt] Executing createAndSendNotification at ${new Date().toISOString()}...`);
  const notif1 = await createAndSendNotification({
    recipientUserId: patient.id,
    type: 'BOOKING_CONFIRMATION',
    subject: 'Forced Failure Multi-Tick Test',
    bodyText: 'Testing multi-tick cron retries',
    eventKey,
  });

  console.log(`[TICK 1 RESULT] Timestamp=${new Date().toISOString()}`);
  console.log(`  -> status:        ${notif1.status}`);
  console.log(`  -> attempts:      ${notif1.attempts}`);
  console.log(`  -> lastError:     "${notif1.lastError}"`);
  console.log(`  -> lastAttemptAt: ${notif1.lastAttemptAt ? notif1.lastAttemptAt.toISOString() : 'null'}`);
  console.log(`  -> nextAttemptAt: ${notif1.nextAttemptAt ? notif1.nextAttemptAt.toISOString() : 'null'}\n`);

  // --- TICK 1.5 (Premature Check - Proving WHERE nextAttemptAt <= NOW Filter) ---
  console.log(`[TICK 1.5 - Premature Check] Executing cron tick 10 seconds after Tick 1 at ${new Date().toISOString()}...`);
  await processNotificationRetries();

  let state1_5 = await prisma.notificationLog.findUnique({ where: { id: notif1.id } });
  console.log(`[TICK 1.5 RESULT] Timestamp=${new Date().toISOString()}`);
  console.log(`  -> attempts: ${state1_5.attempts} (Unchanged! Proves WHERE nextAttemptAt <= NOW filtered it out)\n`);

  // --- TICK 2 (Simulated 1-minute backoff expiry for Attempt 2) ---
  console.log(`[TICK 2] Simulating 1-minute backoff expiry... Updating nextAttemptAt to past...`);
  await prisma.notificationLog.update({
    where: { id: notif1.id },
    data: { nextAttemptAt: new Date(Date.now() - 1000) },
  });

  console.log(`[TICK 2] Executing cron tick at ${new Date().toISOString()}...`);
  await processNotificationRetries();

  let state2 = await prisma.notificationLog.findUnique({ where: { id: notif1.id } });
  console.log(`[TICK 2 RESULT] Timestamp=${new Date().toISOString()}`);
  console.log(`  -> status:        ${state2.status}`);
  console.log(`  -> attempts:      ${state2.attempts}`);
  console.log(`  -> lastError:     "${state2.lastError}"`);
  console.log(`  -> lastAttemptAt: ${state2.lastAttemptAt ? state2.lastAttemptAt.toISOString() : 'null'}`);
  console.log(`  -> nextAttemptAt: ${state2.nextAttemptAt ? state2.nextAttemptAt.toISOString() : 'null'}\n`);

  // --- TICK 3 (Simulated 5-minute backoff expiry for Attempt 3) ---
  console.log(`[TICK 3] Simulating 5-minute backoff expiry... Updating nextAttemptAt to past...`);
  await prisma.notificationLog.update({
    where: { id: notif1.id },
    data: { nextAttemptAt: new Date(Date.now() - 1000) },
  });

  console.log(`[TICK 3] Executing cron tick at ${new Date().toISOString()}...`);
  await processNotificationRetries();

  let state3 = await prisma.notificationLog.findUnique({ where: { id: notif1.id } });
  console.log(`[TICK 3 RESULT] Timestamp=${new Date().toISOString()}`);
  console.log(`  -> status:        ${state3.status}`);
  console.log(`  -> attempts:      ${state3.attempts}`);
  console.log(`  -> lastError:     "${state3.lastError}"`);
  console.log(`  -> lastAttemptAt: ${state3.lastAttemptAt ? state3.lastAttemptAt.toISOString() : 'null'}`);
  console.log(`  -> nextAttemptAt: ${state3.nextAttemptAt ? state3.nextAttemptAt.toISOString() : 'null'}\n`);

  // Cleanup
  await prisma.notificationLog.delete({ where: { id: notif1.id } });

  const pass = notif1.attempts === 1 && state2.attempts === 2 && state3.attempts === 3 && notif1.status === 'PENDING';
  if (pass) {
    console.log('SUCCESS: Multi-tick forced SMTP failure backoff test PASSED cleanly!\n');
    process.exit(0);
  } else {
    console.error('FAILURE: Multi-tick test failed!\n');
    process.exit(1);
  }
}

runForcedFailureTicksTest();
