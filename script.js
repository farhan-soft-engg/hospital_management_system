const state = {
  role: null,
  patient: null,
  admin: null,
  doctors: []
};

const $ = (id) => document.getElementById(id);

async function api(action, data = {}, method = 'GET') {
  const params = new URLSearchParams({ action });
  let url = `api.php?${params.toString()}`;
  const options = { method, credentials: 'same-origin' };
  if (method === 'POST') {
    options.headers = { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' };
    options.body = new URLSearchParams(data).toString();
  } else {
    Object.entries(data).forEach(([key, value]) => params.set(key, value));
    url = `api.php?${params.toString()}`;
  }
  const response = await fetch(url, options);
  let result;
  try {
    result = await response.json();
  } catch (_) {
    throw new Error('Server returned an invalid response.');
  }
  if (!response.ok && !result.message) throw new Error('Request failed.');
  return result;
}

function showMessage(text, type = 'success') {
  const box = $('message');
  box.textContent = text;
  box.className = `message ${type}`;
  setTimeout(() => box.classList.add('hidden'), 4000);
}

function hideAllScreens() {
  $('authScreen').classList.add('hidden');
  $('patientScreen').classList.add('hidden');
  $('adminScreen').classList.add('hidden');
}

function setAuthMode(mode) {
  $('loginForm').classList.toggle('hidden', mode !== 'patient');
  $('registerForm').classList.toggle('hidden', mode !== 'register');
  $('adminLoginForm').classList.toggle('hidden', mode !== 'admin');

  $('authSubtitle').textContent = mode === 'admin' ? 'Administrator Login' :
    mode === 'register' ? 'Create Patient Account' : 'Patient Login';
}

async function checkSession() {
  try {
    const result = await api('session');
    if (!result.logged_in) {
      hideAllScreens();
      $('authScreen').classList.remove('hidden');
      setAuthMode('patient');
      return;
    }

    if (result.role === 'admin') {
      state.role = 'admin';
      state.admin = result.admin;
      await showAdminScreen();
    } else {
      state.role = 'patient';
      state.patient = result.patient;
      await showPatientScreen();
    }
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function login() {
  const phone = $('loginPhone').value.trim();
  const password = $('loginPassword').value;
  if (!phone || !password) return showMessage('Enter phone and password.', 'error');

  try {
    const result = await api('login', { phone, password }, 'POST');
    if (!result.success) return showMessage(result.message, 'error');
    state.role = 'patient';
    state.patient = result.patient;
    await showPatientScreen();
    showMessage('Login successful.');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function register() {
  const name = $('registerName').value.trim();
  const phone = $('registerPhone').value.trim();
  const password = $('registerPassword').value;
  const age = $('registerAge').value.trim();
  const gender = $('registerGender').value;
  const address = $('registerAddress').value.trim();

  if (!name || !phone || !password || !age || !gender || !address) {
    return showMessage('Please fill in all fields.', 'error');
  }

  try {
    const result = await api('register', { name, phone, password, age, gender, address }, 'POST');
    if (!result.success) return showMessage(result.message, 'error');
    state.role = 'patient';
    state.patient = result.patient;
    await showPatientScreen();
    showMessage('Account created successfully.');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function adminLogin() {
  const username = $('adminUsername').value.trim();
  const password = $('adminPassword').value;
  if (!username || !password) return showMessage('Enter admin username and password.', 'error');

  try {
    const result = await api('admin_login', { username, password }, 'POST');
    if (!result.success) return showMessage(result.message, 'error');
    state.role = 'admin';
    state.admin = result.admin;
    await showAdminScreen();
    showMessage('Admin login successful.');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function logout() {
  try { await api('logout'); } catch (_) {}
  state.role = null;
  state.patient = null;
  state.admin = null;
  hideAllScreens();
  $('authScreen').classList.remove('hidden');
  setAuthMode('patient');
  $('loginPassword').value = '';
  $('adminPassword').value = '';
}

async function showPatientScreen() {
  hideAllScreens();
  $('patientScreen').classList.remove('hidden');
  $('patientName').textContent = state.patient.name;

  const today = new Date().toISOString().slice(0, 10);
  $('dateSelect').min = today;
  if (!$('dateSelect').value) $('dateSelect').value = today;

  await loadDoctors();
  loadSlots();
}

async function loadDoctors() {
  const result = await api('doctors');
  if (!result.success) throw new Error(result.message);
  state.doctors = result.doctors;

  const select = $('doctorSelect');
  select.innerHTML = '<option value="">Select doctor</option>';
  state.doctors.forEach(doctor => {
    const option = document.createElement('option');
    option.value = doctor.id;
    option.textContent = `${doctor.name} — ${doctor.specialty}`;
    select.appendChild(option);
  });
}

function showDoctorInfo() {
  const doctor = state.doctors.find(d => String(d.id) === String($('doctorSelect').value));
  const box = $('doctorInfo');
  if (!doctor) {
    box.classList.add('hidden');
    return;
  }
  box.innerHTML = `<strong>${escapeHtml(doctor.name)}</strong><span>${escapeHtml(doctor.specialty)}</span>`;
  box.classList.remove('hidden');
}

async function loadSlots() {
  showDoctorInfo();
  const doctorId = $('doctorSelect').value;
  const date = $('dateSelect').value;
  const container = $('slots');

  if (!doctorId || !date) {
    container.innerHTML = '<p class="muted">Select a doctor and date.</p>';
    return;
  }

  container.innerHTML = '<p class="muted">Checking available times...</p>';

  try {
    const result = await api('slots', { doctor_id: doctorId, date });
    if (!result.success) {
      container.innerHTML = `<p class="muted">${escapeHtml(result.message)}</p>`;
      return;
    }

    if (!result.slots.length) {
      container.innerHTML = '<p class="muted">No available times for this doctor on this date.</p>';
      return;
    }

    container.innerHTML = '';
    result.slots.forEach(slot => {
      const button = document.createElement('button');
      button.className = 'slot-btn';
      button.textContent = formatTime(slot.slot_time);
      button.addEventListener('click', () => bookSlot(slot.id));
      container.appendChild(button);
    });
  } catch (error) {
    container.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

async function bookSlot(slotId) {
  const doctorId = $('doctorSelect').value;
  const date = $('dateSelect').value;
  if (!doctorId || !date) return;

  const buttons = [...document.querySelectorAll('.slot-btn')];
  buttons.forEach(button => button.disabled = true);

  try {
    const result = await api('book', { slot_id: slotId, doctor_id: doctorId, date }, 'POST');
    if (result.success) {
      showMessage(`Appointment request submitted for ${formatTime(result.appointment.slot_time)}. Waiting for admin confirmation.`, 'success');
      await loadSlots();
    } else {
      showMessage(result.message, 'error');
      await loadSlots();
    }
  } catch (error) {
    showMessage(error.message, 'error');
    await loadSlots();
  }
}

async function loadPatientAppointments() {
  const container = $('patientAppointmentList');
  container.innerHTML = '<p class="muted">Loading appointments...</p>';

  try {
    const result = await api('patient_appointments');
    if (!result.success) {
      container.innerHTML = `<p class="muted">${escapeHtml(result.message)}</p>`;
      return;
    }

    if (!result.appointments.length) {
      container.innerHTML = '<p class="muted">You have no appointments yet.</p>';
      return;
    }

    container.innerHTML = '';
    result.appointments.forEach(appointment => {
      const card = document.createElement('div');
      card.className = 'appointment-item';
      const statusClass = appointment.status.toLowerCase();

      card.innerHTML = `
        <div class="appointment-main">
          <div class="appointment-title">
            <strong>Dr. ${escapeHtml(appointment.doctor_name)}</strong>
            <span class="status ${statusClass}">${escapeHtml(appointment.status)}</span>
          </div>
          <div class="appointment-details">
            <span><b>Specialty:</b> ${escapeHtml(appointment.specialty)}</span>
            <span><b>Date:</b> ${escapeHtml(appointment.appointment_date)}</span>
            <span><b>Time:</b> ${formatTime(appointment.appointment_time)}</span>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}
async function showAdminScreen() {
  hideAllScreens();
  $('adminScreen').classList.remove('hidden');
  $('adminName').textContent = state.admin.name || state.admin.username;

  setupAdminAppointmentSections();
  await loadAppointments();
}

function setupAdminAppointmentSections() {
  const container = $('appointmentList');

  // Don't create the sections more than once
  if ($('todayAppointmentsSection')) return;

  const parent = container.parentElement;

  const todaySection = document.createElement('div');
  todaySection.id = 'todayAppointmentsSection';
  todaySection.className = 'admin-appointment-section';

  todaySection.innerHTML = `
    <div class="section-heading">
      <div>
        <h3>Today's Appointments</h3>
        <p class="section-description">Appointments scheduled for today.</p>
      </div>
    </div>
    <div id="todayAppointmentList" class="appointment-list">
      <p class="muted">Loading appointments...</p>
    </div>
  `;

  const historySection = document.createElement('div');
  historySection.id = 'historyAppointmentsSection';
  historySection.className = 'admin-appointment-section';

  historySection.innerHTML = `
    <div class="section-heading">
      <div>
        <h3>Appointment History</h3>
        <p class="section-description">Previous appointments.</p>
      </div>
    </div>
    <div id="historyAppointmentList" class="appointment-list">
      <p class="muted">Loading appointments...</p>
    </div>
  `;

  // Replace the original appointment container
  parent.insertBefore(todaySection, container);
  parent.insertBefore(historySection, todaySection.nextSibling);

  container.classList.add('hidden');
}


function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}


async function loadAppointments() {
  setupAdminAppointmentSections();

  const todayContainer = $('todayAppointmentList');
  const historyContainer = $('historyAppointmentList');

  todayContainer.innerHTML = '<p class="muted">Loading appointments...</p>';
  historyContainer.innerHTML = '<p class="muted">Loading appointments...</p>';

  try {
    const result = await api('admin_appointments');

    if (!result.success) {
      todayContainer.innerHTML =
        `<p class="muted">${escapeHtml(result.message)}</p>`;

      historyContainer.innerHTML =
        `<p class="muted">${escapeHtml(result.message)}</p>`;

      return;
    }

    const today = getLocalDate();

    // Separate today's appointments from previous appointments
    const todaysAppointments = result.appointments.filter(
      appointment => appointment.appointment_date === today
    );

    const historyAppointments = result.appointments.filter(
      appointment => appointment.appointment_date < today
    );

    renderAdminAppointments(
      todaysAppointments,
      todayContainer,
      'No appointments scheduled for today.'
    );

    renderAdminAppointments(
      historyAppointments,
      historyContainer,
      'No previous appointments.'
    );

  } catch (error) {
    todayContainer.innerHTML =
      `<p class="muted">${escapeHtml(error.message)}</p>`;

    historyContainer.innerHTML =
      `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}


function renderAdminAppointments(appointments, container, emptyMessage) {
  if (!appointments.length) {
    container.innerHTML = `<p class="muted">${emptyMessage}</p>`;
    return;
  }

  container.innerHTML = '';

  appointments.forEach(appointment => {
    const card = document.createElement('div');
    card.className = 'appointment-item';

    const statusClass = appointment.status.toLowerCase();

    const actionHtml = appointment.status === 'PENDING'
      ? `
        <div class="appointment-actions">
          <button
            class="confirm-btn"
            data-id="${appointment.id}">
            Confirm
          </button>

          <button
            class="cancel-btn"
            data-id="${appointment.id}">
            Cancel
          </button>
        </div>
      `
      : appointment.status === 'CONFIRMED'
        ? `
          <div class="appointment-actions">
            <button
              class="cancel-btn"
              data-id="${appointment.id}">
              Cancel
            </button>
          </div>
        `
        : '<span class="muted">No action</span>';

    card.innerHTML = `
      <div class="appointment-main">
        <div class="appointment-title">
          <strong>${escapeHtml(appointment.patient_name)}</strong>

          <span class="status ${statusClass}">
            ${escapeHtml(appointment.status)}
          </span>
        </div>

        <div class="appointment-details">
          <span>
            <b>Phone:</b>
            ${escapeHtml(appointment.patient_phone)}
          </span>

          <span>
            <b>Doctor:</b>
            ${escapeHtml(appointment.doctor_name)}
            (${escapeHtml(appointment.specialty)})
          </span>

          <span>
            <b>Date:</b>
            ${escapeHtml(appointment.appointment_date)}
          </span>

          <span>
            <b>Time:</b>
            ${formatTime(appointment.appointment_time)}
          </span>
        </div>
      </div>

      ${actionHtml}
    `;

    container.appendChild(card);
  });

  // Confirm buttons
  container.querySelectorAll('.confirm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateAppointment(btn.dataset.id, 'confirm');
    });
  });

  // Cancel buttons
  container.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateAppointment(btn.dataset.id, 'cancel');
    });
  });
}async function updateAppointment(appointmentId, action) {
  const message = action === 'confirm'
    ? 'Confirm this appointment?'
    : 'Cancel this appointment? The time slot will become available again.';

  if (!window.confirm(message)) return;

  try {
    const apiAction = action === 'confirm' ? 'admin_confirm' : 'admin_cancel';
    const result = await api(apiAction, { appointment_id: appointmentId }, 'POST');
    showMessage(result.message, result.success ? 'success' : 'error');
    if (result.success) await loadAppointments();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

function formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

$('showRegisterBtn').addEventListener('click', () => setAuthMode('register'));
$('showLoginBtn').addEventListener('click', () => setAuthMode('patient'));
$('showAdminBtn').addEventListener('click', () => setAuthMode('admin'));
$('showPatientBtn').addEventListener('click', () => setAuthMode('patient'));
$('loginBtn').addEventListener('click', login);
$('registerBtn').addEventListener('click', register);
$('adminLoginBtn').addEventListener('click', adminLogin);
$('patientLogoutBtn').addEventListener('click', logout);
$('adminLogoutBtn').addEventListener('click', logout);
$('refreshAppointmentsBtn').addEventListener('click', loadAppointments);
$('refreshPatientAppointmentsBtn').addEventListener('click', loadPatientAppointments);
$('doctorSelect').addEventListener('change', loadSlots);
$('dateSelect').addEventListener('change', loadSlots);
$('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
$('adminPassword').addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });

checkSession();
