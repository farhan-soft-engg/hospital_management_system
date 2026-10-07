# Hospital Management System — PHP + MySQL

## Technology
- Frontend: HTML, CSS, JavaScript
- Backend: PHP (PDO)
- Database: MySQL

## Database tables
1. `patients`
2. `doctors`
3. `doctor_slots`
4. `appointments`

## How to run with XAMPP

1. Install XAMPP.
2. Start **Apache** and **MySQL** from the XAMPP Control Panel.
3. Copy this whole folder into:
   `C:\xampp\htdocs\hospital_management_system`
4. Open `http://localhost/phpmyadmin`
5. Create/import the database:
   - Click **Import**
   - Select `database.sql`
   - Run the import.
6. Open:
   `http://localhost/hospital_management_system/`

The PHP API connects using:
- host: `localhost`
- database: `hospital_management`
- username: `root`
- password: empty

If your MySQL root account has a password, edit the `$pass` value in `api.php`.

## Scenario implementation

Patient:
- Existing patient details are retrieved from MySQL.
- New patient details can be registered.
- Patient requests an appointment.

Assistant:
- Checks doctor availability.
- Confirms the appointment.
- Can cancel an appointment at any time.

System:
- Stores patients, doctors, slots and appointments.
- Prevents double-booking by locking the selected free slot.
- Releases the slot after cancellation.
- Shows confirmation/cancellation notification in the UI.

## Important
This is a university-project prototype. Authentication, role-based permissions, CSRF protection, audit logging, and production security should be added before real-world deployment.
