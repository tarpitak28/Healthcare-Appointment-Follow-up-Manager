const prisma = require('./config/db');
const bcrypt = require('bcryptjs');

async function seedDemoUsers() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Patient User
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

    // 2. Doctor User
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

    // Doctor Profile
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

    // 3. Admin User
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

    console.log('SUCCESS: Demo users seeded in database.');
    console.log('Patient:', patient.email);
    console.log('Doctor:', doctorUser.email);
    console.log('Admin:', admin.email);
  } catch (err) {
    console.error('Error seeding demo users:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedDemoUsers();
