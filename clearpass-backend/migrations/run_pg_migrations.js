#!/usr/bin/env node
/**
 * run_pg_migrations.js
 *
 * Applies unapplied numbered migrations (NNN_*.sql) from migrations/
 * in filename order. Each migration runs inside a transaction and is
 * recorded in schema_migrations. Existing migrations are skipped.
 * Legacy, unnumbered .sql files are intentionally ignored because some
 * of them contain MySQL-only syntax.
 *
 * Usage:
 *   node migrations/run_pg_migrations.js
 *
 * Requires DATABASE_URL in clearpass-backend/.env or the process environment.
 * This runner never prints the connection string.
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const MIGRATIONS_DIR = __dirname;

function redact(message) {
  const url = process.env.DATABASE_URL;
  if (!url) return message;
  return String(message).split(url).join("[REDACTED]");
}

async function ensureLedger(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{3}_.+\.sql$/.test(name))
    .sort();

  if (files.length === 0) {
    console.log("No migration files found.");
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  await client.connect();

  try {
    await ensureLedger(client);

    const { rows } = await client.query("SELECT filename FROM schema_migrations");
    const applied = new Set(rows.map((row) => row.filename));

    for (const filename of files) {
      if (applied.has(filename)) {
        console.log(`SKIP    ${filename}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO schema_migrations (filename)
           VALUES ($1)
           ON CONFLICT (filename) DO NOTHING`,
          [filename]
        );
        await client.query("COMMIT");
        console.log(`APPLIED ${filename}`);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw new Error(`${filename}: ${redact(error.message)}`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`MIGRATION FAILED: ${redact(error.message)}`);
  process.exitCode = 1;
});
