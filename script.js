const state = {
  patient: null,
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

function setAuthMode(register) {
  $('loginForm').classList.toggle('hidden', register);
  $('registerForm').classList.toggle('hidden', !register);
}

async function checkSession() {
  try {
    const result = await api('session');
    if (result.logged_in) {
      state.patient = result.patient;
      await showPatientScreen();
    } else {
      $('authScreen').classList.remove('hidden');
      $('patientScreen').classList.add('hidden');
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
    state.patient = result.patient;
    await showPatientScreen();
    showMessage('Account created successfully.');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function logout() {
  try { await api('logout'); } catch (_) {}
  state.patient = null;
  $('patientScreen').classList.add('hidden');
  $('authScreen').classList.remove('hidden');
  $('loginPassword').value = '';
}

async function showPatientScreen() {
  $('authScreen').classList.add('hidden');
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
      showMessage(`Appointment confirmed for ${formatTime(result.appointment.slot_time)}.`, 'success');
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

$('showRegisterBtn').addEventListener('click', () => setAuthMode(true));
$('showLoginBtn').addEventListener('click', () => setAuthMode(false));
$('loginBtn').addEventListener('click', login);
$('registerBtn').addEventListener('click', register);
$('logoutBtn').addEventListener('click', logout);
$('doctorSelect').addEventListener('change', loadSlots);
$('dateSelect').addEventListener('change', loadSlots);
$('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

checkSession();
