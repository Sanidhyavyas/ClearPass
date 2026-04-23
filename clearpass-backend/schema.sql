CREATE DATABASE IF NOT EXISTS clearpass;
USE clearpass;

CREATE TABLE IF NOT EXISTS users (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  name         VARCHAR(100)  NOT NULL,
  email        VARCHAR(150)  NOT NULL UNIQUE,
  password     VARCHAR(255)  NOT NULL,
  role         ENUM('student','teacher','admin','super_admin') NOT NULL DEFAULT 'student',
  department   VARCHAR(100)  NULL,
  roll_number  VARCHAR(50)   NULL,
  created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clearance_requests (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  student_id      INT          NOT NULL,
  teacher_id      INT          NULL,
  status          ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  current_stage   ENUM('teacher','hod','admin','completed') NOT NULL DEFAULT 'teacher',
  remarks         TEXT         NULL,
  rejection_reason TEXT        NULL,
  semester        TINYINT      NULL,
  year            TINYINT      NULL,
  roll_number     VARCHAR(50)  NULL,
  student_name    VARCHAR(100) NULL,
  department      VARCHAR(100) NULL,
  documents       JSON         NULL,
  is_overdue      BOOLEAN      NOT NULL DEFAULT FALSE,
  deadline        DATETIME     NULL,
  submitted_at    DATETIME     NULL,
  approved_at     DATETIME     NULL,
  rejected_at     DATETIME     NULL,
  updated_at      DATETIME     NULL,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cr_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cr_teacher FOREIGN KEY (teacher_id)  REFERENCES users(id) ON DELETE SET NULL
);

-- Module-level clearance (Library, Accounts, Hostel, Department)
CREATE TABLE IF NOT EXISTS clearance_modules (
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
);

-- Per-request action history
CREATE TABLE IF NOT EXISTS clearance_audit_logs (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  request_id       INT          NOT NULL,
  action           VARCHAR(50)  NOT NULL,
  performed_by     INT          NULL,
  performed_by_role VARCHAR(50) NULL,
  remarks          TEXT         NULL,
  timestamp        DATETIME     DEFAULT NOW(),
  CONSTRAINT fk_cal_request FOREIGN KEY (request_id)   REFERENCES clearance_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_cal_user    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Document uploads
CREATE TABLE IF NOT EXISTS request_documents (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  request_id   INT          NOT NULL,
  student_id   INT          NOT NULL,
  file_name    VARCHAR(255) NOT NULL,
  file_path    VARCHAR(500) NOT NULL,
  file_type    VARCHAR(100) NULL,
  file_size    INT          NULL,
  uploaded_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rd_request FOREIGN KEY (request_id) REFERENCES clearance_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_rd_student FOREIGN KEY (student_id) REFERENCES users(id)              ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS super_admins (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ── Audit Logs (platform-wide) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     INT          NOT NULL,
  user_name   VARCHAR(100) NOT NULL,
  user_role   VARCHAR(50)  NOT NULL,
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50)  NULL,
  target_id   INT          NULL,
  details     TEXT         NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_role            ON users(role);
CREATE INDEX IF NOT EXISTS idx_cr_student_id         ON clearance_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_cr_teacher_id         ON clearance_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_cr_status             ON clearance_requests(status);
CREATE INDEX IF NOT EXISTS idx_cr_stage              ON clearance_requests(current_stage);
CREATE INDEX IF NOT EXISTS idx_cm_student            ON clearance_modules(student_id);
CREATE INDEX IF NOT EXISTS idx_cal_request           ON clearance_audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_rd_request            ON request_documents(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at      ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_super_admin_email     ON super_admins(email);
