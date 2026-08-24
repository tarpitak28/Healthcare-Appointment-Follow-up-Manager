require('dotenv').config({ path: '.env' });
const { execSync } = require('child_process');
const path = require('path');
const prisma = require('../src/config/db');

describe('Database Migration History Integrity Test Suite', () => {
  test('Versioned migrations deploy cleanly and produce all 9 required tables and partial index', async () => {
    // 1. Verify applied migrations count
    const appliedMigrations = await prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL`;
    expect(appliedMigrations.length).toBeGreaterThanOrEqual(7);

    // 2. Verify existence of all 9 database tables
    const tableQueryResult = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `;

    const tableNames = tableQueryResult.map((row) => row.table_name);
    const expectedTables = [
      'User',
      'DoctorProfile',
      'Appointment',
      'DoctorLeave',
      'MedicationReminder',
      'SlotHold',
      'NotificationLog',
      'GoogleToken',
      '_prisma_migrations',
    ];

    expectedTables.forEach((table) => {
      expect(tableNames).toContain(table);
    });

    // 3. Verify PostgreSQL partial unique index unique_active_doctor_slot
    const indexQueryResult = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'Appointment' AND indexname = 'unique_active_doctor_slot';
    `;

    expect(indexQueryResult).toHaveLength(1);
    expect(indexQueryResult[0].indexdef).toMatch(/WHERE/i);
    expect(indexQueryResult[0].indexdef).toMatch(/BOOKED/i);
    expect(indexQueryResult[0].indexdef).toMatch(/COMPLETED/i);
  });
});
