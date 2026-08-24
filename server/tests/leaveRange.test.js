require('dotenv').config({ path: '.env' });
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const jwt = require('jsonwebtoken');

describe('Admin Doctor Leave Range & Cancellation Test Suite', () => {
  let adminToken;
  let doctorProfile;
  let patientUser;

  beforeAll(async () => {
    // Admin account
    const admin = await prisma.user.upsert({
      where: { email: 'leave_admin@example.com' },
      update: {},
      create: {
        name: 'Leave Admin',
        email: 'leave_admin@example.com',
        password: '$2a$10$abcdefghijklmnopqrstuu',
        role: 'ADMIN',
      },
    });
    adminToken = jwt.sign({ id: admin.id, role: 'ADMIN' }, process.env.JWT_SECRET || 'secret');

    // Doctor account
    const doctorUser = await prisma.user.upsert({
      where: { email: 'leave_doc@example.com' },
      update: {},
      create: {
        name: 'Leave Doctor',
        email: 'leave_doc@example.com',
        password: '$2a$10$abcdefghijklmnopqrstuu',
        role: 'DOCTOR',
      },
    });

    doctorProfile = await prisma.doctorProfile.upsert({
      where: { userId: doctorUser.id },
      update: {},
      create: {
        userId: doctorUser.id,
        specialisation: 'General Medicine',
        slotDuration: 30,
        workingHours: { start: '09:00', end: '17:00' },
      },
    });

    // Patient account
    patientUser = await prisma.user.upsert({
      where: { email: 'leave_patient@example.com' },
      update: {},
      create: {
        name: 'Leave Patient',
        email: 'leave_patient@example.com',
        password: '$2a$10$abcdefghijklmnopqrstuu',
        role: 'PATIENT',
      },
    });
  });

  beforeEach(async () => {
    if (doctorProfile?.id) {
      await prisma.appointment.deleteMany({ where: { doctorProfileId: doctorProfile.id } });
      await prisma.doctorLeave.deleteMany({ where: { doctorProfileId: doctorProfile.id } });
    }
  });

  test('Multi-Day Leave Range: Submitting leave from 2026-12-10 to 2026-12-12 auto-cancels booking on middle day 2026-12-11', async () => {
    const midDate = new Date('2026-12-11');

    // Create a booked appointment on the middle day of leave range
    const appt = await prisma.appointment.create({
      data: {
        doctorProfileId: doctorProfile.id,
        patientId: patientUser.id,
        appointmentDate: midDate,
        startTime: '10:00',
        endTime: '10:30',
        symptoms: 'Fever and headache',
        status: 'BOOKED',
      },
    });

    // Admin submits leave range covering 2026-12-10 to 2026-12-12
    const res = await request(app)
      .post(`/api/admin/doctors/${doctorProfile.id}/leave`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        startDate: '2026-12-10',
        endDate: '2026-12-12',
        reason: 'Medical Conference',
      });

    expect(res.status).toBe(200);

    // Verify appointment status updated to CANCELLED
    const updatedAppt = await prisma.appointment.findUnique({
      where: { id: appt.id },
    });

    expect(updatedAppt.status).toBe('CANCELLED');

    // Cleanup
    await prisma.appointment.delete({ where: { id: appt.id } });
    await prisma.doctorLeave.deleteMany({ where: { doctorProfileId: doctorProfile.id } });
  });

  test('Invalid Date Range: Submitting leave with endDate prior to startDate returns HTTP 400 Bad Request', async () => {
    const res = await request(app)
      .post(`/api/admin/doctors/${doctorProfile.id}/leave`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        startDate: '2026-12-15',
        endDate: '2026-12-10', // Invalid: end < start
        reason: 'Invalid Test',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/end date cannot be before start date/i);
  });
});
