const express = require('express');
const router = express.Router();
const {
  getDoctorAppointments,
  submitPostVisitNotes,
} = require('../controllers/doctorController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole(['DOCTOR']));

router.get('/appointments', getDoctorAppointments);
router.post('/appointments/:appointmentId/post-visit', submitPostVisitNotes);

module.exports = router;
