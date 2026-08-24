require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { validateEnvironment } = require('./config/env');
const app = require('./app');
const prisma = require('./config/db');
const { startCronJobs } = require('./services/cronService');

const PORT = process.env.PORT || 5000;

async function startServer() {
	try {
		validateEnvironment();
		await prisma.$connect();
		console.log('Database connected successfully via Prisma.');
		startCronJobs();

		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

startServer();
