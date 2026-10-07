# Hospital Management System — Patient Appointment Version

This version follows the requested flow and intentionally keeps the feature set small:

1. Patient opens the website.
2. Existing patient logs in with phone + password.
3. New patient creates an account.
4. Patient sees doctors.
5. Patient selects a date and sees available times.
6. Patient selects a time.
7. PHP checks the selected slot in MySQL inside a transaction with `FOR UPDATE`.
8. If available, an appointment is created and the slot becomes unavailable.
9. If another patient already took the slot, the patient is informed that the time is no longer available and no appointment is created.

## Files

- `index.html` — patient login/register and appointment screen
- `style.css` — UI
- `script.js` — browser logic
- `api.php` — PHP API, session login and booking transaction
- `database.sql` — MySQL tables, doctors and sample appointment slots

## InfinityFree setup

1. Create a MySQL database in the hosting control panel.
2. Open phpMyAdmin for that database.
3. Import `database.sql` while the hosting-created database is selected.
4. Upload `index.html`, `style.css`, `script.js`, and `api.php` into the web root (`htdocs`).
5. Do NOT put your real database password into the public GitHub repository.
6. On the hosting server, open `api.php` and replace:

```php
$host = 'YOUR_MYSQL_HOST';
$db   = 'YOUR_DATABASE_NAME';
$user = 'YOUR_DATABASE_USER';
$pass = 'YOUR_DATABASE_PASSWORD';
```

with the exact values from the hosting control panel.

## Important

This is a university/demo project. It does not include production-grade admin authentication, role management, email/SMS notifications, CSRF protection, audit logging, or medical-data compliance controls. Do not use real patient medical information on this demo deployment.
