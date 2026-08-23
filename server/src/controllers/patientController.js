const prisma = require('../config/db');
const { generatePreVisitSummary } = require('../services/llmService');

// Search doctors by specialisation or view all
async function searchDoctors(req, res) {
	try {
		const { specialisation, name } = req.query;

		const whereClause = {
			role: 'DOCTOR',
		};

		if (specialisation) {
			whereClause.doctorProfile = {
				specialisation: {
					contains: specialisation,
					mode: 'insensitive',
				},
			};
		}

		if (name) {
			whereClause.name = {
				contains: name,
				mode: 'insensitive',
			};
		}

		const doctors = await prisma.user.findMany({
			where: whereClause,
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
				doctorProfile: true,
			},
		});

		res.status(200).json({ success: true, doctors });
	} catch (error) {
		console.error('Search doctors error:', error);
		res.status(500).json({ success: false, message: 'Server error searching doctors' });
	}
}

// Get available slots for a doctor on a specific date
async function getAvailableSlots(req, res) {
	try {
		const { doctorProfileId } = req.params;
		const { date } = req.query; // YYYY-MM-DD

		if (!date) {
			return res.status(400).json({ success: false, message: 'Please provide a date query parameter (YYYY-MM-DD)' });
		}

		const targetDate = new Date(date);

		// 1. Check if doctor profile exists
		const doctorProfile = await prisma.doctorProfile.findUnique({
			where: { id: doctorProfileId },
			include: { leaveDays: true },
		});

		if (!doctorProfile) {
			return res.status(404).json({ success: false, message: 'Doctor profile not found' });
		}

		// 2. Check if doctor is on leave on this date
		const startOfDay = new Date(targetDate);
		startOfDay.setUTCHours(0, 0, 0, 0);
		const endOfDay = new Date(targetDate);
		endOfDay.setUTCHours(23, 59, 59, 999);

		const isLeave = doctorProfile.leaveDays.some((leave) => {
			const leaveDate = new Date(leave.date);
			return leaveDate.toISOString().split('T')[0] === startOfDay.toISOString().split('T')[0];
		});

		if (isLeave) {
			return res.status(200).json({ success: true, date, slots: [], message: 'Doctor is on leave on this date' });
		}

		// 3. Generate all potential slots based on working hours and slot duration
		const workingHours = doctorProfile.workingHours || { start: '09:00', end: '17:00' };
		const slotDurationMinutes = doctorProfile.slotDuration || 30;

		const [startHour, startMin] = workingHours.start.split(':').map(Number);
		const [endHour, endMin] = workingHours.end.split(':').map(Number);

		let currentMinutes = startHour * 60 + startMin;
		const endMinutes = endHour * 60 + endMin;

		const allSlots = [];
		while (currentMinutes + slotDurationMinutes <= endMinutes) {
			const sHour = String(Math.floor(currentMinutes / 60)).padStart(2, '0');
			const sMin = String(currentMinutes % 60).padStart(2, '0');
			const startTime = `${sHour}:${sMin}`;

			currentMinutes += slotDurationMinutes;

			const eHour = String(Math.floor(currentMinutes / 60)).padStart(2, '0');
			const eMin = String(currentMinutes % 60).padStart(2, '0');
			const endTime = `${eHour}:${eMin}`;

			allSlots.push({ startTime, endTime });
		}

		// 4. Fetch already booked appointments for this doctor on this date
		const bookedAppointments = await prisma.appointment.findMany({
			where: {
				doctorProfileId,
				appointmentDate: {
					gte: startOfDay,
					lte: endOfDay,
				},
				status: 'BOOKED',
			},
			select: { startTime: true },
		});

		const bookedTimes = new Set(bookedAppointments.map((app) => app.startTime));

		// 5. Filter out booked slots
		const availableSlots = allSlots.map((slot) => ({
			...slot,
			isAvailable: !bookedTimes.has(slot.startTime),
		}));

		res.status(200).json({ success: true, date, slots: availableSlots });
	} catch (error) {
		console.error('Get available slots error:', error);
		res.status(500).json({ success: false, message: 'Server error fetching available slots' });
	}
}

// Book an appointment with concurrency safety & LLM Pre-visit summary
async function bookAppointment(req, res) {
	try {
		const { doctorProfileId, appointmentDate, startTime, endTime, symptoms } = req.body;
		const patientId = req.user.id;

		if (!doctorProfileId || !appointmentDate || !startTime || !endTime || !symptoms) {
			return res.status(400).json({ success: false, message: 'Please provide all required appointment details' });
		}

		const targetDate = new Date(appointmentDate);
		const startOfDay = new Date(targetDate);
		startOfDay.setUTCHours(0, 0, 0, 0);
		const endOfDay = new Date(targetDate);
		endOfDay.setUTCHours(23, 59, 59, 999);

		// 1. Generate Pre-Visit Summary via LLM beforehand
		const preVisitAI = await generatePreVisitSummary(symptoms);

		// 2. Use Prisma Interactive Transaction with Serializable Isolation / Row locking check to prevent double booking
		const appointment = await prisma.$transaction(async (tx) => {
			// Check if the slot is already booked
			const existingBooking = await tx.appointment.findFirst({
				where: {
					doctorProfileId,
					appointmentDate: {
						gte: startOfDay,
						lte: endOfDay,
					},
					startTime,
					status: 'BOOKED',
				},
			});

			if (existingBooking) {
				throw new Error('This time slot is already booked. Please choose another slot.');
			}

			// Create the appointment
			const newAppointment = await tx.appointment.create({
				data: {
					patientId,
					doctorProfileId,
					appointmentDate: startOfDay,
					startTime,
					endTime,
					status: 'BOOKED',
					symptoms,
					urgencyLevel: preVisitAI.urgencyLevel,
					chiefComplaint: preVisitAI.chiefComplaint,
					suggestedQuestions: preVisitAI.suggestedQuestions,
				},
				include: {
					doctorProfile: { include: { user: true } },
					patient: true,
				},
			});

			return newAppointment;
		});

		res.status(201).json({
			success: true,
			message: 'Appointment booked successfully',
			appointment,
		});
	} catch (error) {
		console.error('Booking error:', error);
		res.status(400).json({
			success: false,
			message: error.message || 'Server error during appointment booking',
		});
	}
}

// Get patient's appointment history
async function getPatientAppointments(req, res) {
	try {
		const patientId = req.user.id;

		const appointments = await prisma.appointment.findMany({
			where: { patientId },
			include: {
				doctorProfile: {
					include: { user: true },
				},
			},
			orderBy: { appointmentDate: 'desc' },
		});

		res.status(200).json({ success: true, appointments });
	} catch (error) {
		console.error('Fetch patient appointments error:', error);
		res.status(500).json({ success: false, message: 'Server error fetching appointments' });
	}
}

module.exports = {
	searchDoctors,
	getAvailableSlots,
	bookAppointment,
	getPatientAppointments,
};
