const express = require('express');

const router = express.Router();

const {
	createMedicationReminder,
	getMedicationReminders,
	toggleMedicationReminder,
	deleteMedicationReminder,
} = require('../controllers/medicationController');

const { verifyToken } = require('../middleware/authMiddleware');

router.post(
	'/',
	verifyToken,
	createMedicationReminder
);

router.get(
	'/',
	verifyToken,
	getMedicationReminders
);

router.patch(
	'/:reminderId/toggle',
	verifyToken,
	toggleMedicationReminder
);

router.delete(
	'/:reminderId',
	verifyToken,
	deleteMedicationReminder
);

module.exports = router;
