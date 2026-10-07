-- Hospital Management System
-- Patient login/register + doctor availability + appointment booking.
-- IMPORTANT: Select the database created by your hosting provider before importing this file.
-- Do NOT run CREATE DATABASE or USE statements here.

CREATE TABLE IF NOT EXISTS patients (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    age TINYINT UNSIGNED NOT NULL,
    gender VARCHAR(20) NOT NULL,
    address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS doctors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    specialty VARCHAR(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS doctor_slots (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT UNSIGNED NOT NULL,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    is_available TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_slots_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_doctor_slot (doctor_id, slot_date, slot_time),
    INDEX idx_slot_lookup (doctor_id, slot_date, is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS appointments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    patient_id INT UNSIGNED NOT NULL,
    doctor_id INT UNSIGNED NOT NULL,
    slot_id INT UNSIGNED NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT fk_appointment_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    CONSTRAINT fk_appointment_slot FOREIGN KEY (slot_id) REFERENCES doctor_slots(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_appointment_slot (slot_id),
    INDEX idx_patient_appointments (patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO doctors (name, specialty)
SELECT 'Dr. Ayesha Rahman', 'Medicine'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Ayesha Rahman');

INSERT INTO doctors (name, specialty)
SELECT 'Dr. Tanvir Hasan', 'Cardiology'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Tanvir Hasan');

INSERT INTO doctors (name, specialty)
SELECT 'Dr. Sadia Islam', 'Dermatology'
WHERE NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Sadia Islam');

-- Create 8 appointment times for each doctor for the next 7 days.
-- Run this part again only if you need to regenerate missing slots.
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
) times
LEFT JOIN doctor_slots existing
    ON existing.doctor_id = d.id
    AND existing.slot_date = DATE_ADD(CURDATE(), INTERVAL days.n DAY)
    AND existing.slot_time = times.slot_time
WHERE existing.id IS NULL;
