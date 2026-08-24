const prisma = require('../config/db');
const { resolveAudience } = require('./recipientService');
const { createAndSendNotification } = require('./notificationService');
const emailTemplates = require('../utils/emailTemplates');

/**
 * Broadcast Engine Service
 * Creates and dispatches individual, privacy-preserving broadcast emails to target audience cohorts.
 */

async function createBroadcast({ subject, message, audience = 'ALL_USERS', createdBy }) {
  const targetUsers = await resolveAudience(audience);

  if (!targetUsers || targetUsers.length === 0) {
    throw new Error(`No eligible recipients found for audience cohort: ${audience}`);
  }

  // 1. Create Broadcast Master Record
  const broadcast = await prisma.broadcast.create({
    data: {
      subject,
      message,
      audience: audience.toUpperCase(),
      status: 'QUEUED',
      recipientCount: targetUsers.length,
      createdBy: createdBy || 'ADMIN',
    },
  });

  // 2. Create BroadcastRecipient and NotificationLog records in background
  processBroadcastDispatch(broadcast, targetUsers).catch((err) => {
    console.error('[BroadcastEngine] Processing error:', err.message);
  });

  return {
    broadcastId: broadcast.id,
    recipientCount: targetUsers.length,
    audience: broadcast.audience,
    status: 'QUEUED',
  };
}

async function processBroadcastDispatch(broadcast, targetUsers) {
  try {
    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { status: 'PROCESSING' },
    });

    const BATCH_SIZE = 5;
    let sentCount = 0;

    for (let i = 0; i < targetUsers.length; i += BATCH_SIZE) {
      const batch = targetUsers.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (user) => {
          const eventKey = `${broadcast.id}:${user.id}:BROADCAST`;

          // Generate role-customized HTML template
          const bodyHtml = emailTemplates.systemAnnouncement({
            recipientName: user.name,
            role: user.role,
            subject: broadcast.subject,
            message: broadcast.message,
          });

          // Register BroadcastRecipient link
          await prisma.broadcastRecipient.upsert({
            where: {
              broadcastId_userId: {
                broadcastId: broadcast.id,
                userId: user.id,
              },
            },
            update: { status: 'PROCESSING' },
            create: {
              broadcastId: broadcast.id,
              userId: user.id,
              status: 'PROCESSING',
            },
          });

          // Dispatch individual private email (never CC/BCC multi-user list!)
          const notif = await createAndSendNotification({
            recipientUserId: user.id,
            type: 'SYSTEM_ANNOUNCEMENT',
            subject: broadcast.subject,
            bodyText: broadcast.message,
            bodyHtml,
            eventKey,
          });

          if (notif && notif.status === 'SENT') {
            sentCount++;
            await prisma.broadcastRecipient.update({
              where: {
                broadcastId_userId: {
                  broadcastId: broadcast.id,
                  userId: user.id,
                },
              },
              data: { status: 'SENT', sentAt: new Date() },
            });
          }
        })
      );
    }

    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    console.log(`[BroadcastEngine] Broadcast ${broadcast.id} completed. Sent ${sentCount}/${targetUsers.length} emails.`);
  } catch (error) {
    console.error(`[BroadcastEngine] Broadcast ${broadcast.id} failed:`, error);
    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { status: 'FAILED' },
    });
  }
}

module.exports = {
  createBroadcast,
};
