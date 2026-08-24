const prisma = require('../config/db');
const { generatePostVisitSummary } = require('../services/llmService');
const { sendEmail } = require('../utils/emailService');
const { deleteCalendarEvent } = require('../services/calendarService');
const { createAndSendNotification } = require('../services/notificationService');

// Get doctor's appointments
async function getDoctorAppointments(req, res) {
	try {
		const userId = req.user.id;

		// Get doctor profile id
		const doctorProfile = await prisma.doctorProfile.findUnique({
			where: { userId },
		});

		if (!doctorProfile) {
			return res.status(404).json({ success: false, message: 'Doctor profile not found for this user' });
		}

		const appointments = await prisma.appointment.findMany({
			where: { doctorProfileId: doctorProfile.id },
			include: {
				patient: {
					select: { id: true, name: true, email: true },
				},
			},
			orderBy: { appointmentDate: 'asc' },
		});

		res.status(200).json({ success: true, appointments });
	} catch (error) {
		console.error('Fetch doctor appointments error:', error);
		res.status(500).json({ success: false, message: 'Server error fetching appointments' });
	}
}

// Submit post-visit notes, prescription, and generate AI post-visit summary
async function submitPostVisitNotes(req, res) {
	try {
		const { appointmentId } = req.params;
		const { clinicalNotes, prescription } = req.body; // prescription: object or array of meds
		const userId = req.user.id;

		if (!clinicalNotes) {
			return res.status(400).json({ success: false, message: 'Clinical notes are required' });
		}

		const doctorProfile = await prisma.doctorProfile.findUnique({
			where: { userId },
		});

		if (!doctorProfile) {
			return res.status(404).json({ success: false, message: 'Doctor profile not found' });
		}

		// Verify appointment belongs to this doctor
		const appointment = await prisma.appointment.findUnique({
			where: { id: appointmentId },
		});

		if (!appointment || appointment.doctorProfileId !== doctorProfile.id) {
			return res.status(404).json({ success: false, message: 'Appointment not found or unauthorized' });
		}

		// Generate AI Post-Visit Summary with zero-hallucination guardrail
		const summaryData = await generatePostVisitSummary(clinicalNotes, prescription);
		const needsHumanReview = typeof summaryData === 'object' && summaryData !== null ? Boolean(summaryData.needsHumanReview) : false;
		const reviewReasons = typeof summaryData === 'object' && summaryData !== null ? (summaryData.reviewReasons || []) : [];

		// Update appointment
		const updatedAppointment = await prisma.appointment.update({
			where: { id: appointmentId },
			data: {
				clinicalNotes,
				prescription: prescription || {},
				postVisitSummary: typeof summaryData === 'string' ? summaryData : JSON.stringify(summaryData),
				needsHumanReview,
				reviewReasons,
				status: 'COMPLETED',
			},
			include: {
				patient: { select: { id: true, name: true, email: true } },
			},
		});

		// Dispatch post-visit notification via NotificationService (failure does not break completion)
		try {
			await createAndSendNotification({
				recipientUserId: appointment.patientId,
				type: 'POST_VISIT_SUMMARY',
				appointmentId: appointment.id,
				subject: 'Your Post-Visit Summary is Ready',
				bodyText: `Dr. ${doctorProfile.user?.name || 'your doctor'} has completed your consultation. Please sign in to your patient portal to review your post-visit summary and prescription details.`,
				eventKey: `${appointment.id}:POST_VISIT_SUMMARY`,
			});
		} catch (notifErr) {
			// Soft failure
		}

		res.status(200).json({
			success: true,
			message: 'Post-visit notes submitted and summary generated successfully',
			appointment: updatedAppointment,
		});
	} catch (error) {
		console.error('Submit post-visit error:', error);
		res.status(500).json({ success: false, message: 'Server error submitting post-visit notes' });
	}
}

// Doctor approves a flagged post-visit summary
async function approvePostVisitSummary(req, res) {
	try {
		const { appointmentId } = req.params;
		const userId = req.user.id;

		const doctorProfile = await prisma.doctorProfile.findUnique({
			where: { userId },
		});

		if (!doctorProfile) {
			return res.status(404).json({ success: false, message: 'Doctor profile not found' });
		}

		const appointment = await prisma.appointment.findUnique({
			where: { id: appointmentId },
		});

		if (!appointment || appointment.doctorProfileId !== doctorProfile.id) {
			return res.status(404).json({ success: false, message: 'Appointment not found or unauthorized' });
		}

		const updatedAppointment = await prisma.appointment.update({
			where: { id: appointmentId },
			data: {
				needsHumanReview: false,
			},
		});

		console.log(`[Audit] Doctor ${userId} approved flagged post-visit summary for appointment ${appointmentId} at ${new Date().toISOString()}`);

		res.status(200).json({
			success: true,
			message: 'Post-visit summary approved successfully',
			appointment: updatedAppointment,
		});
	} catch (error) {
		console.error('Approve post-visit summary error:', error);
		res.status(500).json({ success: false, message: 'Server error approving summary' });
	}
}

async function cancelDoctorAppointment(req, res) {
	try {
		const { appointmentId } = req.params;
		const userId = req.user.id;

		const doctorProfile = await prisma.doctorProfile.findUnique({
			where: { userId },
		});

		if (!doctorProfile) {
			return res.status(404).json({
				success: false,
				message: 'Doctor profile not found.',
			});
		}

		const appointment = await prisma.appointment.findUnique({
			where: { id: appointmentId },
			include: {
				patient: true,
			},
		});

		if (!appointment) {
			return res.status(404).json({
				success: false,
				message: 'Appointment not found.',
			});
		}

		if (appointment.doctorProfileId !== doctorProfile.id) {
			return res.status(403).json({
				success: false,
				message: 'You are not authorized to cancel this appointment.',
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
			data: { status: 'CANCELLED' },
		});

		// Delete Google Calendar event if one exists
		if (appointment.calendarEventId) {
			await deleteCalendarEvent(appointment.patientId, appointment.calendarEventId);
		}

		// Notify patient
		try {
			if (appointment.patient?.email) {
				await sendEmail({
					to: appointment.patient.email,
					subject: 'Appointment Cancelled by Doctor',
					text: `Your appointment scheduled for ${new Date(
						appointment.appointmentDate
					).toLocaleDateString()} at ${
						appointment.startTime
					} has been cancelled by the doctor.`,
				});
			}
		} catch (emailError) {
			console.error('Cancellation email failed:', emailError.message);
		}

		return res.status(200).json({
			success: true,
			message: 'Appointment cancelled successfully.',
		});
	} catch (error) {
		console.error('Doctor cancellation error:', error);

		return res.status(500).json({
			success: false,
			message: 'Server error cancelling appointment.',
		});
	}
}

module.exports = {
	getDoctorAppointments,
	submitPostVisitNotes,
	approvePostVisitSummary,
	cancelDoctorAppointment,
};
