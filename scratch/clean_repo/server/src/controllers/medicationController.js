const prisma = require('../config/db');

// Create medication reminder
async function createMedicationReminder(req, res) {
	try {
		const patientId = req.user.id;

		const {
			appointmentId,
			medicineName,
			dosage,
			frequency,
			reminderTimes,
			startDate,
			endDate,
		} = req.body;

		if (
			!medicineName ||
			!frequency ||
			!reminderTimes ||
			!startDate ||
			!endDate
		) {
			return res.status(400).json({
				success: false,
				message: 'Medicine, frequency, reminder times, start date and end date are required',
			});
		}

		if (!Array.isArray(reminderTimes) || reminderTimes.length === 0) {
			return res.status(400).json({
				success: false,
				message: 'At least one reminder time is required',
			});
		}

		if (new Date(endDate) < new Date(startDate)) {
			return res.status(400).json({
				success: false,
				message: 'End date cannot be before start date',
			});
		}

		// If appointmentId is provided, verify that it belongs to this patient
		if (appointmentId) {
			const appointment = await prisma.appointment.findFirst({
				where: {
					id: appointmentId,
					patientId,
				},
			});

			if (!appointment) {
				return res.status(404).json({
					success: false,
					message: 'Appointment not found or unauthorized',
				});
			}
		}

		const reminder = await prisma.medicationReminder.create({
			data: {
				patientId,
				appointmentId: appointmentId || null,
				medicineName,
				dosage: dosage || null,
				frequency,
				reminderTimes,
				startDate: new Date(startDate),
				endDate: new Date(endDate),
				isActive: true,
			},
		});

		return res.status(201).json({
			success: true,
			message: 'Medication reminder created successfully',
			reminder,
		});
	} catch (error) {
		console.error('Create medication reminder error:', error);

		return res.status(500).json({
			success: false,
			message: error.message,
			error: error.toString(),
		});
	}
}

// Get patient's medication reminders
async function getMedicationReminders(req, res) {
	try {
		const patientId = req.user.id;

		const reminders = await prisma.medicationReminder.findMany({
			where: {
				patientId,
			},
			include: {
				appointment: {
					select: {
						id: true,
						appointmentDate: true,
						startTime: true,
						endTime: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		return res.status(200).json({
			success: true,
			reminders,
		});
	} catch (error) {
		console.error('Fetch medication reminders error:', error);

		return res.status(500).json({
			success: false,
			message: 'Server error fetching medication reminders',
		});
	}
}

// Enable / disable reminder
async function toggleMedicationReminder(req, res) {
	try {
		const { reminderId } = req.params;
		const patientId = req.user.id;

		const reminder = await prisma.medicationReminder.findFirst({
			where: {
				id: reminderId,
				patientId,
			},
		});

		if (!reminder) {
			return res.status(404).json({
				success: false,
				message: 'Medication reminder not found',
			});
		}

		const updatedReminder = await prisma.medicationReminder.update({
			where: {
				id: reminderId,
			},
			data: {
				isActive: !reminder.isActive,
			},
		});

		return res.status(200).json({
			success: true,
			message: updatedReminder.isActive
				? 'Medication reminder enabled'
				: 'Medication reminder disabled',
			reminder: updatedReminder,
		});
	} catch (error) {
		console.error('Toggle medication reminder error:', error);

		return res.status(500).json({
			success: false,
			message: 'Server error updating medication reminder',
		});
	}
}

// Delete medication reminder
async function deleteMedicationReminder(req, res) {
	try {
		const { reminderId } = req.params;
		const patientId = req.user.id;

		const reminder = await prisma.medicationReminder.findFirst({
			where: {
				id: reminderId,
				patientId,
			},
		});

		if (!reminder) {
			return res.status(404).json({
				success: false,
				message: 'Medication reminder not found',
			});
		}

		await prisma.medicationReminder.delete({
			where: {
				id: reminderId,
			},
		});

		return res.status(200).json({
			success: true,
			message: 'Medication reminder deleted successfully',
		});
	} catch (error) {
		console.error('Delete medication reminder error:', error);

		return res.status(500).json({
			success: false,
			message: 'Server error deleting medication reminder',
		});
	}
}

module.exports = {
	createMedicationReminder,
	getMedicationReminders,
	toggleMedicationReminder,
	deleteMedicationReminder,
};
