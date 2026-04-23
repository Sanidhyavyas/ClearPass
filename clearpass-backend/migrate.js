/**
 * migrate.js — Run this once to bring the live DB up to date with schema.sql additions.
 * Usage: node migrate.js
 */
require("dotenv").config();
const db = require("./db");

/** Add a column only if it doesn't already exist */
async function addColumnIfMissing(table, column, definition) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (row.cnt > 0) {
    console.log(`– (exists) ${table}.${column}`);
    return;
  }
  await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`✓ added ${table}.${column}`);
}

/** Create an index only if it doesn't already exist */
async function createIndexIfMissing(name, table, cols) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, name]
  );
  if (row.cnt > 0) {
    console.log(`– (exists) index ${name}`);
    return;
  }
  await db.query(`CREATE INDEX \`${name}\` ON \`${table}\` (${cols})`);
  console.log(`✓ index ${name}`);
}

async function run() {
  // ── users ────────────────────────────────────────────────────────
  await addColumnIfMissing("users", "department",  "VARCHAR(100) NULL AFTER role");
  await addColumnIfMissing("users", "roll_number", "VARCHAR(50)  NULL AFTER department");

  // ── clearance_requests ───────────────────────────────────────────
  await addColumnIfMissing("clearance_requests", "teacher_id",       "INT NULL AFTER student_id");
  await addColumnIfMissing("clearance_requests", "current_stage",    "ENUM('teacher','hod','admin','completed') NOT NULL DEFAULT 'teacher' AFTER status");
  await addColumnIfMissing("clearance_requests", "rejection_reason", "TEXT NULL AFTER remarks");
  await addColumnIfMissing("clearance_requests", "semester",         "TINYINT NULL AFTER rejection_reason");
  await addColumnIfMissing("clearance_requests", "year",             "TINYINT NULL AFTER semester");
  await addColumnIfMissing("clearance_requests", "roll_number",      "VARCHAR(50) NULL AFTER year");
  await addColumnIfMissing("clearance_requests", "student_name",     "VARCHAR(100) NULL AFTER roll_number");
  await addColumnIfMissing("clearance_requests", "department",       "VARCHAR(100) NULL AFTER student_name");
  await addColumnIfMissing("clearance_requests", "documents",        "JSON NULL AFTER department");
  await addColumnIfMissing("clearance_requests", "is_overdue",       "BOOLEAN NOT NULL DEFAULT FALSE AFTER documents");
  await addColumnIfMissing("clearance_requests", "deadline",         "DATETIME NULL AFTER is_overdue");
  await addColumnIfMissing("clearance_requests", "submitted_at",     "DATETIME NULL AFTER deadline");
  await addColumnIfMissing("clearance_requests", "approved_at",      "DATETIME NULL AFTER submitted_at");
  await addColumnIfMissing("clearance_requests", "rejected_at",      "DATETIME NULL AFTER approved_at");
  await addColumnIfMissing("clearance_requests", "updated_at",       "DATETIME NULL AFTER rejected_at");

  // ── new tables ───────────────────────────────────────────────────
  const tables = [
    [`CREATE TABLE IF NOT EXISTS clearance_modules (
       id           INT PRIMARY KEY AUTO_INCREMENT,
       student_id   INT          NOT NULL,
       request_id   INT          NULL,
       module_name  ENUM('library','accounts','hostel','department') NOT NULL,
       status       ENUM('pending','approved','rejected','not_required') NOT NULL DEFAULT 'pending',
       remarks      TEXT         NULL,
       reviewed_by  INT          NULL,
       last_updated DATETIME     NULL,
       UNIQUE KEY uq_module (student_id, module_name),
       CONSTRAINT fk_cm_student  FOREIGN KEY (student_id)  REFERENCES users(id) ON DELETE CASCADE,
       CONSTRAINT fk_cm_request  FOREIGN KEY (request_id)  REFERENCES clearance_requests(id) ON DELETE SET NULL,
       CONSTRAINT fk_cm_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
     )`, "clearance_modules"],

    [`CREATE TABLE IF NOT EXISTS clearance_audit_logs (
       id                INT PRIMARY KEY AUTO_INCREMENT,
       request_id        INT          NOT NULL,
       action            VARCHAR(50)  NOT NULL,
       performed_by      INT          NULL,
       performed_by_role VARCHAR(50)  NULL,
       remarks           TEXT         NULL,
       timestamp         DATETIME     DEFAULT NOW(),
       CONSTRAINT fk_cal_request FOREIGN KEY (request_id)   REFERENCES clearance_requests(id) ON DELETE CASCADE,
       CONSTRAINT fk_cal_user    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
     )`, "clearance_audit_logs"],

    [`CREATE TABLE IF NOT EXISTS request_documents (
       id          INT PRIMARY KEY AUTO_INCREMENT,
       request_id  INT          NOT NULL,
       student_id  INT          NOT NULL,
       file_name   VARCHAR(255) NOT NULL,
       file_path   VARCHAR(500) NOT NULL,
       file_type   VARCHAR(100) NULL,
       file_size   INT          NULL,
       uploaded_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
       CONSTRAINT fk_rd_req FOREIGN KEY (request_id) REFERENCES clearance_requests(id) ON DELETE CASCADE,
       CONSTRAINT fk_rd_stu FOREIGN KEY (student_id)  REFERENCES users(id)              ON DELETE CASCADE
     )`, "request_documents"],
  ];

  for (const [sql, name] of tables) {
    try {
      await db.query(sql);
      console.log(`✓ table ${name}`);
    } catch (err) {
      if (err.code === "ER_TABLE_EXISTS_ERROR") console.log(`– (exists) table ${name}`);
      else console.error(`✗ table ${name}:`, err.message);
    }
  }

  // ── indexes ──────────────────────────────────────────────────────
  await createIndexIfMissing("idx_cr_stage",   "clearance_requests",  "current_stage");
  await createIndexIfMissing("idx_cm_student", "clearance_modules",   "student_id");
  await createIndexIfMissing("idx_cal_request","clearance_audit_logs","request_id");
  await createIndexIfMissing("idx_rd_request", "request_documents",   "request_id");

  console.log("\nMigration complete.");
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });

