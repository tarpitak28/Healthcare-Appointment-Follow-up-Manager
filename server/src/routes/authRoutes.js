const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getProfile,
  updateProfile,
  resetPassword,
  googleLogin,
  googleCallback
} = require('../controllers/authController');

const { verifyToken } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/reset-password', resetPassword);

router.get('/me', verifyToken, getProfile);
router.put('/me', verifyToken, updateProfile);

// NEW
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

module.exports = router;
