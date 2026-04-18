-- ================================================================
-- ClearPass DB Migration: clearance_schema_update.sql
-- Compatible with MySQL 5.7+ and all MySQL 8.x versions
-- ================================================================

USE clearpass;

-- ── Helper procedure: add column only if it doesn't exist ────────
-- CONTINUE HANDLER means a failed ADD COLUMN (e.g. unsupported type,
-- duplicate) is silently skipped so the rest of the migration continues.
DROP PROCEDURE IF EXISTS _add_col;
DELIMITER $$
CREATE PROCEDURE _add_col(
  IN p_table VARCHAR(64),
  IN p_col   VARCHAR(64),
  IN p_def   TEXT
)
BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;  -- skip on any error
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = p_table
      AND COLUMN_NAME  = p_col
  ) THEN
    SET @_sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_def);
    PREPARE _stmt FROM @_sql;
    EXECUTE _stmt;
    DEALLOCATE PREPARE _stmt;
  END IF;
END$$
DELIMITER ;

-- ── 1. Extend users table ────────────────────────────────────────
CALL _add_col('users', 'department',  'VARCHAR(100) NULL');
CALL _add_col('users', 'roll_number', 'VARCHAR(50)  NULL');
CALL _add_col('users', 'semester',    'VARCHAR(20)  NULL');
CALL _add_col('users', 'year',        'INT          NULL');

-- ── 2. Extend clearance_requests ────────────────────────────────
CALL _add_col('clearance_requests', 'teacher_id',       'INT          NULL');
CALL _add_col('clearance_requests', 'department',       'VARCHAR(100) NULL');
CALL _add_col('clearance_requests', 'submitted_at',     'TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP');
CALL _add_col('clearance_requests', 'updated_at',       'TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL _add_col('clearance_requests', 'semester',         'VARCHAR(20)  NULL');
CALL _add_col('clearance_requests', 'year',             'INT          NULL');
CALL _add_col('clearance_requests', 'roll_number',      'VARCHAR(50)  NULL');
CALL _add_col('clearance_requests', 'student_name',     'VARCHAR(150) NULL');
CALL _add_col('clearance_requests', 'rejection_reason', 'TEXT         NULL');
CALL _add_col('clearance_requests', 'approved_at',      'TIMESTAMP    NULL');
CALL _add_col('clearance_requests', 'rejected_at',      'TIMESTAMP    NULL');
CALL _add_col('clearance_requests', 'documents',        "TEXT COMMENT 'JSON array of uploaded file URLs'");
CALL _add_col('clearance_requests', 'is_overdue',       'BOOLEAN      DEFAULT FALSE');
CALL _add_col('clearance_requests', 'deadline',         'DATE         NULL');

-- ── 3. Migrate old data to new columns ──────────────────────────
-- Disable safe update mode for bulk migrations (re-enabled at end of section)
SET SQL_SAFE_UPDATES = 0;

-- Copy assigned_teacher_id → teacher_id (if old column exists)
DROP PROCEDURE IF EXISTS _migrate_teacher_id;
DELIMITER $$
CREATE PROCEDURE _migrate_teacher_id()
BEGIN
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'clearance_requests'
      AND COLUMN_NAME  = 'assigned_teacher_id'
  ) THEN
    UPDATE clearance_requests
      SET teacher_id = assigned_teacher_id
      WHERE id > 0 AND assigned_teacher_id IS NOT NULL AND teacher_id IS NULL;
  END IF;
END$$
DELIMITER ;
CALL _migrate_teacher_id();
DROP PROCEDURE IF EXISTS _migrate_teacher_id;

-- Set submitted_at from created_at where NULL
DROP PROCEDURE IF EXISTS _migrate_submitted_at;
DELIMITER $$
CREATE PROCEDURE _migrate_submitted_at()
BEGIN
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'clearance_requests'
      AND COLUMN_NAME  = 'created_at'
  ) THEN
    UPDATE clearance_requests
      SET submitted_at = created_at
      WHERE id > 0 AND submitted_at IS NULL AND created_at IS NOT NULL;
  END IF;
END$$
DELIMITER ;
CALL _migrate_submitted_at();
DROP PROCEDURE IF EXISTS _migrate_submitted_at;

-- Backfill student_name, department, roll_number from users
UPDATE clearance_requests cr
  JOIN users u ON u.id = cr.student_id
  SET
    cr.student_name = COALESCE(cr.student_name, u.name),
    cr.department   = COALESCE(cr.department,   u.department),
    cr.roll_number  = COALESCE(cr.roll_number,  u.roll_number)
  WHERE cr.id > 0;

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;

-- ── 4. clearance_audit_logs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS clearance_audit_logs (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  request_id        INT NOT NULL,
  action            ENUM('approved','rejected','changes_requested','submitted','resubmitted') NOT NULL,
  performed_by      INT NOT NULL,
  performed_by_role VARCHAR(50),
  remarks           TEXT,
  timestamp         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES clearance_requests(id) ON DELETE CASCADE
);

-- ── 5. clearance_modules ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clearance_modules (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  student_id   INT NOT NULL,
  module_name  ENUM('library','accounts','hostel','department') NOT NULL,
  status       ENUM('pending','approved','rejected','not_required') DEFAULT 'pending',
  remarks      TEXT,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by   INT,
  UNIQUE KEY unique_student_module (student_id, module_name)
);

-- ── 6. Performance indexes (skip if already exist) ───────────────
DROP PROCEDURE IF EXISTS _add_index;
DELIMITER $$
CREATE PROCEDURE _add_index(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_cols  TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = p_table
      AND INDEX_NAME   = p_index
  ) THEN
    SET @_sql = CONCAT('CREATE INDEX `', p_index, '` ON `', p_table, '` (', p_cols, ')');
    PREPARE _stmt FROM @_sql;
    EXECUTE _stmt;
    DEALLOCATE PREPARE _stmt;
  END IF;
END$$
DELIMITER ;

CALL _add_index('clearance_requests', 'idx_clearance_dept_sem_status', 'department, semester, status');
CALL _add_index('clearance_requests', 'idx_clearance_overdue',         'is_overdue, status, deadline');
CALL _add_index('clearance_modules',  'idx_clearance_modules_student',  'student_id');
CALL _add_index('clearance_audit_logs', 'idx_audit_logs_request',       'request_id');

-- ── Cleanup helper procedures ────────────────────────────────────
DROP PROCEDURE IF EXISTS _add_col;
DROP PROCEDURE IF EXISTS _add_index;

SELECT 'Migration complete.' AS status;
