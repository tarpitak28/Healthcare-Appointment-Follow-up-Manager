const prisma = require('../config/db');
const { generatePreVisitSummary } = require('../services/llmService');
const { sendEmail } = require('../utils/emailService');
const { generateIcsFile } = require('../utils/icsGenerator');
const { createCalendarEvent, deleteCalendarEvent } = require('../services/calendarService');
const { createAndSendNotification } = require('../services/notificationService');

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
		const doctorId = req.params.doctorId || req.params.doctorProfileId;
		const { date } = req.query; // YYYY-MM-DD

		if (!date) {
			return res.status(400).json({ success: false, message: 'Date is required' });
		}

		const startOfDay = new Date(`${date}T00:00:00.000Z`);
		const endOfDay = new Date(`${date}T23:59:59.999Z`);

		// Check if doctor is on leave on this date
		const leave = await prisma.doctorLeave.findFirst({
			where: {
				doctorProfileId: doctorId,
				startDate: { lte: endOfDay },
				endDate: { gte: startOfDay },
			},
		});

		if (leave) {
			return res.status(200).json({
				success: true,
				isOnLeave: true,
				message: 'Doctor is on leave on this date.',
				slots: [],
			});
		}

		// 1. Fetch doctor profile
		const doctorProfile = await prisma.doctorProfile.findUnique({
			where: { id: doctorId },
		});

		if (!doctorProfile) {
			return res.status(404).json({ success: false, message: 'Doctor profile not found' });
		}

		// 2. Generate all potential slots based on working hours and slot duration
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

		// 3. Fetch already booked appointments for this doctor on this date
		const bookedAppointments = await prisma.appointment.findMany({
			where: {
				doctorProfileId: doctorId,
				appointmentDate: {
					gte: startOfDay,
					lte: endOfDay,
				},
				status: { in: ['BOOKED', 'COMPLETED'] },
			},
			select: { startTime: true },
		});

		// 4. Fetch active non-expired slot holds for this doctor on this date
		const activeHolds = await prisma.slotHold.findMany({
			where: {
				doctorProfileId: doctorId,
				appointmentDate: {
					gte: startOfDay,
					lte: endOfDay,
				},
				expiresAt: { gte: new Date() },
			},
			select: { startTime: true, patientId: true },
		});

		const currentUserId = req.user ? req.user.id : null;
		const bookedTimes = new Set(bookedAppointments.map((app) => app.startTime));

		// A slot held by ANOTHER patient is unavailable. Held by current user is available for booking.
		const heldByOthers = new Set(
			activeHolds
				.filter((h) => h.patientId !== currentUserId)
				.map((h) => h.startTime)
		);

		// 5. Filter out booked and held slots
		const availableSlots = allSlots.map((slot) => ({
			...slot,
			isAvailable: !bookedTimes.has(slot.startTime) && !heldByOthers.has(slot.startTime),
			isHeldByMe: activeHolds.some((h) => h.startTime === slot.startTime && h.patientId === currentUserId),
		}));

		res.status(200).json({ success: true, date, slots: availableSlots });
	} catch (error) {
		console.error('Get slots error:', error);
		res.status(500).json({ success: false, message: 'Server error fetching slots' });
	}
}

// Book an appointment with server-side slot validation
async function bookAppointment(req, res) {
	try {
		const {
			doctorProfileId,
			appointmentDate,
			startTime,
			endTime,
			symptoms,
		} = req.body;

		const patientId = req.user.id;

		// --------------------------------------------------
		// 1. Basic validation
		// --------------------------------------------------
		if (
			!doctorProfileId ||
			!appointmentDate ||
			!startTime ||
			!endTime ||
			!symptoms ||
			!symptoms.trim()
		) {
			return res.status(400).json({
				success: false,
				message:
					'Please provide doctor, appointment date, time, and symptoms.',
			});
		}

		// --------------------------------------------------
		// 2. Validate appointment date format
		// Expected: YYYY-MM-DD
		// --------------------------------------------------
		if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
			return res.status(400).json({
				success: false,
				message: 'Appointment date must be in YYYY-MM-DD format.',
			});
		}

		// Prevent JavaScript from silently accepting invalid dates
		const [year, month, day] = appointmentDate.split('-').map(Number);
		const targetDate = new Date(year, month - 1, day);

		if (
			targetDate.getFullYear() !== year ||
			targetDate.getMonth() !== month - 1 ||
			targetDate.getDate() !== day
		) {
			return res.status(400).json({
				success: false,
				message: 'Invalid appointment date.',
			});
		}

		// --------------------------------------------------
		// 3. Prevent booking appointments in the past
		// --------------------------------------------------
		const today = new Date();
		const todayStart = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate()
		);

		if (targetDate < todayStart) {
			return res.status(400).json({
				success: false,
				message: 'Appointments cannot be booked for a past date.',
			});
		}

		// --------------------------------------------------
		// 4. Validate time format
		// Expected: HH:mm
		// --------------------------------------------------
		const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

		if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
			return res.status(400).json({
				success: false,
				message: 'Invalid appointment time format.',
			});
		}

		const timeToMinutes = (time) => {
			const [hours, minutes] = time.split(':').map(Number);
			return hours * 60 + minutes;
		};

		const requestedStartMinutes = timeToMinutes(startTime);
		const requestedEndMinutes = timeToMinutes(endTime);

		if (requestedEndMinutes <= requestedStartMinutes) {
			return res.status(400).json({
				success: false,
				message: 'Appointment end time must be after start time.',
			});
		}

		// --------------------------------------------------
		// 5. Fetch doctor profile
		// --------------------------------------------------
		const doctorProfile = await prisma.doctorProfile.findUnique({
			where: {
				id: doctorProfileId,
			},
			include: {
				user: true,
			},
		});

		if (!doctorProfile) {
			return res.status(404).json({
				success: false,
				message: 'Doctor profile not found.',
			});
		}

		// --------------------------------------------------
		// 6. Validate doctor's working hours
		// --------------------------------------------------
		const workingHours = doctorProfile.workingHours || {
			start: '09:00',
			end: '17:00',
		};

		if (!workingHours.start || !workingHours.end) {
			return res.status(500).json({
				success: false,
				message: 'Doctor working hours are not configured correctly.',
			});
		}

		const workingStartMinutes = timeToMinutes(workingHours.start);
		const workingEndMinutes = timeToMinutes(workingHours.end);

		const slotDuration = doctorProfile.slotDuration || 30;

		if (requestedStartMinutes < workingStartMinutes) {
			return res.status(400).json({
				success: false,
				message: 'Selected time is outside the doctor working hours.',
			});
		}

		if (requestedEndMinutes > workingEndMinutes) {
			return res.status(400).json({
				success: false,
				message: 'Selected time is outside the doctor working hours.',
			});
		}

		// --------------------------------------------------
		// 7. Validate slot duration
		// --------------------------------------------------
		if (
			requestedEndMinutes - requestedStartMinutes !==
			slotDuration
		) {
			return res.status(400).json({
				success: false,
				message: `Appointment duration must be ${slotDuration} minutes.`,
			});
		}

		// --------------------------------------------------
		// 8. Validate that start time aligns with slot grid
		// --------------------------------------------------
		const minutesFromWorkingStart =
			requestedStartMinutes - workingStartMinutes;

		if (
			minutesFromWorkingStart < 0 ||
			minutesFromWorkingStart % slotDuration !== 0
		) {
			return res.status(400).json({
				success: false,
				message: 'Selected time is not a valid appointment slot.',
			});
		}

		// --------------------------------------------------
		// 9. Check doctor leave
		// --------------------------------------------------
		const startOfDay = new Date(`${appointmentDate}T00:00:00.000Z`);
		const endOfDay = new Date(`${appointmentDate}T23:59:59.999Z`);

		const leave = await prisma.doctorLeave.findFirst({
			where: {
				doctorProfileId,
				startDate: {
					lte: endOfDay,
				},
				endDate: {
					gte: startOfDay,
				},
			},
		});

		if (leave) {
			return res.status(400).json({
				success: false,
				message: 'Doctor is on leave on the selected date.',
			});
		}

		// --------------------------------------------------
		// 10. Same-day past-time validation
		// --------------------------------------------------
		if (
			targetDate.getTime() === todayStart.getTime()
		) {
			const currentMinutes =
				today.getHours() * 60 + today.getMinutes();

			if (requestedStartMinutes <= currentMinutes) {
				return res.status(400).json({
					success: false,
					message: 'This appointment time has already passed.',
				});
			}
		}

		// --------------------------------------------------
		// 11. Check existing BOOKED appointment
		// --------------------------------------------------
		const existingBooking = await prisma.appointment.findFirst({
			where: {
				doctorProfileId,
				appointmentDate: startOfDay,
				startTime,
				status: 'BOOKED',
			},
		});

		if (existingBooking) {
			return res.status(409).json({
				success: false,
				message:
					'This time slot is already booked. Please choose another slot.',
			});
		}

		// --------------------------------------------------
		// 12. Generate AI pre-visit summary
		// --------------------------------------------------
		const preVisitAI = await generatePreVisitSummary(
			symptoms.trim()
		);

		// --------------------------------------------------
		// 13. Create appointment
		// Database constraint provides final duplicate protection
		// --------------------------------------------------
		const appointment = await prisma.$transaction(async (tx) => {
			const newAppointment = await tx.appointment.create({
				data: {
					patientId,
					doctorProfileId,
					appointmentDate: startOfDay,
					startTime,
					endTime,
					status: 'BOOKED',
					symptoms: symptoms.trim(),
					urgencyLevel: preVisitAI.urgencyLevel,
					chiefComplaint: preVisitAI.chiefComplaint,
					suggestedQuestions:
						preVisitAI.suggestedQuestions,
				},
				include: {
					doctorProfile: {
						include: {
							user: true,
						},
					},
					patient: true,
				},
			});

			return newAppointment;
		});

		// Create Google Calendar event
		try {
			const calendarEventId = await createCalendarEvent(patientId, {
				appointmentDate: appointment.appointmentDate,
				startTime: appointment.startTime,
				endTime: appointment.endTime,
				doctorName: appointment.doctorProfile?.user?.name,
				patientName: appointment.patient?.name,
				chiefComplaint: appointment.chiefComplaint,
			});

			if (calendarEventId) {
				await prisma.appointment.update({
					where: { id: appointment.id },
					data: { calendarEventId },
				});

				appointment.calendarEventId = calendarEventId;
			}
		} catch (calendarError) {
			console.error('Google Calendar event creation failed:', calendarError);
		}

		// --------------------------------------------------
		// 14. Send confirmation email
		// Email failure must not cancel the appointment
		// --------------------------------------------------
		try {
			const patientUser = await prisma.user.findUnique({
				where: {
					id: patientId,
				},
			});

			const doctorUser = doctorProfile.user;

			const icsContent = generateIcsFile({
				title: `Consultation with Dr. ${
					doctorUser?.name || 'Doctor'
				}`,
				description: `Symptoms: ${symptoms.trim()}`,
				startTime,
				endTime,
				date: new Date(`${appointmentDate}T00:00:00.000Z`),
			});

			// 1. Dispatch Notification to Patient
			if (patientUser?.email) {
				await createAndSendNotification({
					recipientUserId: patientId,
					type: 'BOOKING_CONFIRMATION',
					appointmentId: appointment.id,
					subject: 'Appointment Confirmation & Calendar Invite — HealthPulse',
					bodyText: `Your appointment with Dr. ${doctorUser?.name || 'Doctor'} is confirmed for ${appointmentDate} from ${startTime} to ${endTime}.`,
					eventKey: `${appointment.id}:PATIENT_BOOKING_CONFIRMATION`,
					attachments: icsContent,
				});
			}

			// 2. Dispatch Notification to Doctor
			if (doctorUser?.id) {
				await createAndSendNotification({
					recipientUserId: doctorUser.id,
					type: 'BOOKING_CONFIRMATION',
					appointmentId: appointment.id,
					subject: 'New Patient Appointment Booked — HealthPulse',
					bodyText: `New consultation booked by ${patientUser?.name || 'Patient'} for ${appointmentDate} from ${startTime} to ${endTime}. Chief Complaint: ${preVisitAI.chiefComplaint || 'General'}`,
					eventKey: `${appointment.id}:DOCTOR_BOOKING_CONFIRMATION`,
				});
			}
		} catch (emailErr) {
			console.error(
				'Email trigger failed:',
				emailErr.message
			);
		}

		// Clean up active slot hold
		try {
			await prisma.slotHold.deleteMany({
				where: {
					doctorProfileId,
					patientId,
					appointmentDate: startOfDay,
					startTime,
				},
			});
		} catch (holdErr) {
			// Silent cleanup
		}

		return res.status(201).json({
			success: true,
			message: 'Appointment booked successfully',
			appointment,
		});
	} catch (error) {
		console.error('Booking error:', error);

		// Prisma unique constraint violation or Postgres 23505
		if (error.code === 'P2002' || (error.message && (error.message.includes('23505') || error.message.includes('unique_active_doctor_slot')))) {
			return res.status(409).json({
				success: false,
				message:
					'This time slot is already booked. Please choose another slot.',
			});
		}

		return res.status(500).json({
			success: false,
			message: 'Server error during appointment booking.',
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

// Cancel a patient's own appointment
async function cancelAppointment(req, res) {
	try {
		const { appointmentId } = req.params;
		const patientId = req.user.id;

		const appointment = await prisma.appointment.findUnique({
			where: { id: appointmentId },
			include: {
				patient: true,
				doctorProfile: {
					include: { user: true },
				},
			},
		});

		if (!appointment || appointment.patientId !== patientId) {
			return res.status(404).json({
				success: false,
				message: 'Appointment not found or unauthorized',
			});
		}

		if (appointment.status !== 'BOOKED') {
			return res.status(400).json({
				success: false,
				message: 'Only booked appointments can be cancelled',
			});
		}

		await prisma.appointment.update({
			where: { id: appointmentId },
			data: { status: 'CANCELLED' },
		});

		// Delete Google Calendar event
		if (appointment.calendarEventId) {
			await deleteCalendarEvent(
				patientId,
				appointment.calendarEventId
			);
		}

		// 1. Send cancellation email to Patient
		await createAndSendNotification({
			recipientUserId: patientId,
			type: 'APPOINTMENT_CANCELLATION',
			appointmentId: appointment.id,
			subject: 'Appointment Cancelled Notice — HealthPulse',
			bodyText: `Your appointment with Dr. ${appointment.doctorProfile?.user?.name || 'Doctor'} on ${new Date(
				appointment.appointmentDate
			).toLocaleDateString()} at ${appointment.startTime} has been cancelled.`,
			eventKey: `${appointment.id}:PATIENT_CANCELLATION`,
		});

		// 2. Send cancellation email to Doctor
		if (appointment.doctorProfile?.user?.id) {
			await createAndSendNotification({
				recipientUserId: appointment.doctorProfile.user.id,
				type: 'APPOINTMENT_CANCELLATION',
				appointmentId: appointment.id,
				subject: 'Appointment Cancelled Notice — HealthPulse',
				bodyText: `The appointment with ${appointment.patient?.name || 'Patient'} on ${new Date(
					appointment.appointmentDate
				).toLocaleDateString()} at ${appointment.startTime} has been cancelled.`,
				eventKey: `${appointment.id}:DOCTOR_CANCELLATION`,
			});
		}

		res.json({
			success: true,
			message: 'Appointment cancelled successfully',
		});
	} catch (error) {
		console.error('Cancel appointment error:', error);

		res.status(500).json({
			success: false,
			message: 'Server error cancelling appointment',
		});
	}
}

// Hold/reserve a slot for 5 minutes
async function holdSlot(req, res) {
	try {
		const doctorProfileId = req.params.doctorId || req.params.id;
		const { appointmentDate, startTime } = req.body;
		const patientId = req.user.id;

		if (!doctorProfileId || !appointmentDate || !startTime) {
			return res.status(400).json({
				success: false,
				message: 'Doctor, appointment date, and start time are required.',
			});
		}

		const startOfDay = new Date(`${appointmentDate}T00:00:00.000Z`);
		const endOfDay = new Date(`${appointmentDate}T23:59:59.999Z`);

		// Check doctor leave
		const leave = await prisma.doctorLeave.findFirst({
			where: {
				doctorProfileId,
				startDate: { lte: endOfDay },
				endDate: { gte: startOfDay },
			},
		});

		if (leave) {
			return res.status(400).json({
				success: false,
				message: 'Doctor is on leave on the selected date.',
			});
		}

		// Check existing BOOKED/COMPLETED appointment
		const existingBooking = await prisma.appointment.findFirst({
			where: {
				doctorProfileId,
				appointmentDate: startOfDay,
				startTime,
				status: { in: ['BOOKED', 'COMPLETED'] },
			},
		});

		if (existingBooking) {
			return res.status(409).json({
				success: false,
				message: 'This time slot is already booked. Please choose another slot.',
			});
		}

		// Check if held by another patient
		const existingHold = await prisma.slotHold.findFirst({
			where: {
				doctorProfileId,
				appointmentDate: startOfDay,
				startTime,
				expiresAt: { gte: new Date() },
			},
		});

		if (existingHold && existingHold.patientId !== patientId) {
			return res.status(409).json({
				success: false,
				message: 'This slot is currently held by another patient. Please select another slot.',
			});
		}

		const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

		const slotHold = await prisma.slotHold.upsert({
			where: {
				doctorProfileId_appointmentDate_startTime: {
					doctorProfileId,
					appointmentDate: startOfDay,
					startTime,
				},
			},
			update: {
				patientId,
				expiresAt,
			},
			create: {
				doctorProfileId,
				patientId,
				appointmentDate: startOfDay,
				startTime,
				expiresAt,
			},
		});

		res.status(201).json({
			success: true,
			message: 'Slot held successfully for 5 minutes',
			slotHold,
		});
	} catch (error) {
		console.error('Hold slot error:', error);
		res.status(500).json({ success: false, message: 'Server error holding slot' });
	}
}

module.exports = {
	searchDoctors,
	getAvailableSlots,
	bookAppointment,
	getPatientAppointments,
	cancelAppointment,
	holdSlot,
};
