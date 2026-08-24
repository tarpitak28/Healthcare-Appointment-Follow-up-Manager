require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const prisma = require('./config/db');

async function main() {
	try {
		await prisma.$connect();
		const userCount = await prisma.user.count();
		const apptCount = await prisma.appointment.count();
		const reminderCount = await prisma.medicationReminder.count();
		console.log('PostgreSQL status: ACTIVE AND WORKING');
		console.log(`Users in DB: ${userCount}`);
		console.log(`Appointments in DB: ${apptCount}`);
		console.log(`Medication Reminders in DB: ${reminderCount}`);
	} catch (err) {
		console.error('PostgreSQL connection FAILED:', err.message);
	} finally {
		await prisma.$disconnect();
	}
}

main();
