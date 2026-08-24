const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes'); // Add this line
const adminRoutes = require('./routes/adminRoutes'); // Add this line
const patientRoutes = require('./routes/patientRoutes'); // Add this line
const doctorRoutes = require('./routes/doctorRoutes'); // Add this line
const medicationRoutes = require('./routes/medicationRoutes');
const calendarRoutes = require('./routes/calendarRoutes');

const app = express();

const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === allowedOrigin) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy error: Origin not allowed'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Mount Routes
app.use('/api/auth', authRoutes); // Add this line
app.use('/api/admin', adminRoutes); // Add this line
app.use('/api/patient', patientRoutes); // Add this line
app.use('/api/doctor', doctorRoutes); // Add this line
app.use('/api/medications', medicationRoutes);
app.use('/api/calendar', calendarRoutes);

// Base & Health Routes
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Healthcare Appointment & Follow-Up Manager Backend API',
    healthCheck: '/api/health',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  });
});

app.get('/api/health', (req, res) => {
	res.status(200).json({ status: 'OK', message: 'Healthcare API is running smoothly' });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
	const isProduction = process.env.NODE_ENV === 'production';
	console.error('[Unhandled Server Error]:', isProduction ? err.message : (err.stack || err));

	res.status(err.status || 500).json({
		success: false,
		message: isProduction ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
	});
});

module.exports = app;
