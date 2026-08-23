const { Worker, Queue } = require('bullmq');
const { sendEmail } = require('../services/emailService');

const redisConnection = {
	host: process.env.REDIS_HOST || 'localhost',
	port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
};

// Create notification queue
const notificationQueue = new Queue('notificationQueue', { connection: redisConnection });

// Worker to process background jobs
const reminderWorker = new Worker(
	'notificationQueue',
	async (job) => {
		const { type, recipientEmail, subject, html, text } = job.data;

		console.log(`[Background Job] Processing ${type} for ${recipientEmail}...`);
		const success = await sendEmail({ to: recipientEmail, subject, html, text });

		if (!success) {
			throw new Error(`Failed to send ${type} email to ${recipientEmail}`);
		}

		return { success: true };
	},
	{
		connection: redisConnection,
		limiter: {
			max: 10,
			duration: 1000,
		},
	}
);

reminderWorker.on('completed', (job) => {
	console.log(`Job ${job.id} completed successfully.`);
});

reminderWorker.on('failed', (job, err) => {
	console.error(`Job ${job.id} failed with error: ${err.message}`);
});

module.exports = {
	notificationQueue,
};
