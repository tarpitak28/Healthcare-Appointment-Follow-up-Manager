const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../services/emailService');
const { createAndSendNotification } = require('../services/notificationService');

// Get all doctors and their profiles
async function getAllDoctors(req, res) {
	try {
		const doctors = await prisma.user.findMany({
			where: { role: 'DOCTOR' },
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

// Mark doctor on leave and cancel conflicting bookings across date range
async function markDoctorLeave(req, res) {
  try {
    const doctorId = req.params.doctorId || req.params.doctorProfileId;
    const { startDate, endDate, date, reason } = req.body;

    const startStr = startDate || date;
    const endStr = endDate || startDate || date;

    if (!startStr) {
      return res.status(400).json({ success: false, message: 'Start date is required' });
    }

    const startOfDay = new Date(`${startStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${endStr}T23:59:59.999Z`);

    if (endOfDay < startOfDay) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
    }

    // Create leave record using startDate and endDate matching schema
    const leave = await prisma.doctorLeave.create({
      data: {
        doctorProfileId: doctorId,
        startDate: startOfDay,
        endDate: endOfDay,
        reason: reason || 'Scheduled Leave',
      },
    });

    // Find and cancel conflicting appointments across the full leave range
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        doctorProfileId: doctorId,
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'BOOKED',
      },
    });

    const appointmentIds = conflictingAppointments.map(app => app.id);

    if (appointmentIds.length > 0) {
      await prisma.appointment.updateMany({
        where: { id: { in: appointmentIds } },
        data: { status: 'CANCELLED' },
      });

      for (const app of conflictingAppointments) {
        await createAndSendNotification({
          recipientUserId: app.patientId,
          type: 'DOCTOR_LEAVE_CANCELLATION',
          appointmentId: app.id,
          subject: 'Appointment Cancelled - Doctor on Leave',
          bodyText: `Your appointment on ${new Date(app.appointmentDate).toLocaleDateString()} has been cancelled because the doctor is scheduled on leave.`,
          eventKey: `${app.id}:DOCTOR_LEAVE_CANCELLATION`,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Leave marked successfully from ${startStr} to ${endStr}!`,
      affectedAppointmentsCount: appointmentIds.length,
      leave,
    });
  } catch (error) {
    console.error('Mark leave error:', error);
    res.status(500).json({ success: false, message: 'Server error marking leave' });
  }
}

// Get all appointments for admin
async function getAllAppointments(req, res) {
	try {
		const appointments = await prisma.appointment.findMany({
			include: {
				patient: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
				doctorProfile: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
					},
				},
			},
			orderBy: [
				{ appointmentDate: 'desc' },
				{ startTime: 'asc' },
			],
		});

		res.status(200).json({
			success: true,
			appointments,
		});
	} catch (error) {
		console.error('Fetch all appointments error:', error);

		res.status(500).json({
			success: false,
			message: 'Server error fetching appointments',
		});
	}
}

// Admin cancels any booked appointment
async function cancelAppointment(req, res) {
	try {
		const { appointmentId } = req.params;

		const appointment = await prisma.appointment.findUnique({
			where: { id: appointmentId },
			include: {
				patient: true,
				doctorProfile: {
					include: {
						user: true,
					},
				},
			},
		});

		if (!appointment) {
			return res.status(404).json({
				success: false,
				message: 'Appointment not found.',
			});
		}

		if (appointment.status !== 'BOOKED') {
			return res.status(400).json({
				success: false,
				message: 'Only booked appointments can be cancelled.',
			});
		}

		await prisma.appointment.update({
			where: { id: appointmentId },
			data: {
				status: 'CANCELLED',
			},
		});

		// Send cancellation email to patient
		try {
			if (appointment.patient?.email) {
				await sendEmail({
					to: appointment.patient.email,
					subject: 'Appointment Cancelled by Admin',
					text: `Your appointment with Dr. ${
						appointment.doctorProfile?.user?.name || 'Doctor'
					} scheduled for ${
						new Date(
							appointment.appointmentDate
						).toLocaleDateString()
					} at ${
						appointment.startTime
					} has been cancelled by the hospital administrator.`,
				});
			}
		} catch (emailError) {
			console.error(
				'Admin cancellation email failed:',
				emailError.message
			);
		}

		res.status(200).json({
			success: true,
			message: 'Appointment cancelled successfully.',
		});
	} catch (error) {
		console.error('Admin cancellation error:', error);

		res.status(500).json({
			success: false,
			message: 'Server error cancelling appointment',
		});
	}
}

module.exports = {
	getAllDoctors,
	createDoctor,
	markDoctorLeave,
	getAllAppointments,
	cancelAppointment,
};
