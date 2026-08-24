require('dotenv').config({ path: '.env' });
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const jwt = require('jsonwebtoken');

describe('Concurrency & Double-Booking Defense Test Suite', () => {
  let patientToken1;
  let patientToken2;
  let doctorProfile;
  const testDate = '2026-11-20';
  const testTime = '11:00';

  beforeAll(async () => {
    // 1. Create 2 test patients
    const patient1 = await prisma.user.upsert({
      where: { email: 'concurrency_p1@example.com' },
      update: {},
      create: {
        name: 'Concurrent Patient 1',
        email: 'concurrency_p1@example.com',
        password: '$2a$10$abcdefghijklmnopqrstuu',
        role: 'PATIENT',
      },
    });

    const patient2 = await prisma.user.upsert({
      where: { email: 'concurrency_p2@example.com' },
      update: {},
      create: {
        name: 'Concurrent Patient 2',
        email: 'concurrency_p2@example.com',
        password: '$2a$10$abcdefghijklmnopqrstuu',
        role: 'PATIENT',
      },
    });

    patientToken1 = jwt.sign({ id: patient1.id, role: 'PATIENT' }, process.env.JWT_SECRET || 'secret');
    patientToken2 = jwt.sign({ id: patient2.id, role: 'PATIENT' }, process.env.JWT_SECRET || 'secret');

    // 2. Create test doctor
    const doctorUser = await prisma.user.upsert({
      where: { email: 'concurrency_doc@example.com' },
      update: {},
      create: {
        name: 'Concurrent Doctor',
        email: 'concurrency_doc@example.com',
        password: '$2a$10$abcdefghijklmnopqrstuu',
        role: 'DOCTOR',
      },
    });

    doctorProfile = await prisma.doctorProfile.upsert({
      where: { userId: doctorUser.id },
      update: {},
      create: {
        userId: doctorUser.id,
        specialisation: 'Cardiology',
        slotDuration: 30,
        workingHours: { start: '09:00', end: '17:00' },
      },
    });

    // Clean up any existing appointments for this slot
    await prisma.appointment.deleteMany({
      where: {
        doctorProfileId: doctorProfile.id,
        appointmentDate: new Date(testDate),
        startTime: testTime,
      },
    });
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: {
        doctorProfileId: doctorProfile.id,
        appointmentDate: new Date(testDate),
        startTime: testTime,
      },
    });
  });

  test('Simultaneous booking requests for the exact same slot result in exactly one 201 Created and one 409 Conflict', async () => {
    const reqBody = {
      doctorProfileId: doctorProfile.id,
      appointmentDate: testDate,
      startTime: testTime,
      endTime: '11:30',
      symptoms: 'Chest pain and breathlessness during exercise',
    };

    // Execute 2 concurrent requests simultaneously via Promise.all
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/patient/appointments')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send(reqBody),
      request(app)
        .post('/api/patient/appointments')
        .set('Authorization', `Bearer ${patientToken2}`)
        .send(reqBody),
    ]);

    const statuses = [res1.status, res2.status].sort();

    // Verify HTTP Status Codes (One 201, One 409)
    expect(statuses).toEqual([201, 409]);

    // Verify PostgreSQL DB State (Exactly 1 appointment row persisted)
    const dbAppointments = await prisma.appointment.findMany({
      where: {
        doctorProfileId: doctorProfile.id,
        appointmentDate: new Date(testDate),
        startTime: testTime,
        status: 'BOOKED',
      },
    });

    expect(dbAppointments.length).toBe(1);
  });
});
