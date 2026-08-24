const express = require('express');
const { google } = require('googleapis');
const router = express.Router();
const prisma = require('../config/db');

// Initialize the OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
);

// 1. Route to generate the Google Login link
router.get('/auth-url', (req, res) => {
  const userId = req.query.userId || req.query.state || '';
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required to get a refresh token
    prompt: 'consent',      // Forces the consent screen every time for testing
    scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
    state: userId,
  });
  res.json({ url });
});

// 2. Route to handle Google's callback after the user clicks "Allow"
router.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;

  try {
    // Swap the code for actual tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log('SUCCESS! Google Tokens Acquired:', tokens);

    if (state && tokens.refresh_token) {
      await prisma.googleToken.upsert({
        where: { userId: state },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
        },
        create: {
          userId: state,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
        },
      });
    }

    // Redirect the user back to the React frontend dashboard
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/patient?google=connected`);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/patient?google=error`);
  }
});

module.exports = router;
