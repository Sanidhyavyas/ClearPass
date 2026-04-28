require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await client.connect();
  const r1 = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('assignments','assignment_submissions','notifications') ORDER BY table_name");
  console.log('Tables:', r1.rows.map(r=>r.table_name));
  const r2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='term_grant_certificates' AND column_name='survey_completed'");
  console.log('survey_completed col still exists:', r2.rows.length > 0);
  await client.end();
})();
