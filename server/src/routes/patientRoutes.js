const express = require('express');
const router = express.Router();
const {
  searchDoctors,
  getAvailableSlots,
  bookAppointment,
  getPatientAppointments,
} = require('../controllers/patientController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole(['PATIENT']));

router.get('/doctors', searchDoctors);
router.get('/doctors/:doctorProfileId/slots', getAvailableSlots);
router.post('/appointments', bookAppointment);
router.get('/appointments', getPatientAppointments);

module.exports = router;
