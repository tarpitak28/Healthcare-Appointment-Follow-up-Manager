const cron = require('node-cron');
const prisma = require('../config/db');
const { processNotificationRetries, createAndSendNotification } = require('./notificationService');

function startCronJobs() {
	// Job 1: Clean expired slot holds every minute
	cron.schedule('* * * * *', async () => {
		try {
			const deleted = await prisma.slotHold.deleteMany({
				where: {
					expiresAt: { lt: new Date() },
				},
			});
			if (deleted.count > 0) {
				console.log(`[Cron] Cleaned ${deleted.count} expired slot holds`);
			}
		} catch (err) {
			console.error('[Cron] Failed to clean expired slot holds:', err.message);
		}
	});

	// Job 2: Process notification retries every minute
	cron.schedule('* * * * *', async () => {
		try {
			await processNotificationRetries();
		} catch (err) {
			console.error('[Cron] Notification retry job error:', err.message);
		}
	});

	// Job 3: Dispatch active medication reminders every minute
	cron.schedule('* * * * *', async () => {
		try {
			const now = new Date();
			const todayStr = now.toISOString().split('T')[0];
			const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
			const todayStart = new Date(`${todayStr}T00:00:00.000Z`);

			const activeReminders = await prisma.medicationReminder.findMany({
				where: {
					isActive: true,
					startDate: { lte: todayStart },
					endDate: { gte: todayStart },
				},
			});

			for (const rem of activeReminders) {
				const times = Array.isArray(rem.reminderTimes) ? rem.reminderTimes : [];
				if (times.includes(currentHourMin)) {
					const eventKey = `${rem.id}:${todayStr}:${currentHourMin}:MEDICATION_REMINDER`;
					await createAndSendNotification({
						recipientUserId: rem.patientId,
						type: 'MEDICATION_REMINDER',
						appointmentId: rem.appointmentId,
						subject: `Medication Reminder: ${rem.medicineName}`,
						bodyText: `Reminder to take your prescribed medication: ${rem.medicineName} (${rem.dosage || 'standard dosage'}) at ${currentHourMin}.`,
						eventKey,
					});
				}
			}
		} catch (err) {
			console.error('[Cron] Medication reminder dispatcher error:', err.message);
		}
	});
}

module.exports = { startCronJobs };
