-- ================================================================
-- ClearPass Migration: qr_tokens + module_assignments
-- Run: node migrate.js  (safe to re-run)
-- ================================================================

USE clearpass;

-- ── qr_tokens: one row per issued clearance certificate ─────────
CREATE TABLE IF NOT EXISTS qr_tokens (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  token        VARCHAR(64)  NOT NULL UNIQUE,
  request_id   INT          NOT NULL,
  student_id   INT          NOT NULL,
  certificate_path VARCHAR(500) NULL,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_qr_request FOREIGN KEY (request_id) REFERENCES clearance_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_qr_student FOREIGN KEY (student_id) REFERENCES users(id)              ON DELETE CASCADE
);

-- ── module_assignments: which user handles each dept/module ─────
-- One row per module type (library, accounts, hostel, department)
CREATE TABLE IF NOT EXISTS module_assignments (
  module_name      ENUM('library','accounts','hostel','department') PRIMARY KEY,
  assigned_user_id INT  NULL,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ma_user FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed default rows so all 4 modules always appear
INSERT IGNORE INTO module_assignments (module_name) VALUES
  ('library'), ('accounts'), ('hostel'), ('department');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qr_token      ON qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_request_id ON qr_tokens(request_id);
