-- 001_reconcile_schema.sql
-- Additive, idempotent schema reconciliation for ClearPass.
-- Safe to run more than once. No DROP, TRUNCATE, or DELETE statements.
-- Applied by migrations/run_pg_migrations.js inside a transaction.

-- ── Migration ledger ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  id         SERIAL PRIMARY KEY,
  filename   VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Refresh tokens ─────────────────────────────────────────────────────
-- Columns used by authController.issueRefreshToken / refreshToken.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(512) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
  ON refresh_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
  ON refresh_tokens (token);

-- ── Notification preferences ───────────────────────────────────────────
-- Columns used by notificationController.updatePreferences.
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id           INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_updates     BOOLEAN NOT NULL DEFAULT TRUE,
  request_approval  BOOLEAN NOT NULL DEFAULT TRUE,
  request_rejection BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_digest     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Clearance engine results ───────────────────────────────────────────
-- Columns used by clearanceEngine.persistEngineResult.
CREATE TABLE IF NOT EXISTS clearance_engine_results (
  id               SERIAL PRIMARY KEY,
  request_id       INT NOT NULL UNIQUE REFERENCES clearance_requests(id) ON DELETE CASCADE,
  student_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  eligible         BOOLEAN NOT NULL,
  auto_decision    VARCHAR(30) NOT NULL DEFAULT 'manual',
  blocking_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings         JSONB NOT NULL DEFAULT '[]'::jsonb,
  external_data    JSONB,
  evaluated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engine_results_student
  ON clearance_engine_results (student_id);

-- ── Clearance request audit/engine columns ─────────────────────────────
ALTER TABLE clearance_requests
  ADD COLUMN IF NOT EXISTS engine_approved BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE clearance_requests
  ADD COLUMN IF NOT EXISTS updated_by INT REFERENCES users(id) ON DELETE SET NULL;

-- ── Student attendance / library fields ────────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS attendance_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS has_library_dues BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Reconcile missing profile rows (no deletes) ────────────────────────
-- Create a students row for every student-role user that lacks one.
INSERT INTO students (user_id, student_code)
SELECT u.id, 'STU' || LPAD(u.id::text, 6, '0')
FROM users u
WHERE u.role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM students s WHERE s.user_id = u.id
  )
ON CONFLICT (student_code) DO NOTHING;

-- Create a teachers row for every teacher-role user that lacks one.
INSERT INTO teachers (user_id)
SELECT u.id
FROM users u
WHERE u.role = 'teacher'
  AND NOT EXISTS (
    SELECT 1 FROM teachers t WHERE t.user_id = u.id
  );

-- ── Record this migration ──────────────────────────────────────────────
INSERT INTO schema_migrations (filename)
VALUES ('001_reconcile_schema.sql')
ON CONFLICT (filename) DO NOTHING;
