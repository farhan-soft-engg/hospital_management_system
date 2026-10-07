<?php
header('Content-Type: application/json; charset=utf-8');

$host = 'localhost';
$db   = 'hospital_management';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$db;charset=$charset",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Database connection failed. Import database.sql and check MySQL settings.']);
    exit;
}

$action = $_GET['action'] ?? '';

function body() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}
function out($data) {
    echo json_encode($data);
    exit;
}

try {
    if ($action === 'dashboard') {
        $patients = $pdo->query("SELECT COUNT(*) c FROM patients")->fetch()['c'];
        $doctors = $pdo->query("SELECT COUNT(*) c FROM doctors")->fetch()['c'];
        $confirmed = $pdo->query("SELECT COUNT(*) c FROM appointments WHERE status='Confirmed'")->fetch()['c'];
        $slots = $pdo->query("SELECT COUNT(*) c FROM doctor_slots s WHERE s.slot_date=CURDATE() AND s.is_available=1")->fetch()['c'];
        $today = $pdo->query("
            SELECT a.id,a.appointment_date,a.appointment_time,a.status,
                   p.name patient_name,d.name doctor_name
            FROM appointments a
            JOIN patients p ON p.id=a.patient_id
            JOIN doctors d ON d.id=a.doctor_id
            WHERE a.appointment_date=CURDATE()
            ORDER BY a.appointment_time DESC LIMIT 10
        ")->fetchAll();
        out(['success'=>true,'stats'=>compact('patients','doctors','confirmed','slots'),'today'=>$today]);
    }

    if ($action === 'patients') {
        $q = trim($_GET['q'] ?? '');
        $stmt = $pdo->prepare("SELECT * FROM patients
            WHERE name LIKE ? OR phone LIKE ? OR patient_code LIKE ?
            ORDER BY id DESC");
        $like="%$q%"; $stmt->execute([$like,$like,$like]);
        out(['success'=>true,'patients'=>$stmt->fetchAll()]);
    }

    if ($action === 'doctors') {
        $doctors=$pdo->query("SELECT * FROM doctors ORDER BY name")->fetchAll();
        foreach($doctors as &$d){
            $s=$pdo->prepare("SELECT appointment_time FROM doctor_slots WHERE doctor_id=? AND slot_date=CURDATE() AND is_available=1 ORDER BY appointment_time");
            $s->execute([$d['id']]);
            $d['slots']=$s->fetchAll(PDO::FETCH_COLUMN);
        }
        out(['success'=>true,'doctors'=>$doctors]);
    }

    if ($action === 'appointments') {
        $q=trim($_GET['q'] ?? '');
        $status=$_GET['status'] ?? 'all';
        $sql="SELECT a.id,a.appointment_code,a.appointment_date,a.appointment_time,a.status,
                     p.name patient_name,p.patient_code,d.name doctor_name,d.specialty
              FROM appointments a
              JOIN patients p ON p.id=a.patient_id
              JOIN doctors d ON d.id=a.doctor_id
              WHERE (p.name LIKE ? OR d.name LIKE ? OR a.appointment_code LIKE ?)";
        $params=["%$q%","%$q%","%$q%"];
        if($status!=='all'){ $sql.=" AND a.status=?"; $params[]=$status; }
        $sql.=" ORDER BY a.id DESC";
        $stmt=$pdo->prepare($sql); $stmt->execute($params);
        out(['success'=>true,'appointments'=>$stmt->fetchAll()]);
    }

    if ($action === 'create_patient') {
        $b=body();
        foreach(['name','phone','age','gender'] as $f) if(empty($b[$f])) out(['success'=>false,'message'=>"Missing $f"]);
        $code='P'.str_pad((string)((int)$pdo->query("SELECT COALESCE(MAX(id),0)+1 FROM patients")->fetchColumn()),3,'0',STR_PAD_LEFT);
        $stmt=$pdo->prepare("INSERT INTO patients(patient_code,name,phone,age,gender,address) VALUES(?,?,?,?,?,?)");
        $stmt->execute([$code,trim($b['name']),trim($b['phone']),(int)$b['age'],$b['gender'],trim($b['address']??'')]);
        out(['success'=>true,'message'=>'New patient registered successfully.','patient_id'=>$pdo->lastInsertId()]);
    }

    if ($action === 'availability') {
        $doctor=(int)($_GET['doctor_id']??0);
        $date=$_GET['date']??date('Y-m-d');
        $stmt=$pdo->prepare("SELECT DATE_FORMAT(s.appointment_time,'%H:%i') time
            FROM doctor_slots s
            WHERE s.doctor_id=? AND s.slot_date=? AND s.is_available=1
            ORDER BY s.appointment_time");
        $stmt->execute([$doctor,$date]);
        out(['success'=>true,'slots'=>$stmt->fetchAll(PDO::FETCH_COLUMN)]);
    }

    if ($action === 'create_appointment') {
        $b=body();
        foreach(['patient_id','doctor_id','date','time'] as $f) if(empty($b[$f])) out(['success'=>false,'message'=>"Missing $f"]);
        $pdo->beginTransaction();

        $lock=$pdo->prepare("SELECT id FROM doctor_slots WHERE doctor_id=? AND slot_date=? AND appointment_time=? AND is_available=1 FOR UPDATE");
        $lock->execute([(int)$b['doctor_id'],$b['date'],$b['time']]);
        $slot=$lock->fetch();
        if(!$slot){ $pdo->rollBack(); out(['success'=>false,'message'=>'That doctor slot is no longer available.']); }

        $code='A'.str_pad((string)((int)$pdo->query("SELECT COALESCE(MAX(id),0)+1 FROM appointments")->fetchColumn()),3,'0',STR_PAD_LEFT);
        $stmt=$pdo->prepare("INSERT INTO appointments(appointment_code,patient_id,doctor_id,appointment_date,appointment_time,status) VALUES(?,?,?,?,?,'Confirmed')");
        $stmt->execute([$code,(int)$b['patient_id'],(int)$b['doctor_id'],$b['date'],$b['time']]);

        $pdo->prepare("UPDATE doctor_slots SET is_available=0 WHERE id=?")->execute([$slot['id']]);
        $pdo->commit();
        out(['success'=>true,'message'=>'Appointment confirmed. Patient informed.','appointment_code'=>$code]);
    }

    if ($action === 'cancel_appointment') {
        $b=body();
        $pdo->beginTransaction();
        $stmt=$pdo->prepare("SELECT * FROM appointments WHERE id=? AND status='Confirmed' FOR UPDATE");
        $stmt->execute([(int)$b['id']]);
        $a=$stmt->fetch();
        if(!$a){$pdo->rollBack();out(['success'=>false,'message'=>'Appointment not found or already cancelled.']);}
        $pdo->prepare("UPDATE appointments SET status='Cancelled',cancelled_at=NOW() WHERE id=?")->execute([$a['id']]);
        $pdo->prepare("UPDATE doctor_slots SET is_available=1 WHERE doctor_id=? AND slot_date=? AND appointment_time=?")
            ->execute([$a['doctor_id'],$a['appointment_date'],$a['appointment_time']]);
        $pdo->commit();
        out(['success'=>true,'message'=>'Appointment cancelled and patient informed.']);
    }

    out(['success'=>false,'message'=>'Unknown action.']);
} catch (Throwable $e) {
    if($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    out(['success'=>false,'message'=>$e->getMessage()]);
}
?>
