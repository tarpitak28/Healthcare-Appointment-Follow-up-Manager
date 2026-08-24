const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function seed() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const patient = await prisma.user.upsert({
      where: { email: 'patient@example.com' },
      update: { password: hashedPassword, role: 'PATIENT' },
      create: {
        name: 'Demo Patient',
        email: 'patient@example.com',
        password: hashedPassword,
        role: 'PATIENT',
      },
    });

    const doctorUser = await prisma.user.upsert({
      where: { email: 'doctor@example.com' },
      update: { password: hashedPassword, role: 'DOCTOR' },
      create: {
        name: 'Dr. Sarah Jenkins',
        email: 'doctor@example.com',
        password: hashedPassword,
        role: 'DOCTOR',
      },
    });

    await prisma.doctorProfile.upsert({
      where: { userId: doctorUser.id },
      update: {
        specialisation: 'General Cardiology',
        slotDuration: 30,
        workingHours: { start: '09:00', end: '17:00' },
      },
      create: {
        userId: doctorUser.id,
        specialisation: 'General Cardiology',
        slotDuration: 30,
        workingHours: { start: '09:00', end: '17:00' },
      },
    });

    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: { password: hashedPassword, role: 'ADMIN' },
      create: {
        name: 'System Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log('🎉 SUCCESS: Neon database successfully seeded!');
    console.log('Patient:', patient.email);
    console.log('Doctor:', doctorUser.email);
    console.log('Admin:', admin.email);
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
