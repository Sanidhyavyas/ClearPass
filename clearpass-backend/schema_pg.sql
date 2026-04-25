-- ============================================================
-- ClearPass PostgreSQL Schema (Neon-compatible)
-- Run once against your Neon database.
-- ============================================================

-- Drop in reverse-dependency order so foreign-key constraints don't block
DROP TABLE IF EXISTS qr_tokens              CASCADE;
DROP TABLE IF EXISTS request_documents      CASCADE;
DROP TABLE IF EXISTS clearance_audit_logs   CASCADE;
DROP TABLE IF EXISTS clearance_modules      CASCADE;
DROP TABLE IF EXISTS clearance_requests     CASCADE;
DROP TABLE IF EXISTS module_assignments     CASCADE;
DROP TABLE IF EXISTS students               CASCADE;
DROP TABLE IF EXISTS teachers               CASCADE;
DROP TABLE IF EXISTS enrollments            CASCADE;
DROP TABLE IF EXISTS student_subjects       CASCADE;
DROP TABLE IF EXISTS approvals              CASCADE;
DROP TABLE IF EXISTS grants                 CASCADE;
DROP TABLE IF EXISTS subject_mappings       CASCADE;
DROP TABLE IF EXISTS subjects               CASCADE;
DROP TABLE IF EXISTS audit_logs             CASCADE;
DROP TABLE IF EXISTS users                  CASCADE;
DROP TABLE IF EXISTS super_admins           CASCADE;

-- ── super_admins ────────────────────────────────────────────
CREATE TABLE super_admins (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── users ───────────────────────────────────────────────────
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100),
  email       VARCHAR(100) UNIQUE,
  password    VARCHAR(255),
  role        VARCHAR(20) NOT NULL CHECK (role IN ('student','teacher','admin')),
  department  VARCHAR(100),
  roll_number VARCHAR(50),
  semester    VARCHAR(20),
  year        INT
);

-- ── students ────────────────────────────────────────────────
CREATE TABLE students (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_code VARCHAR(20) NOT NULL UNIQUE,
  tgc          INT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── teachers ────────────────────────────────────────────────
CREATE TABLE teachers (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── module_assignments ──────────────────────────────────────
CREATE TABLE module_assignments (
  id               SERIAL PRIMARY KEY,
  module_name      VARCHAR(50) NOT NULL UNIQUE
                   CHECK (module_name IN ('library','accounts','hostel','department')),
  assigned_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── subjects ────────────────────────────────────────────────
CREATE TABLE subjects (
  id           SERIAL PRIMARY KEY,
  subject_code VARCHAR(20) NOT NULL UNIQUE,
  name         VARCHAR(200) NOT NULL,
  credits      SMALLINT NOT NULL DEFAULT 3,
  department   VARCHAR(100),
  description  TEXT,
  is_elective  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   INT REFERENCES super_admins(id) ON DELETE SET NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── subject_mappings ────────────────────────────────────────
CREATE TABLE subject_mappings (
  id         SERIAL PRIMARY KEY,
  subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  year       SMALLINT NOT NULL,
  semester   SMALLINT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (subject_id, year, semester)
);

-- ── approvals ───────────────────────────────────────────────
CREATE TABLE approvals (
  id           SERIAL PRIMARY KEY,
  student_id   INT REFERENCES users(id),
  subject_id   INT REFERENCES subjects(id),
  teacher_id   INT REFERENCES users(id),
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at  TIMESTAMP,
  reviewed_at  TIMESTAMP,
  remarks      TEXT
);

-- ── enrollments ─────────────────────────────────────────────
CREATE TABLE enrollments (
  id         SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(id),
  subject_id INT REFERENCES subjects(id)
);

-- ── grants ──────────────────────────────────────────────────
CREATE TABLE grants (
  id         SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(id),
  teacher_id INT REFERENCES users(id),
  status     VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── student_subjects ────────────────────────────────────────
CREATE TABLE student_subjects (
  id         SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(id),
  subject_id INT REFERENCES subjects(id)
);

-- ── audit_logs ──────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL,
  user_name   VARCHAR(100) NOT NULL,
  user_role   VARCHAR(50) NOT NULL,
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id   INT,
  details     TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── clearance_requests ──────────────────────────────────────
CREATE TABLE clearance_requests (
  id               SERIAL PRIMARY KEY,
  student_id       INT NOT NULL,
  teacher_id       INT,
  department       VARCHAR(100),
  status           VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  current_stage    VARCHAR(20) NOT NULL DEFAULT 'teacher'
                   CHECK (current_stage IN ('teacher','hod','admin','completed')),
  remarks          TEXT,
  submitted_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  semester         VARCHAR(20),
  year             INT,
  roll_number      VARCHAR(50),
  student_name     VARCHAR(150),
  rejection_reason TEXT,
  approved_at      TIMESTAMP,
  rejected_at      TIMESTAMP,
  documents        JSONB,
  is_overdue       BOOLEAN DEFAULT FALSE,
  deadline         DATE
);

-- ── clearance_audit_logs ────────────────────────────────────
CREATE TABLE clearance_audit_logs (
  id               SERIAL PRIMARY KEY,
  request_id       INT NOT NULL REFERENCES clearance_requests(id) ON DELETE CASCADE,
  action           VARCHAR(50) NOT NULL,
  performed_by     INT NOT NULL,
  performed_by_role VARCHAR(50),
  remarks          TEXT,
  timestamp        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── clearance_modules ───────────────────────────────────────
CREATE TABLE clearance_modules (
  id           SERIAL PRIMARY KEY,
  student_id   INT NOT NULL,
  module_name  VARCHAR(50) NOT NULL
               CHECK (module_name IN ('library','accounts','hostel','department')),
  status       VARCHAR(30) DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected','not_required')),
  remarks      TEXT,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by   INT,
  UNIQUE (student_id, module_name)
);

-- ── request_documents ───────────────────────────────────────
CREATE TABLE request_documents (
  id          SERIAL PRIMARY KEY,
  request_id  INT NOT NULL REFERENCES clearance_requests(id) ON DELETE CASCADE,
  student_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name   VARCHAR(255) NOT NULL,
  file_path   VARCHAR(500) NOT NULL,
  file_type   VARCHAR(100),
  file_size   INT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── qr_tokens ───────────────────────────────────────────────
CREATE TABLE qr_tokens (
  id               SERIAL PRIMARY KEY,
  student_id       INT REFERENCES users(id),
  token            VARCHAR(255) UNIQUE,
  request_id       INT UNIQUE,
  certificate_path VARCHAR(500),
  generated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_students_user_id          ON students(user_id);
CREATE INDEX idx_teachers_user_id          ON teachers(user_id);
CREATE INDEX idx_clearance_dept_sem_status ON clearance_requests(department, semester, status);
CREATE INDEX idx_clearance_overdue         ON clearance_requests(is_overdue, status, deadline);
CREATE INDEX idx_cr_stage                  ON clearance_requests(current_stage);
CREATE INDEX idx_clearance_modules_student ON clearance_modules(student_id);
CREATE INDEX idx_audit_logs_request        ON clearance_audit_logs(request_id);
CREATE INDEX idx_sm_year_semester          ON subject_mappings(year, semester);
CREATE INDEX idx_sm_subject_id             ON subject_mappings(subject_id);
CREATE INDEX idx_subjects_dept             ON subjects(department);
CREATE INDEX idx_subjects_active           ON subjects(is_active);
