const express = require('express');
const { google } = require('googleapis');
const router = express.Router();
const prisma = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

// Initialize the OAuth2 client
const defaultRedirectUri = process.env.NODE_ENV === 'production'
  ? 'https://careconect-api.onrender.com/api/calendar/auth/google/callback'
  : 'http://localhost:5000/api/calendar/auth/google/callback';

const redirectUri = process.env.GOOGLE_REDIRECT_URI || defaultRedirectUri;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

// 1. Route to generate the Google Login link
router.get('/auth-url', (req, res) => {
  const userId = req.query.userId || req.query.state || '';
  const returnPath = req.query.returnPath || '';

  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const dynamicRedirectUri = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/api/calendar/auth/google/callback`;

  const statePayload = JSON.stringify({ userId, returnPath, redirectUri: dynamicRedirectUri });

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    dynamicRedirectUri
  );

  const url = client.generateAuthUrl({
    access_type: 'offline', // Required to get a refresh token
    prompt: 'consent',      // Forces the consent screen every time
    scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
    state: Buffer.from(statePayload).toString('base64'),
  });
  res.json({ url });
});

// 2. Route to check Google Calendar Connection status for current user
router.get('/status', verifyToken, async (req, res) => {
  try {
    const tokenRecord = await prisma.googleToken.findUnique({
      where: { userId: req.user.id },
    });

    if (!tokenRecord) {
      return res.status(200).json({
        success: true,
        connected: false,
      });
    }

    res.status(200).json({
      success: true,
      connected: true,
      expiresAt: tokenRecord.expiresAt,
    });
  } catch (error) {
    console.error('Error fetching calendar status:', error);
    res.status(500).json({
      success: false,
      connected: false,
      message: 'Failed to fetch calendar status',
    });
  }
});

// 3. Route to disconnect Google Calendar for current user
router.post('/disconnect', verifyToken, async (req, res) => {
  try {
    await prisma.googleToken.deleteMany({
      where: { userId: req.user.id },
    });

    res.status(200).json({
      success: true,
      connected: false,
      message: 'Google Calendar disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Google Calendar',
    });
  }
});

// 4. Route to handle Google's callback after the user clicks "Allow"
router.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;

  try {
    let userId = '';
    let returnPath = '';
    let usedRedirectUri = '';

    if (state) {
      try {
        const decodedStr = Buffer.from(state, 'base64').toString('utf-8');
        const parsed = JSON.parse(decodedStr);
        userId = parsed.userId || '';
        returnPath = parsed.returnPath || '';
        usedRedirectUri = parsed.redirectUri || '';
      } catch (e) {
        userId = state;
      }
    }

    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const fallbackRedirectUri = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/api/calendar/auth/google/callback`;
    const targetRedirectUri = usedRedirectUri || fallbackRedirectUri;

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      targetRedirectUri
    );

    // Swap the code for actual tokens
    const { tokens } = await client.getToken(code);
    console.log('SUCCESS! Google Tokens Acquired for user:', userId);

    if (userId && userId.trim() !== '') {
      await prisma.googleToken.upsert({
        where: { userId },
        update: {
          accessToken: tokens.access_token,
          ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
          expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
        },
        create: {
          userId: userId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || 'offline_refresh_token',
          expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
        },
      });
    }

    const clientUrl = (process.env.CLIENT_URL || 'https://careconect-alpha.vercel.app').replace(/\/$/, '');
    const redirectTarget = returnPath ? `${clientUrl}${returnPath}` : clientUrl;
    const finalUrl = redirectTarget.includes('?') ? `${redirectTarget}&google=connected` : `${redirectTarget}?google=connected`;

    res.redirect(finalUrl);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error.message || error);
    const clientUrl = (process.env.CLIENT_URL || 'https://careconect-alpha.vercel.app').replace(/\/$/, '');
    res.redirect(`${clientUrl}?google=error`);
  }
});

module.exports = router;

