const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_ep2YoEDrJn6k@ep-late-sound-ay9cw748.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require'
    }
  }
});

async function test() {
  try {
    await prisma.$connect();
    console.log('Successfully connected via Prisma!');
    const users = await prisma.user.count();
    console.log('User count:', users);
  } catch (err) {
    console.error('Prisma connection error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
