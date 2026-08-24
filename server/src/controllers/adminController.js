const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../services/emailService');

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

// Mark doctor on leave and cancel conflicting bookings for one date
async function markDoctorLeave(req, res) {
  try {
    const doctorId = req.params.doctorId || req.params.doctorProfileId;
    const { date, reason } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const leaveDate = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Create leave record using startDate and endDate matching schema
    const leave = await prisma.doctorLeave.create({
      data: {
        doctorProfileId: doctorId,
        startDate: leaveDate,
        endDate: endOfDay,
        reason: reason || 'Scheduled Leave',
      },
    });

    // Find and cancel conflicting appointments on this date
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        doctorProfileId: doctorId,
        appointmentDate: {
          gte: leaveDate,
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
        const patient = await prisma.user.findUnique({ where: { id: app.patientId } });
        if (patient) {
          await sendEmail({
            to: patient.email,
            subject: 'Appointment Cancelled - Doctor on Leave',
            text: `Your appointment on ${new Date(app.appointmentDate).toLocaleDateString()} has been cancelled because the doctor is on leave.`,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Leave marked successfully for ${date}!`,
      affectedAppointmentsCount: appointmentIds.length,
      leave,
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
