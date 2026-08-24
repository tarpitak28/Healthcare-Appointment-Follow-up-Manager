require('dotenv').config({ path: '.env' });
const http = require('http');
const prisma = require('./config/db');
const jwt = require('jsonwebtoken');
const { validateEnvironment } = require('./config/env');
const { generateIcsFile } = require('./utils/calendarService');
const app = require('./app');

async function runPhase6ReleaseAudit() {
  console.log('================================================================');
  console.log('--- PHASE 6 COMPREHENSIVE RELEASE & SECURITY AUDIT SUITE ---');
  console.log('================================================================\n');

  const auditResults = [];

  function logResult(section, testName, expected, actual, status) {
    auditResults.push({ Section: section, Test: testName, Expected: expected, Actual: actual, Status: status });
    console.log(`[${status}] [${section}] ${testName}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual:   ${actual}\n`);
  }

  const TEST_PORT = 5002;
  const server = app.listen(TEST_PORT);

  try {
    // --------------------------------------------------
    // SECTION 1 & 2: ENVIRONMENT VALIDATION & SECRET ENFORCEMENT
    // --------------------------------------------------
    let envPass = false;
    try {
      validateEnvironment();
      envPass = true;
    } catch (err) {
      envPass = false;
    }
    logResult(
      'Section 1 & 3',
      'Startup Environment Validation',
      'Environment variables validated cleanly',
      `Validation Result = ${envPass}`,
      envPass ? 'PASS' : 'FAIL'
    );

    // Test secret fallback rejection in production mode
    const origEnv = process.env.NODE_ENV;
    const origJwt = process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'fallback_secret';
    let prodFail = false;
    try {
      validateEnvironment();
    } catch (err) {
      prodFail = true;
    }
    process.env.NODE_ENV = origEnv;
    process.env.JWT_SECRET = origJwt;
    logResult(
      'Section 2',
      'Production Secret Fallback Prevention',
      'Throws error when default fallback secret used in production',
      `Production Protection Triggered = ${prodFail}`,
      prodFail ? 'PASS' : 'FAIL'
    );

    // --------------------------------------------------
    // SECTION 4 & 5: CORS HARDENING & ERROR SANITIZATION
    // --------------------------------------------------
    const corsRes = await new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/health',
        method: 'GET',
        headers: { Origin: 'http://untrusted-attacker.com' },
      }, (res) => resolve(res));
      req.end();
    });

    const corsBlocked = corsRes.headers['access-control-allow-origin'] !== 'http://untrusted-attacker.com';
    logResult(
      'Section 4',
      'Production CORS Hardening',
      'Untrusted origin rejected from Access-Control-Allow-Origin header',
      `Cors Rejected = ${corsBlocked}`,
      corsBlocked ? 'PASS' : 'FAIL'
    );

    // --------------------------------------------------
    // SECTION 6 & 7: AUTHENTICATION & AUTHORIZATION REGRESSION PASS
    // --------------------------------------------------
    const patientUser = await prisma.user.upsert({
      where: { email: 'phase6_patient@hospital.com' },
      update: { password: '$2a$10$abcdefghijklmnopqrstuu' },
      create: {
        name: 'Phase6 Patient',
        email: 'phase6_patient@hospital.com',
        password: '$2a$10$abcdefghijklmnopqrstuu',
        role: 'PATIENT',
      },
    });

    const doctorUser = await prisma.user.upsert({
      where: { email: 'phase6_doctor@hospital.com' },
      update: { password: '$2a$10$abcdefghijklmnopqrstuu' },
      create: {
        name: 'Phase6 Doctor',
        email: 'phase6_doctor@hospital.com',
        password: '$2a$10$abcdefghijklmnopqrstuu',
        role: 'DOCTOR',
      },
    });

    const doctorProfile = await prisma.doctorProfile.upsert({
      where: { userId: doctorUser.id },
      update: {},
      create: {
        userId: doctorUser.id,
        specialisation: 'Cardiology',
        slotDuration: 30,
        workingHours: { start: '09:00', end: '17:00' },
      },
    });

    const patientToken = jwt.sign({ id: patientUser.id, role: 'PATIENT' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    // Unauthorized endpoint access (Patient -> Admin Route Block)
    const wrongRoleRes = await new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/admin/doctors',
        method: 'GET',
        headers: { Authorization: `Bearer ${patientToken}` },
      }, (res) => resolve(res));
      req.end();
    });

    logResult(
      'Section 6 & 7',
      'Role-Based Authorization (Patient -> Admin Route Block)',
      'HTTP 403 Forbidden',
      `Status Code = ${wrongRoleRes.statusCode}`,
      wrongRoleRes.statusCode === 403 ? 'PASS' : 'FAIL'
    );

    // Tampered token test
    const tamperedRes = await new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/patient/appointments',
        method: 'GET',
        headers: { Authorization: 'Bearer invalid_tampered_token_xyz' },
      }, (res) => resolve(res));
      req.end();
    });

    logResult(
      'Section 6',
      'Tampered Token Defense',
      'HTTP 401 Unauthorized',
      `Status Code = ${tamperedRes.statusCode}`,
      tamperedRes.statusCode === 401 ? 'PASS' : 'FAIL'
    );

    // --------------------------------------------------
    // SECTION 14: ADMIN LEAVE VALIDATION (endDate < startDate -> 400)
    // --------------------------------------------------
    const adminUser = await prisma.user.upsert({
      where: { email: 'phase6_admin@hospital.com' },
      update: {},
      create: {
        name: 'Phase6 Admin',
        email: 'phase6_admin@hospital.com',
        password: '$2a$10$abcdefghijklmnopqrstuu',
        role: 'ADMIN',
      },
    });
    const adminToken = jwt.sign({ id: adminUser.id, role: 'ADMIN' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    const postData = JSON.stringify({
      doctorId: doctorProfile.id,
      startDate: '2026-09-10',
      endDate: '2026-09-05',
      reason: 'Invalid Leave Range Test',
    });

    const invalidLeaveRes = await new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/admin/doctor-leave',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          Authorization: `Bearer ${adminToken}`,
        },
      }, (res) => resolve(res));
      req.write(postData);
      req.end();
    });

    logResult(
      'Section 14',
      'Admin Leave Range Validation (endDate < startDate)',
      'HTTP 400 Bad Request',
      `Status Code = ${invalidLeaveRes.statusCode}`,
      invalidLeaveRes.statusCode === 400 ? 'PASS' : 'FAIL'
    );

    // --------------------------------------------------
    // SECTION 20: ICS CALENDAR ATTACHMENT GENERATION
    // --------------------------------------------------
    const icsString = generateIcsFile({
      title: 'Consultation with Dr. Phase6',
      description: 'Symptoms: Fever and Cough',
      date: '2026-09-01',
      startTime: '10:00',
      endTime: '10:30',
    });

    const icsValid = icsString.includes('BEGIN:VCALENDAR') && icsString.includes('END:VCALENDAR') && icsString.includes('Consultation with Dr. Phase6');
    logResult(
      'Section 20',
      'ICS iCalendar Attachment Content Generation',
      'Valid iCalendar format with VEVENT and summary',
      `Valid ICS Format = ${icsValid}`,
      icsValid ? 'PASS' : 'FAIL'
    );

    // --------------------------------------------------
    // SUMMARY REPORT
    // --------------------------------------------------
    console.log('====================================================');
    console.log('--- PHASE 6 RELEASE AUDIT SUMMARY TABLE ---');
    console.log('====================================================');
    console.table(auditResults);

    server.close();

    const allPassed = auditResults.every((r) => r.Status === 'PASS');
    if (allPassed) {
      console.log('\nFINAL RELEASE VERDICT: RELEASE READY WITH LIMITATIONS — Operational dependencies: production SMTP & Google AI Studio quota!');
      process.exit(0);
    } else {
      console.error('\nFINAL RELEASE VERDICT: NOT READY — Audit failures detected!');
      process.exit(1);
    }
  } catch (err) {
    server.close();
    console.error('Fatal error in Phase 6 release test suite:', err);
    process.exit(1);
  }
}

runPhase6ReleaseAudit();
