const express = require('express');
const router = express.Router();
const {
  searchDoctors,
  getAvailableSlots,
  bookAppointment,
  getPatientAppointments,
  cancelAppointment,
  holdSlot,
} = require('../controllers/patientController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole(['PATIENT']));

router.get('/doctors', searchDoctors);
router.get('/doctors/:doctorProfileId/slots', getAvailableSlots);
router.post('/doctors/:doctorProfileId/hold-slot', holdSlot);
router.post('/appointments', bookAppointment);
router.get('/appointments', getPatientAppointments);
router.delete('/appointments/:appointmentId', cancelAppointment);
router.post('/appointments/:appointmentId/cancel', cancelAppointment);
router.patch('/appointments/:appointmentId/cancel', cancelAppointment);
router.put('/appointments/:appointmentId/cancel', cancelAppointment);
router.delete('/appointments/:appointmentId/cancel', cancelAppointment);

module.exports = router;
