const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes'); // Add this line
const adminRoutes = require('./routes/adminRoutes'); // Add this line
const patientRoutes = require('./routes/patientRoutes'); // Add this line
const doctorRoutes = require('./routes/doctorRoutes'); // Add this line
const medicationRoutes = require('./routes/medicationRoutes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Mount Routes
app.use('/api/auth', authRoutes); // Add this line
app.use('/api/admin', adminRoutes); // Add this line
app.use('/api/patient', patientRoutes); // Add this line
app.use('/api/doctor', doctorRoutes); // Add this line
app.use('/api/medications', medicationRoutes);

// Base Route
app.get('/api/health', (req, res) => {
	res.status(200).json({ status: 'OK', message: 'Healthcare API is running smoothly' });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
	console.error('Unhandled Error:', err.stack);
	res.status(err.status || 500).json({
		success: false,
		message: err.message || 'Internal Server Error',
	});
});

module.exports = app;
