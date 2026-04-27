/**
 * run_tgc_migration.js — Apply TGC migration to Neon PostgreSQL.
 * Usage: node run_tgc_migration.js
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
    path.join(__dirname, "migrations", "tgc_schema.sql"),
    "utf8"
  );

  // Strip single-line comments, then split on semicolons
  const sql = raw.replace(/--[^\n]*/g, "");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let ok = 0;
  let failed = 0;

  for (const stmt of statements) {
    try {
      await client.query(stmt);
      const firstLine = stmt.split("\n")[0].substring(0, 80);
      console.log("OK:", firstLine);
      ok++;
    } catch (err) {
      console.error("FAILED:", stmt.substring(0, 80));
      console.error("  Error:", err.message);
      failed++;
    }
  }

  // List tables after migration
  const { rows } = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`
  );
  console.log(
    "\nTables in Neon DB:",
    rows.map((r) => r.table_name).join(", ")
  );

  await client.end();
  console.log(`\nMigration complete. OK: ${ok}, Failed: ${failed}`);
}

run().catch((err) => {
  console.error("Migration error:", err.message);
  process.exit(1);
});
