-- IMPORTANT:
-- Select your InfinityFree database before importing this file.
-- This version DROPS the old project tables first because the project schema changed.
-- Do not import this into a database containing real patient data.

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS doctor_slots;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS patients;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE patients (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    age TINYINT UNSIGNED NOT NULL,
    gender VARCHAR(20) NOT NULL,
    address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admins (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(60) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE doctors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    specialty VARCHAR(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE doctor_slots (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNSIGNED NOT NULL,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    is_available TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_slots_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_doctor_slot (doctor_id, slot_date, slot_time),
    INDEX idx_slot_lookup (doctor_id, slot_date, is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE appointments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    patient_id INT UNSIGNED NOT NULL,
    doctor_id INT UNSIGNED NOT NULL,
    slot_id INT UNSIGNED NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT fk_appointment_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    CONSTRAINT fk_appointment_slot FOREIGN KEY (slot_id) REFERENCES doctor_slots(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_appointment_slot (slot_id),
    INDEX idx_patient_appointments (patient_id),
    INDEX idx_appointment_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Demo admin account:
-- Username: admin
-- Password: admin123
-- Change this password before using the system beyond a classroom demo.
INSERT INTO admins (username, password_hash, name)
VALUES ('admin', '$2y$12$PyMAlkEyRsKH1qc3a3ij5eoHP8ISujjLekq40RO3nazVxUUsxfZ26', 'System Administrator');

INSERT INTO doctors (name, specialty)
VALUES
('Dr. Ayesha Rahman', 'Medicine'),
('Dr. Tanvir Hasan', 'Cardiology'),
('Dr. Sadia Islam', 'Dermatology');

-- Create 8 appointment times for each doctor for the next 7 days.
INSERT INTO doctor_slots (doctor_id, slot_date, slot_time)
SELECT d.id, DATE_ADD(CURDATE(), INTERVAL days.n DAY), times.slot_time
FROM doctors d
CROSS JOIN (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
) days
CROSS JOIN (
    SELECT '09:00:00' AS slot_time UNION ALL SELECT '09:30:00'
    UNION ALL SELECT '10:00:00' UNION ALL SELECT '10:30:00'
    UNION ALL SELECT '11:00:00' UNION ALL SELECT '11:30:00'
    UNION ALL SELECT '14:00:00' UNION ALL SELECT '14:30:00'
) times;
