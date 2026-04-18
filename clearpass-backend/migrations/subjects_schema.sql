-- Subject Management Module
-- Run this against the clearpass database

USE clearpass;

-- Drop in dependency order so FK constraints don't block
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS subject_mappings;
DROP TABLE IF EXISTS subjects;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE subjects (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  subject_code  VARCHAR(20)   NOT NULL UNIQUE,
  name          VARCHAR(200)  NOT NULL,
  credits       TINYINT       NOT NULL DEFAULT 3,
  department    VARCHAR(100)  NULL,
  description   TEXT          NULL,
  is_elective   TINYINT(1)    NOT NULL DEFAULT 0,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  created_by    INT           NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_subject_creator FOREIGN KEY (created_by) REFERENCES super_admins(id) ON DELETE SET NULL
);

CREATE TABLE subject_mappings (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  subject_id  INT       NOT NULL,
  year        TINYINT   NOT NULL COMMENT '1-4',
  semester    TINYINT   NOT NULL COMMENT '1 or 2 within the year',
  sort_order  INT       NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sm_subject  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT uq_subject_slot UNIQUE (subject_id, year, semester)
);

-- Note: idx_subjects_code is omitted — the UNIQUE constraint already creates that index
CREATE INDEX idx_subjects_dept       ON subjects(department);
CREATE INDEX idx_subjects_active     ON subjects(is_active);
CREATE INDEX idx_sm_year_semester    ON subject_mappings(year, semester);
CREATE INDEX idx_sm_subject_id       ON subject_mappings(subject_id);
