-- ================================================================
-- ClearPass Migration: students + teachers tables
-- Run: node migrate.js  (safe to re-run)
-- ================================================================

USE clearpass;

-- ── 1. Drop clearance_status from users if it exists ────────────
-- clearance status belongs in clearance_requests, never in users
DROP PROCEDURE IF EXISTS _drop_clearance_status;
DELIMITER $$
CREATE PROCEDURE _drop_clearance_status()
BEGIN
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'users'
      AND COLUMN_NAME  = 'clearance_status'
  ) THEN
    ALTER TABLE users DROP COLUMN clearance_status; -- FIXED: remove stray column
  END IF;
END$$
DELIMITER ;
CALL _drop_clearance_status();
DROP PROCEDURE IF EXISTS _drop_clearance_status;

-- ── 2. Create students table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT           NOT NULL,
  student_code  VARCHAR(20)   UNIQUE NOT NULL,
  tgc           INT           DEFAULT 0,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
); -- ADDED

-- ── 3. Create teachers table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT           NOT NULL,
  department_id INT           NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_teachers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
); -- ADDED

-- ── 4. Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_user_id    ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_code       ON students(student_code);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id    ON teachers(user_id);
