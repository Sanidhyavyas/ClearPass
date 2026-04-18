CREATE DATABASE IF NOT EXISTS clearpass;
USE clearpass;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('student', 'teacher', 'admin') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clearance_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  assigned_teacher_id INT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clearance_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_clearance_teacher
    FOREIGN KEY (assigned_teacher_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_clearance_student_id ON clearance_requests(student_id);
CREATE INDEX idx_clearance_teacher_id ON clearance_requests(assigned_teacher_id);
CREATE INDEX idx_clearance_status ON clearance_requests(status);

CREATE TABLE IF NOT EXISTS super_admins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_super_admin_email ON super_admins(email);

-- ── Audit Logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  user_id    INT         NOT NULL,
  user_name  VARCHAR(100) NOT NULL,
  user_role  VARCHAR(50)  NOT NULL,
  action     VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NULL,
  target_id  INT          NULL,
  details    TEXT         NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
