const express = require('express');
const router = express.Router();
const { getAllDoctors, createDoctor, markDoctorLeave } = require('../controllers/adminController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// All routes require ADMIN role
router.use(verifyToken, requireRole(['ADMIN']));

router.get('/doctors', getAllDoctors);
router.post('/doctors', createDoctor);
router.post('/doctors/:doctorProfileId/leave', markDoctorLeave);

module.exports = router;
