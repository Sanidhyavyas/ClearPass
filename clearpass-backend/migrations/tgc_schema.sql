-- ============================================================
-- TGC Migration — Term Grant Certificate tables
-- Run once against your Neon database.
-- ADDED: all tables below are new; only ALTER existing ones.
-- ============================================================

-- ── 1. Extend users table with student profile fields ───────
ALTER TABLE users ADD COLUMN IF NOT EXISTS enrollment_no  VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS division       VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile         VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_mobile  VARCHAR(20);

-- ── 2. Extend subjects table for TGC ────────────────────────
-- subject_type: TH/PR/MP/MDM/PBL/SCIL
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS subject_type  VARCHAR(10)
  CHECK (subject_type IN ('TH','PR','MP','MDM','PBL','SCIL'));
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS tgc_semester  INT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS tgc_year      VARCHAR(10);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_tgc        BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 3. Subject–Teacher Assignments ──────────────────────────
CREATE TABLE IF NOT EXISTS subject_teacher_assignments (
  id          SERIAL PRIMARY KEY,
  subject_id  INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id  INT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  assigned_by INT          REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (subject_id, teacher_id)
);

-- ── 4. Checklist Templates ───────────────────────────────────
CREATE TABLE IF NOT EXISTS checklist_templates (
  id          SERIAL PRIMARY KEY,
  subject_id  INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id  INT          REFERENCES users(id),
  item_name   VARCHAR(255) NOT NULL,
  item_type   VARCHAR(50)  CHECK (item_type IN (
    'Assignment','TA1','TA2','JA1','JA2',
    'Open Assessment','Repeat TA','Remedial Task',
    'Attendance','Exam','Custom'
  )),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── 5. Student Checklist Progress ───────────────────────────
CREATE TABLE IF NOT EXISTS student_checklist_progress (
  id                SERIAL PRIMARY KEY,
  student_id        INT NOT NULL REFERENCES users(id),
  checklist_item_id INT NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  subject_id        INT NOT NULL REFERENCES subjects(id),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','waived')),
  remarks           TEXT,
  verified_by       INT REFERENCES users(id),
  verified_at       TIMESTAMP,
  UNIQUE (student_id, checklist_item_id)
);

-- ── 6. Term Grant Certificates ──────────────────────────────
CREATE TABLE IF NOT EXISTS term_grant_certificates (
  id                   SERIAL PRIMARY KEY,
  student_id           INT NOT NULL REFERENCES users(id),
  semester             INT  NOT NULL DEFAULT 6,
  academic_year        VARCHAR(20) NOT NULL DEFAULT '2025-26',
  overall_status       VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (overall_status IN ('pending','approved','rejected')),
  fee_cleared          BOOLEAN NOT NULL DEFAULT FALSE,
  survey_completed     BOOLEAN NOT NULL DEFAULT FALSE,
  mentor_signed        BOOLEAN NOT NULL DEFAULT FALSE,
  amc_signed           BOOLEAN NOT NULL DEFAULT FALSE,
  class_teacher_signed BOOLEAN NOT NULL DEFAULT FALSE,
  generated_at         TIMESTAMP,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, semester, academic_year)
);

-- ── 7. Subject Approvals per Student ────────────────────────
CREATE TABLE IF NOT EXISTS subject_approvals (
  id                  SERIAL PRIMARY KEY,
  certificate_id      INT NOT NULL REFERENCES term_grant_certificates(id) ON DELETE CASCADE,
  student_id          INT NOT NULL REFERENCES users(id),
  subject_id          INT NOT NULL REFERENCES subjects(id),
  teacher_id          INT          REFERENCES users(id),
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  remarks             TEXT,
  mini_project_status VARCHAR(50)
    CHECK (mini_project_status IN (
      'Submitted','Under Review','Accepted',
      'Published','Not Accepted','In Revision','Not Written'
    )),
  approved_at         TIMESTAMP,
  UNIQUE (certificate_id, subject_id)
);

-- ── 8. Seed TY Semester 6 Subjects ──────────────────────────
INSERT INTO subjects
  (subject_code, name, credits, is_tgc, subject_type, tgc_semester, tgc_year, academic_year)
VALUES
  ('IOT-TH',    'Internet of Things',                             3, TRUE, 'TH',   6, 'TY', '2025-26'),
  ('IOT-PR',    'Internet of Things Lab',                         1, TRUE, 'PR',   6, 'TY', '2025-26'),
  ('CDMO-TH',   'Cloud Database Management and Operations',       3, TRUE, 'TH',   6, 'TY', '2025-26'),
  ('CDMO-PR',   'Cloud Database Management and Operations Lab',   1, TRUE, 'PR',   6, 'TY', '2025-26'),
  ('DEVOPS-TH', 'Fundamentals of Development and Operations',     3, TRUE, 'TH',   6, 'TY', '2025-26'),
  ('DEVOPS-PR', 'Fundamentals of Development and Operations Lab', 1, TRUE, 'PR',   6, 'TY', '2025-26'),
  ('SCIL-6',    'SCIL',                                           1, TRUE, 'SCIL', 6, 'TY', '2025-26'),
  ('PBL-6',     'PBL',                                            1, TRUE, 'PBL',  6, 'TY', '2025-26'),
  ('MDM-6',     'MDM - Digital Marketing',                        1, TRUE, 'MDM',  6, 'TY', '2025-26')
ON CONFLICT (subject_code) DO UPDATE
  SET is_tgc       = EXCLUDED.is_tgc,
      subject_type = EXCLUDED.subject_type,
      tgc_semester = EXCLUDED.tgc_semester,
      tgc_year     = EXCLUDED.tgc_year,
      academic_year= EXCLUDED.academic_year;
