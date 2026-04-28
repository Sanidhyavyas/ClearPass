-- ============================================================
-- ClearPass Migration: Assignment System + Notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS assignments (
  id                SERIAL PRIMARY KEY,
  subject_id        INT          NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id        INT          NOT NULL REFERENCES users(id),
  title             VARCHAR(255) NOT NULL,
  description       TEXT,
  due_date          TIMESTAMP,
  checklist_item_id INT          REFERENCES checklist_templates(id) ON DELETE SET NULL,
  created_at        TIMESTAMP    DEFAULT NOW(),
  updated_at        TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id            SERIAL PRIMARY KEY,
  assignment_id INT          NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    INT          NOT NULL REFERENCES users(id),
  file_path     VARCHAR(500),
  file_name     VARCHAR(255),
  file_size     INT,
  status        VARCHAR(20)  NOT NULL DEFAULT 'submitted'
                  CHECK (status IN ('submitted', 'accepted', 'rejected')),
  remarks       TEXT,
  submitted_at  TIMESTAMP    DEFAULT NOW(),
  reviewed_at   TIMESTAMP,
  reviewed_by   INT          REFERENCES users(id),
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50)  NOT NULL,
  title       VARCHAR(255) NOT NULL,
  message     TEXT,
  related_id  INT,
  is_read     BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMP    DEFAULT NOW()
);

-- Drop survey_completed from TGC certificates (no longer used)
ALTER TABLE term_grant_certificates DROP COLUMN IF EXISTS survey_completed;

CREATE INDEX IF NOT EXISTS idx_assignments_subject    ON assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher    ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student    ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications(user_id);
