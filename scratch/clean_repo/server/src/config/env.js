function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = [];

  // 1. Mandatory Core Variables
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required for Prisma database connection');
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback_secret') {
    if (isProduction) {
      errors.push('JWT_SECRET is required and must not use default fallback in production environment');
    }
  }

  // 2. Client & Server URL Configurations
  if (isProduction && !process.env.CLIENT_URL) {
    errors.push('CLIENT_URL is required for production CORS origin validation');
  }

  // 3. AI Service Configuration (Optional Warning)
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[Config Warning] GEMINI_API_KEY is unset. AI triaging and post-visit summaries will use fallback responses.');
  }

  // 4. SMTP Email Configuration (Optional Warning)
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    console.warn('[Config Warning] EMAIL_HOST/EMAIL_USER unset. Nodemailer will default to test transport.');
  }

  // 5. Google OAuth Configuration (Optional Warning)
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('[Config Warning] GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET unset. Google Calendar sync will use mock transport.');
  }

  if (errors.length > 0) {
    console.error('====================================================');
    console.error('FATAL ENVIRONMENT CONFIGURATION ERROR(S):');
    errors.forEach((err) => console.error(` - ${err}`));
    console.error('====================================================');
    throw new Error('Environment configuration validation failed');
  }

  console.log('[Config] Environment variables validated successfully.');
}

module.exports = { validateEnvironment };
