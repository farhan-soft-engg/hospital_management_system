# Hospital Management System — Patient + Admin Appointment Version

This version keeps the patient flow simple and adds an administrator who confirms or cancels appointment requests.

## Patient flow
1. Patient opens the website.
2. Existing patient logs in with phone + password.
3. New patient creates an account.
4. Patient sees doctors.
5. Patient selects a date and sees available times.
6. Patient selects a time.
7. PHP checks the selected slot in MySQL inside a transaction with `FOR UPDATE`.
8. If available, a `PENDING` appointment is created and the slot becomes unavailable.
9. Patient sees that the request is waiting for admin confirmation.

## Admin flow
1. Click **Admin Login** on the first screen.
2. Login with the demo admin account:
   - Username: `admin`
   - Password: `admin123`
3. Admin sees appointment requests.
4. Admin can **Confirm** a pending appointment.
5. Admin can **Cancel** a pending or confirmed appointment.
6. When an appointment is cancelled, its time slot becomes available again.

## Files
- `index.html` — patient login/register, patient booking screen, admin login and admin panel
- `style.css` — UI
- `script.js` — browser logic
- `api.php` — PHP API, patient/admin sessions, booking and admin actions
- `database.sql` — MySQL tables, demo admin, doctors and sample appointment slots

## InfinityFree setup
1. Select your hosting-created MySQL database in phpMyAdmin.
2. If this is a fresh/test database, import `database.sql`. **This file drops the existing project tables first**, so do not use it where you need to preserve existing data.
3. Upload `index.html`, `style.css`, `script.js`, and `api.php` into the correct `htdocs` web root.
4. Open `api.php` on the hosting server and replace the four database placeholders with your actual InfinityFree values.
5. Do not put your real database password into public GitHub.

## Important
This is a university/demo project. The default admin password is intentionally simple for classroom testing. Change it before any non-demo use. The project does not include production-grade RBAC, CSRF protection, audit logging, email/SMS notifications, or medical-data compliance controls.
