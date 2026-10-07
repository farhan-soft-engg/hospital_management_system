

CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    age INT NOT NULL,
    gender ENUM('Male','Female','Other') NOT NULL,
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctor_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    slot_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    is_available TINYINT(1) DEFAULT 1,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_slot (doctor_id,slot_date,appointment_time)
);

CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_code VARCHAR(20) NOT NULL UNIQUE,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status ENUM('Confirmed','Cancelled') DEFAULT 'Confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

INSERT INTO patients(patient_code,name,phone,age,gender,address) VALUES
('P001','Rahim Ahmed','01700000001',28,'Male','Dhaka'),
('P002','Nusrat Jahan','01700000002',24,'Female','Dhaka');

INSERT INTO doctors(doctor_code,name,specialty) VALUES
('D001','Dr. Ayesha Rahman','Medicine'),
('D002','Dr. Tanvir Hasan','Cardiology'),
('D003','Dr. Sadia Islam','Dermatology');

INSERT INTO doctor_slots(doctor_id,slot_date,appointment_time,is_available)
SELECT d.id,CURDATE(),t.tm,1
FROM doctors d
CROSS JOIN (
  SELECT '09:00:00' tm UNION ALL SELECT '09:30:00' UNION ALL
  SELECT '10:00:00' UNION ALL SELECT '10:30:00' UNION ALL
  SELECT '11:00:00' UNION ALL SELECT '11:30:00' UNION ALL
  SELECT '12:00:00' UNION ALL SELECT '14:00:00' UNION ALL
  SELECT '14:30:00' UNION ALL SELECT '15:00:00' UNION ALL
  SELECT '15:30:00' UNION ALL SELECT '16:00:00'
) t;
