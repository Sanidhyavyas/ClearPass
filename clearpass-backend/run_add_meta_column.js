/**
 * run_add_meta_column.js
 * Adds the missing `meta` JSONB column to the notifications table.
 * Safe to run multiple times (uses IF NOT EXISTS equivalent).
 * Usage: node run_add_meta_column.js
 */
require("dotenv").config();
const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Neon PostgreSQL");

  try {
    await client.query(`
      ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS meta JSONB
    `);
    console.log("✓ notifications.meta column added (or already exists)");
  } catch (err) {
    console.error("✗ Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
