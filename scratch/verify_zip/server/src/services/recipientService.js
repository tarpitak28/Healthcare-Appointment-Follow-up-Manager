const prisma = require('../config/db');

/**
 * HealthPulse Recipient Resolver Service
 * Resolves audience cohorts (ALL_USERS, PATIENTS, DOCTORS, ADMINS) for targeted broadcast notifications.
 */

async function getPatients() {
  return prisma.user.findMany({
    where: {
      role: 'PATIENT',
      email: { not: null },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
}

async function getDoctors() {
  return prisma.user.findMany({
    where: {
      role: 'DOCTOR',
      email: { not: null },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      doctorProfile: {
        select: {
          specialisation: true,
        },
      },
    },
  });
}

async function getAdmins() {
  return prisma.user.findMany({
    where: {
      role: 'ADMIN',
      email: { not: null },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
}

async function getAllUsers() {
  return prisma.user.findMany({
    where: {
      email: { not: null },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
}

async function resolveAudience(audience) {
  switch ((audience || 'ALL_USERS').toUpperCase()) {
    case 'PATIENTS':
      return await getPatients();
    case 'DOCTORS':
      return await getDoctors();
    case 'ADMINS':
      return await getAdmins();
    case 'ALL_USERS':
    default:
      return await getAllUsers();
  }
}

module.exports = {
  getPatients,
  getDoctors,
  getAdmins,
  getAllUsers,
  resolveAudience,
};
