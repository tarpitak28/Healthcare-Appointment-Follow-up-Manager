const express = require('express');
const router = express.Router();
const {
  getDoctorAppointments,
  submitPostVisitNotes,
  cancelDoctorAppointment,
} = require('../controllers/doctorController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole(['DOCTOR']));

router.get('/appointments', getDoctorAppointments);
router.post('/appointments/:appointmentId/post-visit', submitPostVisitNotes);
router.post(
	'/appointments/:appointmentId/cancel',
	cancelDoctorAppointment
);

module.exports = router;
