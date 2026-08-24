const { execSync } = require('child_process');
const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../../node_modules/@prisma/client'));

async function testCleanMigrationDeploy() {
  console.log('--- TESTING CLEAN DATABASE MIGRATION DEPLOY (ZERO DB PUSH) ---');
  const cleanDbUrl = 'postgresql://postgres:Tarpitak_28@localhost:5432/clean_healthcare_db?schema=public';

  try {
    console.log('[Prisma] Running `npx prisma migrate deploy` against clean database...');
    const deployOutput = execSync(`npx prisma migrate deploy`, {
      env: { ...process.env, DATABASE_URL: cleanDbUrl },
      cwd: 'e:\\Health_Appointment',
      encoding: 'utf-8',
    });
    console.log('[Prisma Migration Deploy Output]:\n', deployOutput);

    const cleanPrisma = new PrismaClient({
      datasources: { db: { url: cleanDbUrl } },
    });

    const tablesRes = await cleanPrisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const tables = tablesRes.map((r) => r.table_name);
    console.log('[Clean Database Tables]:', tables);

    const indexRes = await cleanPrisma.$queryRaw`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' AND indexname = 'unique_active_doctor_slot';
    `;
    console.log('[Clean Database Partial Index]:', indexRes);

    await cleanPrisma.$disconnect();

    const expectedTables = ['_prisma_migrations', 'Appointment', 'DoctorLeave', 'DoctorProfile', 'GoogleToken', 'MedicationReminder', 'NotificationLog', 'SlotHold', 'User'];
    const missingTables = expectedTables.filter((t) => !tables.includes(t));

    if (missingTables.length === 0 && indexRes.length > 0) {
      console.log('\nSUCCESS: Clean database migration deploy verified cleanly from zero!');
      process.exit(0);
    } else {
      console.error('\nFAILURE: Missing tables or partial index in clean migration deploy!', missingTables);
      process.exit(1);
    }
  } catch (err) {
    console.error('Clean migration test failed:', err);
    process.exit(1);
  }
}

testCleanMigrationDeploy();
