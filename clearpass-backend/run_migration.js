/**
 * run_migration.js — apply students_teachers_setup migration
 * Usage: node run_migration.js
 */
require("dotenv").config();
const mysql = require("mysql2/promise");

async function run() {
  const pw = (process.env.DB_PASSWORD || "").replace(/^"|"$/g, "");
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: pw,
    database: process.env.DB_NAME || "clearpass",
  });

  console.log("Connected to DB:", process.env.DB_NAME);

  // 1. Check and drop clearance_status from users
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='clearance_status'`
  );
  if (cols.length > 0) {
    await conn.query("ALTER TABLE users DROP COLUMN clearance_status");
    console.log("FIXED: dropped clearance_status from users");
  } else {
    console.log("OK: clearance_status not present in users (clean)");
  }

  // 2. Create students table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      student_code VARCHAR(20) UNIQUE NOT NULL,
      tgc INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log("DONE: students table ready");

  // 3. Create teachers table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      department_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_teachers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log("DONE: teachers table ready");

  // 4. Verify final users columns
  const [userCols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users'`
  );
  console.log("users columns:", userCols.map((r) => r.COLUMN_NAME).join(", "));

  // 5. Verify new tables exist
  const [tables] = await conn.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('students','teachers')`
  );
  console.log("New tables:", tables.map((r) => r.TABLE_NAME).join(", "));

  await conn.end();
  console.log("\nMigration complete.");
}

run().catch((e) => {
  console.error("MIGRATION ERROR:", e.message);
  process.exit(1);
});
