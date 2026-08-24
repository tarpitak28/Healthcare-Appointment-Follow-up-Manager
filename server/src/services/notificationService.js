const prisma = require('../config/db');
const { sendEmail } = require('../utils/emailService');

// Calculate bounded exponential backoff retry time
function calculateNextRetryTime(attemptCount) {
  const delaysInMinutes = [1, 5, 15, 60]; // Retry 1: 1m, Retry 2: 5m, Retry 3: 15m, Retry 4+: 60m
  const delayMins = delaysInMinutes[Math.min(attemptCount, delaysInMinutes.length - 1)];
  return new Date(Date.now() + delayMins * 60 * 1000);
}

// Sanitize raw SMTP / network errors (no passwords, keys, or tokens in logs)
function sanitizeError(err) {
  if (!err) return 'Unknown notification error';
  const msg = err.message || String(err);
  return msg
    .replace(/pass(word)?\s*[:=]\s*\S+/gi, 'pass=***')
    .replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'bearer ***')
    .replace(/key\s*[:=]\s*\S+/gi, 'key=***')
    .slice(0, 255);
}

// Central Idempotent Notification Dispatcher
async function createAndSendNotification({
  recipientUserId,
  type,
  appointmentId = null,
  subject,
  bodyText = '',
  bodyHtml = null,
  eventKey,
  attachments = null,
}) {
  if (!recipientUserId || !type || !subject || !eventKey) {
    console.error('[NotificationService] Missing required notification parameters');
    return null;
  }

  try {
    // 1. Idempotency Check: find existing notification by unique eventKey
    let notification = await prisma.notificationLog.findUnique({
      where: { eventKey },
    });

    if (notification && notification.status === 'SENT') {
      console.log(`[NotificationService] Event key ${eventKey} already SENT. Skipping duplicate dispatch.`);
      return notification;
    }

    if (!notification) {
      notification = await prisma.notificationLog.create({
        data: {
          recipientUserId,
          type,
          appointmentId,
          subject,
          bodyText: bodyText || '',
          bodyHtml,
          eventKey,
          status: 'PENDING',
          nextAttemptAt: new Date(),
        },
      });
    }

    // 2. Fetch recipient user email
    const recipient = await prisma.user.findUnique({
      where: { id: recipientUserId },
      select: { email: true },
    });

    if (!recipient || !recipient.email) {
      const err = 'Recipient user email not found';
      await prisma.notificationLog.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          attempts: notification.attempts + 1,
          lastError: err,
          failedAt: new Date(),
        },
      });
      return notification;
    }

    // 3. Attempt immediate Nodemailer dispatch wrapped in soft try/catch
    const startTime = Date.now();
    try {
      await sendEmail({
        to: recipient.email,
        subject,
        text: bodyText,
        html: bodyHtml,
        calendarInvite: attachments,
      });

      const updated = await prisma.notificationLog.update({
        where: { id: notification.id },
        data: {
          status: 'SENT',
          attempts: notification.attempts + 1,
          lastAttemptAt: new Date(),
          sentAt: new Date(),
          lastError: null,
        },
      });

      console.log(`[NotificationService] Sent ${type} notification to ${recipient.email} (${Date.now() - startTime}ms)`);
      return updated;
    } catch (emailErr) {
      const sanitized = sanitizeError(emailErr);
      const nextAttempts = notification.attempts + 1;
      const MAX_ATTEMPTS = 5;

      const nextStatus = nextAttempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING';
      const nextRetry = nextAttempts >= MAX_ATTEMPTS ? null : calculateNextRetryTime(nextAttempts);

      const updated = await prisma.notificationLog.update({
        where: { id: notification.id },
        data: {
          status: nextStatus,
          attempts: nextAttempts,
          lastAttemptAt: new Date(),
          nextAttemptAt: nextRetry,
          lastError: sanitized,
          ...(nextStatus === 'FAILED' && { failedAt: new Date() }),
        },
      });

      console.error(`[NotificationService] Email send failed for ${eventKey} (attempt ${nextAttempts}/${MAX_ATTEMPTS}):`, sanitized);
      return updated;
    }
  } catch (err) {
    console.error('[NotificationService] Unexpected error in createAndSendNotification:', sanitizeError(err));
    return null;
  }
}

// Bounded Retry Worker (called by cron every minute)
async function processNotificationRetries() {
  try {
    const MAX_ATTEMPTS = 5;
    const now = new Date();

    // Fetch pending notifications due for retry
    const pendingLogs = await prisma.notificationLog.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        nextAttemptAt: { lte: now },
        attempts: { lt: MAX_ATTEMPTS },
      },
      take: 20,
    });

    if (pendingLogs.length === 0) return;

    console.log(`[NotificationCron] Processing ${pendingLogs.length} due notification retries...`);

    for (const log of pendingLogs) {
      // Atomic state transition PENDING/FAILED -> PROCESSING to prevent concurrency race
      const claim = await prisma.notificationLog.updateMany({
        where: {
          id: log.id,
          status: { in: ['PENDING', 'FAILED'] },
        },
        data: {
          status: 'PROCESSING',
        },
      });

      if (claim.count === 0) continue; // Claimed by another worker

      const recipient = await prisma.user.findUnique({
        where: { id: log.recipientUserId },
        select: { email: true },
      });

      if (!recipient || !recipient.email) {
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: 'FAILED',
            attempts: log.attempts + 1,
            lastError: 'Recipient email not found',
            failedAt: new Date(),
          },
        });
        continue;
      }

      try {
        await sendEmail({
          to: recipient.email,
          subject: log.subject,
          text: log.bodyText || '',
          html: log.bodyHtml,
        });

        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: 'SENT',
            attempts: log.attempts + 1,
            lastAttemptAt: new Date(),
            sentAt: new Date(),
            lastError: null,
          },
        });

        console.log(`[NotificationCron] Successfully retried notification ${log.eventKey} on attempt ${log.attempts + 1}`);
      } catch (err) {
        const sanitized = sanitizeError(err);
        const newAttempts = log.attempts + 1;
        const finalStatus = newAttempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING';
        const nextRetry = newAttempts >= MAX_ATTEMPTS ? null : calculateNextRetryTime(newAttempts);

        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: finalStatus,
            attempts: newAttempts,
            lastAttemptAt: new Date(),
            nextAttemptAt: nextRetry,
            lastError: sanitized,
            ...(finalStatus === 'FAILED' && { failedAt: new Date() }),
          },
        });

        console.error(`[NotificationCron] Retry failed for ${log.eventKey} (attempt ${newAttempts}/${MAX_ATTEMPTS}): ${sanitized}`);
      }
    }
  } catch (cronErr) {
    console.error('[NotificationCron] Error processing notification retries:', sanitizeError(cronErr));
  }
}

module.exports = {
  createAndSendNotification,
  processNotificationRetries,
  calculateNextRetryTime,
  sanitizeError,
};
