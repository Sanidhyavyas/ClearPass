/**
 * run_pg_schema.js — Apply schema_pg.sql to Neon PostgreSQL database.
 * Usage: node run_pg_schema.js
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

  const raw = fs.readFileSync(path.join(__dirname, "schema_pg.sql"), "utf8");

  // Strip single-line comments, then split on semicolons
  const sql = raw.replace(/--[^\n]*/g, "");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await client.query(stmt);
      const firstLine = stmt.split("\n")[0].substring(0, 60);
      console.log("OK:", firstLine);
    } catch (err) {
      console.error("FAILED:", stmt.substring(0, 80));
      console.error("  Error:", err.message);
    }
  }

  // List created tables
  const { rows } = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`
  );
  console.log("\nTables in Neon DB:", rows.map((r) => r.table_name).join(", "));

  await client.end();
  console.log("\nSchema applied successfully.");
}

run().catch((err) => {
  console.error("Schema error:", err.message);
  process.exit(1);
});
