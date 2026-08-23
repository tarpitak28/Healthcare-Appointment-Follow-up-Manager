const prisma = require('../config/db');
const { generatePostVisitSummary } = require('../services/llmService');

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

		// Generate AI Post-Visit Summary
		const postVisitSummary = await generatePostVisitSummary(clinicalNotes);

		// Update appointment
		const updatedAppointment = await prisma.appointment.update({
			where: { id: appointmentId },
			data: {
				clinicalNotes,
				prescription: prescription || {},
				postVisitSummary,
				status: 'COMPLETED',
			},
			include: {
				patient: { select: { id: true, name: true, email: true } },
			},
		});

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

module.exports = {
	getDoctorAppointments,
	submitPostVisitNotes,
};
