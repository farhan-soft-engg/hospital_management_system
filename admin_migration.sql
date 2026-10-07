-- Use this migration if you ALREADY have the current patient-version database
-- and do NOT want to delete your existing patients, doctors, slots or appointments.
-- Select your InfinityFree database first, then import this file.

CREATE TABLE IF NOT EXISTS admins (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(60) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Demo admin account:
-- Username: admin
-- Password: admin123
INSERT INTO admins (username, password_hash, name)
SELECT 'admin', '$2y$12$0q0T8lNqm11h6R4H6TkHcOfdVDKXYfRZHIe7aYXwhbhChYCKOz1xW', 'System Administrator'
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE username = 'admin');

-- Future appointment requests are created as PENDING by api.php.
-- Existing appointments are left unchanged.
