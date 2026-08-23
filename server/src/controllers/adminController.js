const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all doctors and their profiles
async function getAllDoctors(req, res) {
	try {
		const doctors = await prisma.user.findMany({
			where: { role: 'DOCTOR' },
			include: {
				doctorProfile: {
					include: {
						leaveDays: true,
					},
				},
			},
			select: {
				id: true,
				name: true,
				email: true,
				createdAt: true,
				doctorProfile: true,
			},
		});

		res.status(200).json({ success: true, doctors });
	} catch (error) {
		console.error('Fetch doctors error:', error);
		res.status(500).json({ success: false, message: 'Server error fetching doctors' });
	}
}

// Admin creates a doctor profile/account directly
async function createDoctor(req, res) {
	try {
		const { name, email, password, specialisation, slotDuration, workingHours } = req.body;

		if (!name || !email || !password || !specialisation) {
			return res.status(400).json({ success: false, message: 'Please provide all required doctor fields' });
		}

		const existingUser = await prisma.user.findUnique({ where: { email } });
		if (existingUser) {
			return res.status(400).json({ success: false, message: 'User with this email already exists' });
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const doctorUser = await prisma.$transaction(async (tx) => {
			const user = await tx.user.create({
				data: {
					name,
					email,
					password: hashedPassword,
					role: 'DOCTOR',
				},
			});

			const profile = await tx.doctorProfile.create({
				data: {
					userId: user.id,
					specialisation,
					slotDuration: slotDuration ? parseInt(slotDuration) : 30,
					workingHours: workingHours || { start: '09:00', end: '17:00' },
				},
			});

			return { ...user, doctorProfile: profile };
		});

		res.status(201).json({
			success: true,
			message: 'Doctor account and profile created successfully',
			doctor: {
				id: doctorUser.id,
				name: doctorUser.name,
				email: doctorUser.email,
				doctorProfile: doctorUser.doctorProfile,
			},
		});
	} catch (error) {
		console.error('Create doctor error:', error);
		res.status(500).json({ success: false, message: 'Server error creating doctor profile' });
	}
}

// Mark doctor on leave & check for conflicting bookings
async function markDoctorLeave(req, res) {
	try {
		const { doctorProfileId } = req.params;
		const { date, reason } = req.body; // date format: YYYY-MM-DD

		if (!date) {
			return res.status(400).json({ success: false, message: 'Please provide a leave date' });
		}

		const leaveDate = new Date(date);

		// Check if doctor profile exists
		const doctorProfile = await prisma.doctorProfile.findUnique({
			where: { id: doctorProfileId },
			include: { user: true },
		});

		if (!doctorProfile) {
			return res.status(404).json({ success: false, message: 'Doctor profile not found' });
		}

		// Create the leave record
		const leave = await prisma.doctorLeave.create({
			data: {
				doctorProfileId,
				date: leaveDate,
				reason: reason || 'Scheduled Leave',
			},
		});

		// Find any existing booked appointments on this exact date for this doctor
		const startOfDay = new Date(leaveDate);
		startOfDay.setUTCHours(0, 0, 0, 0);
		const endOfDay = new Date(leaveDate);
		endOfDay.setUTCHours(23, 59, 59, 999);

		const conflictingAppointments = await prisma.appointment.findMany({
			where: {
				doctorProfileId,
				appointmentDate: {
					gte: startOfDay,
					lte: endOfDay,
				},
				status: 'BOOKED',
			},
			include: {
				patient: true,
			},
		});

		// Automatically cancel conflicting appointments or mark them for cancellation and notify patients
		const affectedAppointments = [];
		for (const appt of conflictingAppointments) {
			// Update appointment status to CANCELLED
			await prisma.appointment.update({
				where: { id: appt.id },
				data: { status: 'CANCELLED' },
			});

			affectedAppointments.push({
				appointmentId: appt.id,
				patientName: appt.patient.name,
				patientEmail: appt.patient.email,
				startTime: appt.startTime,
			});

			// TODO: Trigger email notification to affected patient (handled via email service later)
			console.log(`[LEAVE CONFLICT] Notifying patient ${appt.patient.email}: Appointment on ${date} at ${appt.startTime} cancelled due to doctor leave.`);
		}

		res.status(200).json({
			success: true,
			message: 'Doctor leave recorded successfully. Conflicting bookings were cancelled and flagged.',
			leave,
			affectedAppointmentsCount: affectedAppointments.length,
			affectedAppointments,
		});
	} catch (error) {
		console.error('Mark leave error:', error);
		res.status(500).json({ success: false, message: 'Server error marking leave' });
	}
}

module.exports = {
	getAllDoctors,
	createDoctor,
	markDoctorLeave,
};
