CREATE TABLE IF NOT EXISTS super_admins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Replace the password hash below with a bcrypt hash for your chosen password.
-- Example email is only a placeholder seed.
INSERT INTO super_admins (name, email, password)
VALUES ('Primary Super Admin', 'superadmin@clearpass.com', '$2b$10$replace_with_bcrypt_hash')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  password = VALUES(password);
