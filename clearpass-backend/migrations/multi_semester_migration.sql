-- ============================================================
-- ClearPass: Multi-Semester Migration (PostgreSQL)
-- Upgrades schema from single (year=3, semester=6) to
-- full multi-year (1-4), multi-semester (1-8) support.
-- Run once against your existing clearpass database.
-- ============================================================

-- ── 1. Add year / semester to users (students only) ──────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS year     SMALLINT NULL CHECK (year     BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS semester SMALLINT NULL CHECK (semester BETWEEN 1 AND 8);

-- ── 2. Create teacher_semesters mapping table ─────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_semesters (
  id          SERIAL PRIMARY KEY,
  teacher_id  INT      NOT NULL,
  year        SMALLINT NOT NULL CHECK (year     BETWEEN 1 AND 4),
  semester    SMALLINT NOT NULL CHECK (semester BETWEEN 1 AND 8),
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE (teacher_id, year, semester),
  CONSTRAINT fk_ts_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── 3. Indexes for performant filtering ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_year_semester ON users(year, semester);
CREATE INDEX IF NOT EXISTS idx_cr_year_semester    ON clearance_requests(year, semester);
CREATE INDEX IF NOT EXISTS idx_ts_teacher_id       ON teacher_semesters(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ts_year_semester    ON teacher_semesters(year, semester);

-- ── 4. Migrate existing students → year=3, semester=6 ────────────────────
UPDATE users
SET year = 3, semester = 6
WHERE role = 'student'
  AND (year IS NULL OR semester IS NULL);

-- ── 5. Patch NULL year/semester in clearance_requests ────────────────────
-- year/semester columns already exist per schema.sql; fill any gaps.
UPDATE clearance_requests
SET year = 3, semester = 6
WHERE (year IS NULL OR semester IS NULL);

-- ── 6. Seed teacher_semesters for existing teachers ──────────────────────
-- Assigns every existing teacher to year=3 semester=6 by default.
-- Admins can reassign via the Teacher management panel.
INSERT INTO teacher_semesters (teacher_id, year, semester)
SELECT id, 3, 6 FROM users WHERE role = 'teacher'
ON CONFLICT (teacher_id, year, semester) DO NOTHING;

-- Done.
SELECT 'Multi-semester migration complete.' AS status;
