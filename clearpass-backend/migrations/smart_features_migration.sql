-- migrations/smart_features_migration.sql
-- Run once against your Neon PostgreSQL instance.
-- Adds notifications, refresh_tokens, and clearance_engine_results tables.

-- ── 1. Notifications ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(80)  NOT NULL DEFAULT 'system',
  title      VARCHAR(200) NOT NULL,
  message    TEXT         NOT NULL,
  meta       JSONB,
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON notifications (created_at DESC);

-- ── 2. Refresh tokens ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(512) UNIQUE NOT NULL,
  expires_at TIMESTAMP    NOT NULL,
  revoked    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
  ON refresh_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
  ON refresh_tokens (token);

-- ── 3. Clearance engine results ─────────────────────────────────────────────
-- Stores auto-evaluation results from clearanceEngine.js
CREATE TABLE IF NOT EXISTS clearance_engine_results (
  id               SERIAL PRIMARY KEY,
  request_id       INT NOT NULL UNIQUE REFERENCES clearance_requests(id) ON DELETE CASCADE,
  student_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  eligible         BOOLEAN      NOT NULL,
  auto_decision    VARCHAR(30)  NOT NULL DEFAULT 'manual',  -- auto_approved | flagged | eligible
  blocking_reasons JSONB        NOT NULL DEFAULT '[]',
  warnings         JSONB        NOT NULL DEFAULT '[]',
  external_data    JSONB,
  evaluated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engine_results_student
  ON clearance_engine_results (student_id);

-- ── 4. Optional: engine_approved flag on clearance_requests ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='clearance_requests' AND column_name='engine_approved'
  ) THEN
    ALTER TABLE clearance_requests ADD COLUMN engine_approved BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
