<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

// CHANGE ONLY THESE FOUR VALUES ON YOUR HOSTING SERVER.
$host = 'YOUR_MYSQL_HOST';
$db   = 'YOUR_DATABASE_NAME';
$user = 'YOUR_DATABASE_USER';
$pass = 'YOUR_DATABASE_PASSWORD';
$charset = 'utf8mb4';

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$db;charset=$charset",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed. Check api.php MySQL settings.']);
    exit;
}

function respond($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function require_patient() {
    if (empty($_SESSION['patient_id']) || !empty($_SESSION['admin_id'])) {
        respond(['success' => false, 'message' => 'Please login as a patient first.'], 401);
    }
    return (int) $_SESSION['patient_id'];
}

function require_admin() {
    if (empty($_SESSION['admin_id'])) {
        respond(['success' => false, 'message' => 'Please login as an admin first.'], 401);
    }
    return (int) $_SESSION['admin_id'];
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$input = array_merge($_GET, $_POST);

try {
    switch ($action) {
        case 'session':
            if (!empty($_SESSION['admin_id'])) {
                $stmt = $pdo->prepare('SELECT id, username, name FROM admins WHERE id = ?');
                $stmt->execute([$_SESSION['admin_id']]);
                $admin = $stmt->fetch();
                if (!$admin) {
                    unset($_SESSION['admin_id']);
                    respond(['success' => true, 'logged_in' => false]);
                }
                respond(['success' => true, 'logged_in' => true, 'role' => 'admin', 'admin' => $admin]);
            }

            if (empty($_SESSION['patient_id'])) {
                respond(['success' => true, 'logged_in' => false]);
            }

            $stmt = $pdo->prepare('SELECT id, name, phone, age, gender, address FROM patients WHERE id = ?');
            $stmt->execute([$_SESSION['patient_id']]);
            $patient = $stmt->fetch();
            if (!$patient) {
                unset($_SESSION['patient_id']);
                respond(['success' => true, 'logged_in' => false]);
            }
            respond(['success' => true, 'logged_in' => true, 'role' => 'patient', 'patient' => $patient]);
            break;

        case 'register':
            $name = trim($input['name'] ?? '');
            $phone = trim($input['phone'] ?? '');
            $password = (string) ($input['password'] ?? '');
            $age = (int) ($input['age'] ?? 0);
            $gender = trim($input['gender'] ?? '');
            $address = trim($input['address'] ?? '');

            if ($name === '' || $phone === '' || $password === '' || $age < 1 || $gender === '' || $address === '') {
                respond(['success' => false, 'message' => 'Please fill in all fields.'], 400);
            }
            if (strlen($password) < 6) {
                respond(['success' => false, 'message' => 'Password must be at least 6 characters.'], 400);
            }

            $check = $pdo->prepare('SELECT id FROM patients WHERE phone = ? LIMIT 1');
            $check->execute([$phone]);
            if ($check->fetch()) {
                respond(['success' => false, 'message' => 'An account with this phone number already exists. Please login.'], 409);
            }

            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('INSERT INTO patients (name, phone, password_hash, age, gender, address) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([$name, $phone, $hash, $age, $gender, $address]);
            $id = (int) $pdo->lastInsertId();

            session_regenerate_id(true);
            unset($_SESSION['admin_id']);
            $_SESSION['patient_id'] = $id;
            respond(['success' => true, 'patient' => [
                'id' => $id, 'name' => $name, 'phone' => $phone,
                'age' => $age, 'gender' => $gender, 'address' => $address
            ]]);
            break;

        case 'login':
            $phone = trim($input['phone'] ?? '');
            $password = (string) ($input['password'] ?? '');
            if ($phone === '' || $password === '') {
                respond(['success' => false, 'message' => 'Enter phone and password.'], 400);
            }

            $stmt = $pdo->prepare('SELECT id, name, phone, password_hash, age, gender, address FROM patients WHERE phone = ? LIMIT 1');
            $stmt->execute([$phone]);
            $patient = $stmt->fetch();

            if (!$patient || !password_verify($password, $patient['password_hash'])) {
                respond(['success' => false, 'message' => 'Invalid phone number or password.'], 401);
            }

            unset($patient['password_hash']);
            session_regenerate_id(true);
            unset($_SESSION['admin_id']);
            $_SESSION['patient_id'] = (int) $patient['id'];
            respond(['success' => true, 'patient' => $patient]);
            break;

        case 'admin_login':
            $username = trim($input['username'] ?? '');
            $password = (string) ($input['password'] ?? '');
            if ($username === '' || $password === '') {
                respond(['success' => false, 'message' => 'Enter admin username and password.'], 400);
            }

            $stmt = $pdo->prepare('SELECT id, username, name, password_hash FROM admins WHERE username = ? LIMIT 1');
            $stmt->execute([$username]);
            $admin = $stmt->fetch();

            if (!$admin || !password_verify($password, $admin['password_hash'])) {
                respond(['success' => false, 'message' => 'Invalid admin username or password.'], 401);
            }

            unset($admin['password_hash']);
            session_regenerate_id(true);
            unset($_SESSION['patient_id']);
            $_SESSION['admin_id'] = (int) $admin['id'];
            respond(['success' => true, 'admin' => $admin]);
            break;

        case 'logout':
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
            }
            session_destroy();
            respond(['success' => true]);
            break;

        case 'doctors':
            require_patient();
            $stmt = $pdo->query('SELECT id, name, specialty FROM doctors ORDER BY name');
            respond(['success' => true, 'doctors' => $stmt->fetchAll()]);
            break;

        case 'slots':
            require_patient();
            $doctorId = (int) ($input['doctor_id'] ?? 0);
            $date = trim($input['date'] ?? '');
            if ($doctorId < 1 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                respond(['success' => false, 'message' => 'Invalid doctor or date.'], 400);
            }

            $stmt = $pdo->prepare(
                'SELECT id, slot_time FROM doctor_slots
                 WHERE doctor_id = ? AND slot_date = ? AND is_available = 1
                 ORDER BY slot_time'
            );
            $stmt->execute([$doctorId, $date]);
            respond(['success' => true, 'slots' => $stmt->fetchAll()]);
            break;

        case 'book':
            $patientId = require_patient();
            $slotId = (int) ($input['slot_id'] ?? 0);
            $doctorId = (int) ($input['doctor_id'] ?? 0);
            $date = trim($input['date'] ?? '');

            if ($slotId < 1 || $doctorId < 1 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                respond(['success' => false, 'message' => 'Invalid appointment request.'], 400);
            }

            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare(
                    'SELECT id, doctor_id, slot_date, slot_time, is_available
                     FROM doctor_slots WHERE id = ? FOR UPDATE'
                );
                $stmt->execute([$slotId]);
                $slot = $stmt->fetch();

                if (!$slot || (int)$slot['doctor_id'] !== $doctorId || $slot['slot_date'] !== $date || (int)$slot['is_available'] !== 1) {
                    $pdo->rollBack();
                    respond(['success' => false, 'message' => 'Sorry, this time is no longer available. Please select another time.'], 409);
                }

                $check = $pdo->prepare('SELECT id FROM appointments WHERE patient_id = ? AND slot_id = ? LIMIT 1');
                $check->execute([$patientId, $slotId]);
                if ($check->fetch()) {
                    $pdo->rollBack();
                    respond(['success' => false, 'message' => 'You already have this appointment.'], 409);
                }

                // Appointment starts as PENDING. An admin must confirm it.
                $insert = $pdo->prepare(
                    'INSERT INTO appointments (patient_id, doctor_id, slot_id, appointment_date, appointment_time, status)
                     VALUES (?, ?, ?, ?, ?, "PENDING")'
                );
                $insert->execute([$patientId, $doctorId, $slotId, $slot['slot_date'], $slot['slot_time']]);

                $update = $pdo->prepare('UPDATE doctor_slots SET is_available = 0 WHERE id = ?');
                $update->execute([$slotId]);

                $appointmentId = (int)$pdo->lastInsertId();
                $pdo->commit();
                respond(['success' => true, 'appointment' => [
                    'id' => $appointmentId,
                    'slot_time' => $slot['slot_time'],
                    'status' => 'PENDING'
                ]]);
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                if ($e instanceof PDOException && (int)$e->errorInfo[1] === 1062) {
                    respond(['success' => false, 'message' => 'Sorry, this time is no longer available. Please select another time.'], 409);
                }
                throw $e;
            }
            break;

        case 'admin_appointments':
            require_admin();
            $stmt = $pdo->query(
                'SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.created_at,
                        p.name AS patient_name, p.phone AS patient_phone,
                        d.name AS doctor_name, d.specialty
                 FROM appointments a
                 INNER JOIN patients p ON p.id = a.patient_id
                 INNER JOIN doctors d ON d.id = a.doctor_id
                 ORDER BY CASE WHEN a.status = "PENDING" THEN 0 ELSE 1 END,
                          a.appointment_date, a.appointment_time, a.id'
            );
            respond(['success' => true, 'appointments' => $stmt->fetchAll()]);
            break;

        case 'admin_confirm':
            require_admin();
            $appointmentId = (int) ($input['appointment_id'] ?? 0);
            if ($appointmentId < 1) respond(['success' => false, 'message' => 'Invalid appointment.'], 400);

            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare('SELECT id, status FROM appointments WHERE id = ? FOR UPDATE');
                $stmt->execute([$appointmentId]);
                $appointment = $stmt->fetch();

                if (!$appointment) {
                    $pdo->rollBack();
                    respond(['success' => false, 'message' => 'Appointment not found.'], 404);
                }
                if ($appointment['status'] !== 'PENDING') {
                    $pdo->rollBack();
                    respond(['success' => false, 'message' => 'Only pending appointments can be confirmed.'], 409);
                }

                $update = $pdo->prepare('UPDATE appointments SET status = "CONFIRMED" WHERE id = ?');
                $update->execute([$appointmentId]);
                $pdo->commit();
                respond(['success' => true, 'message' => 'Appointment confirmed.']);
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
            break;

        case 'admin_cancel':
            require_admin();
            $appointmentId = (int) ($input['appointment_id'] ?? 0);
            if ($appointmentId < 1) respond(['success' => false, 'message' => 'Invalid appointment.'], 400);

            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare(
                    'SELECT id, slot_id, status FROM appointments WHERE id = ? FOR UPDATE'
                );
                $stmt->execute([$appointmentId]);
                $appointment = $stmt->fetch();

                if (!$appointment) {
                    $pdo->rollBack();
                    respond(['success' => false, 'message' => 'Appointment not found.'], 404);
                }
                if ($appointment['status'] === 'CANCELLED') {
                    $pdo->rollBack();
                    respond(['success' => false, 'message' => 'Appointment is already cancelled.'], 409);
                }

                $updateAppointment = $pdo->prepare('UPDATE appointments SET status = "CANCELLED" WHERE id = ?');
                $updateAppointment->execute([$appointmentId]);

                // A cancelled appointment releases its time slot again.
                $updateSlot = $pdo->prepare('UPDATE doctor_slots SET is_available = 1 WHERE id = ?');
                $updateSlot->execute([$appointment['slot_id']]);

                $pdo->commit();
                respond(['success' => true, 'message' => 'Appointment cancelled. The time slot is available again.']);
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $e;
            }
            break;

        default:
            respond(['success' => false, 'message' => 'Invalid action.'], 400);
    }
} catch (Throwable $e) {
    error_log($e->getMessage());
    respond(['success' => false, 'message' => 'Something went wrong on the server.'], 500);
}
