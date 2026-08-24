const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_ep2YoEDrJn6k@ep-late-sound-ay9cw748.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    await client.connect();
    console.log('Successfully connected to Neon PostgreSQL!');
    const res = await client.query('SELECT NOW()');
    console.log('Database time:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

test();
