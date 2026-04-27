/**
 * run_fees_migration.js — Add fee approval columns to clearance_requests.
 * Usage: node run_fees_migration.js
 */
require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Neon PostgreSQL");

  const raw = fs.readFileSync(
    path.join(__dirname, "migrations", "fees_clearance_migration.sql"),
    "utf8"
  );

  const sql = raw.replace(/--[^\n]*/g, "");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await client.query(stmt);
      console.log("OK:", stmt.substring(0, 80));
    } catch (err) {
      console.error("FAILED:", stmt.substring(0, 80));
      console.error("  Error:", err.message);
    }
  }

  // Confirm columns exist
  const { rows } = await client.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'clearance_requests'
      AND column_name IN ('fee_status','fee_remarks','fee_approved_by','fee_approved_at')
    ORDER BY column_name
  `);
  console.log("\nFee columns in clearance_requests:", rows.map((r) => r.column_name).join(", "));

  await client.end();
  console.log("Migration complete.");
}

run().catch((err) => {
  console.error("Migration error:", err.message);
  process.exit(1);
});
