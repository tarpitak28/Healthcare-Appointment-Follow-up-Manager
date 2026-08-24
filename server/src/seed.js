const prisma = require('./config/db');
const bcrypt = require('bcryptjs');

async function seedRealUsers() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Real Patient Account
    const realPatient = await prisma.user.upsert({
      where: { email: 'ktarpita@gmail.com' },
      update: { password: hashedPassword, role: 'PATIENT', name: 'Tarpita K' },
      create: {
        name: 'Tarpita K',
        email: 'ktarpita@gmail.com',
        password: hashedPassword,
        role: 'PATIENT',
      },
    });

    // 2. Real Doctor Account (Dr. Pranjal Karan)
    const realDoctorUser = await prisma.user.upsert({
      where: { email: 'pranjalkaran2004@gmail.com' },
      update: { password: hashedPassword, role: 'DOCTOR', name: 'Dr. Pranjal Karan' },
      create: {
        name: 'Dr. Pranjal Karan',
        email: 'pranjalkaran2004@gmail.com',
        password: hashedPassword,
        role: 'DOCTOR',
      },
    });

    // Doctor Profile for Dr. Pranjal Karan
    await prisma.doctorProfile.upsert({
      where: { userId: realDoctorUser.id },
      update: {
        specialisation: 'General Cardiology',
        slotDuration: 30,
        workingHours: { start: '09:00', end: '17:00' },
      },
      create: {
        userId: realDoctorUser.id,
        specialisation: 'General Cardiology',
        slotDuration: 30,
        workingHours: { start: '09:00', end: '17:00' },
      },
    });

    // 3. Real Admin Account
    const realAdmin = await prisma.user.upsert({
      where: { email: 'admin@healthpulse.app' },
      update: { password: hashedPassword, role: 'ADMIN', name: 'HealthPulse Chief Admin' },
      create: {
        name: 'HealthPulse Chief Admin',
        email: 'admin@healthpulse.app',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    // 4. Demo Backup Patient
    await prisma.user.upsert({
      where: { email: 'patient@example.com' },
      update: { password: hashedPassword, role: 'PATIENT' },
      create: {
        name: 'Demo Patient',
        email: 'patient@example.com',
        password: hashedPassword,
        role: 'PATIENT',
      },
    });

    // 5. Demo Backup Doctor
    const demoDoctor = await prisma.user.upsert({
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
      where: { userId: demoDoctor.id },
      update: {
        specialisation: 'General Physician',
        slotDuration: 30,
        workingHours: { start: '09:00', end: '17:00' },
      },
      create: {
        userId: demoDoctor.id,
        specialisation: 'General Physician',
        slotDuration: 30,
        workingHours: { start: '09:00', end: '17:00' },
      },
    });

    console.log('SUCCESS: Real accounts and profiles seeded in database.');
    console.log('----------------------------------------------------');
    console.log('Real Patient:', realPatient.email);
    console.log('Real Doctor :', realDoctorUser.email);
    console.log('Real Admin  :', realAdmin.email);
    console.log('Password for all:', 'password123');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('Error seeding real users:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedRealUsers();
