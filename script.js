const $=id=>document.getElementById(id);const state={role:null,patient:null,admin:null,doctor:null,doctors:[],selectedSlot:null};
async function api(action,data={},method='GET'){const url='api.php?action='+encodeURIComponent(action)+(method==='GET'?'&'+new URLSearchParams(data):'');const opt={method,credentials:'same-origin'};if(method==='POST'){opt.headers={'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'};opt.body=new URLSearchParams(data)}let r;try{r=await fetch(url,opt)}catch(e){throw Error('Cannot connect to api.php. Open this site through http://localhost/ and check Apache.')}let x;try{x=await r.json()}catch(e){throw Error('Server returned a non-JSON response. Check PHP errors and database settings.')}if(!r.ok||x.success===false)throw Error(x.message||'Request failed.');return x}
function msg(t,type='success'){const el=$('message');el.textContent=t;el.className='message '+type;el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),4500)}function hideScreens(){['homeScreen','authScreen','patientScreen','adminScreen','doctorScreen'].forEach(id=>$(id)?.classList.add('hidden'))}function auth(mode){hideScreens();$('authScreen').classList.remove('hidden');['loginForm','registerForm','adminLoginForm','doctorLoginForm'].forEach(id=>$(id).classList.add('hidden'));const map={patient:'loginForm',register:'registerForm',admin:'adminLoginForm',doctor:'doctorLoginForm'};$(map[mode]).classList.remove('hidden');const title=$(map[mode]).querySelector('h1');if(title)title.textContent=({patient:'Patient Login',register:'Create your account',admin:'Admin Login',doctor:'Doctor Login'})[mode]||'Login';window.scrollTo({top:0,behavior:'smooth'})}
function home(){hideScreens();$('homeScreen').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})}function localDate(){let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function time(v){let [h,m]=v.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`}

// Helper to safely handle line breaks in problem descriptions
function nl2br(str) {
  return esc(str).replace(/\r\n|\r|\n/g, '<br>');
}

async function openDoctorsModal(){
  const modal = $('doctorsModal');
  const list = $('doctorsModalList');
  modal.classList.remove('hidden');
  list.innerHTML = '<p class="muted">Loading doctors...</p>';
  try{
    const r = await api('doctors');
    if(!r.doctors.length){
      list.innerHTML = '<p class="muted">No doctors found.</p>';
      return;
    }
    list.innerHTML = r.doctors.map(d=>`
      <div class="doctor-card">
        <div class="doctor-icon-circle">✚</div>
        <div class="doctor-details">
          <strong>${esc(d.name)}</strong>
          <span class="specialty">${esc(d.specialty)}</span>
        </div>
      </div>
    `).join('');
  }catch(e){
    list.innerHTML = `<p class="muted">${esc(e.message)}</p>`;
  }
}

async function enterPatient(p){state.role='patient';state.patient=p;hideScreens();$('patientScreen').classList.remove('hidden');$('patientName').textContent=p.name;$('dateSelect').min=localDate();$('dateSelect').value=localDate();$('problemDescription').value='';$('problemCount').textContent='0 / 2000';$('bookAppointmentBtn').disabled=true;const r=await api('doctors');state.doctors=r.doctors;$('doctorSelect').innerHTML='<option value="">Choose a doctor</option>'+state.doctors.map(d=>`<option value="${d.id}">${esc(d.name)} — ${esc(d.specialty)}</option>`).join('');await patientAppointments()}
async function patientLogin(){try{const r=await api('login',{phone:$('loginPhone').value.trim(),password:$('loginPassword').value},'POST');await enterPatient(r.patient);msg('Login successful.')}catch(e){msg(e.message,'error')}}async function register(){try{const data={name:$('registerName').value.trim(),phone:$('registerPhone').value.trim(),password:$('registerPassword').value,age:$('registerAge').value,gender:$('registerGender').value,address:$('registerAddress').value.trim()};const r=await api('register',data,'POST');await enterPatient(r.patient);msg('Account created.')}catch(e){msg(e.message,'error')}}async function adminLogin(){try{const r=await api('admin_login',{username:$('adminUsername').value.trim(),password:$('adminPassword').value},'POST');state.role='admin';state.admin=r.admin;hideScreens();$('adminScreen').classList.remove('hidden');$('adminName').textContent=r.admin.name;await adminAppointments()}catch(e){msg(e.message,'error')}}async function doctorLogin(){try{const r=await api('doctor_login',{username:$('doctorUsername').value.trim(),password:$('doctorPassword').value},'POST');state.role='doctor';state.doctor=r.doctor;hideScreens();$('doctorScreen').classList.remove('hidden');$('doctorName').textContent=r.doctor.name;await doctorAppointments();msg('Doctor login successful.')}catch(e){msg(e.message,'error')}}

async function loadSlots(){
  state.selectedSlot=null;
  $('bookAppointmentBtn').disabled=true;
  const did=$('doctorSelect').value, date=$('dateSelect').value;
  if(!did || !date){
    $('slots').innerHTML='<p class="muted">Select a doctor and date to see available times.</p>';
    return;
  }
  try{
    const r=await api('slots',{doctor_id:did,date});
    $('slots').innerHTML=r.slots.length?r.slots.map(s=>`<button type="button" class="slot-btn" data-slot="${s.id}">${time(s.slot_time)}</button>`).join(''):'<p class="muted">No available times for this date.</p>';
    $('slots').querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{
      state.selectedSlot=b.dataset.slot;
      $('slots').querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));$('bookAppointmentBtn').disabled=false;
      $('bookingSummary').textContent=`Selected time: ${b.textContent}`;
    });
  }catch(e){
    $('slots').innerHTML=`<p class="muted">${esc(e.message)}</p>`;
  }
}

async function book(){if(!state.selectedSlot)return msg('Choose an available time first.','error');try{const r=await api('book',{slot_id:state.selectedSlot,doctor_id:$('doctorSelect').value,date:$('dateSelect').value,problem_description:$('problemDescription').value.trim()},'POST');msg(r.message);$('problemDescription').value='';$('problemCount').textContent='0 / 2000';await loadSlots();await patientAppointments()}catch(e){msg(e.message,'error');await loadSlots()}}
async function patientAppointments(){try{const r=await api('patient_appointments');const el=$('patientAppointmentList');if(!r.appointments.length){el.innerHTML='<p class="muted">No appointments yet.</p>';return}el.innerHTML=r.appointments.map(a=>`<article class="appointment-item"><div class="appointment-main"><div class="appointment-title"><strong>${esc(a.doctor_name)}</strong><span class="status ${a.status.toLowerCase()}">${esc(a.status)}</span></div><div class="appointment-details"><span><b>Date:</b> ${esc(a.appointment_date)}</span><span><b>Time:</b> ${time(a.appointment_time)}</span><span><b>Problem:</b> ${nl2br(a.problem_description||'Not provided')}</span></div></div></article>`).join('')}catch(e){msg(e.message,'error')}}
async function adminAppointments(){try{const r=await api('admin_appointments');const el=$('appointmentList');if(!r.appointments.length){el.innerHTML='<p class="muted">No appointments found.</p>';return}el.innerHTML=r.appointments.map(a=>`<article class="appointment-item"><div class="appointment-main"><div class="appointment-title"><strong>${esc(a.patient_name)} · ${esc(a.patient_phone)}</strong><span class="status ${a.status.toLowerCase()}">${esc(a.status)}</span></div><div class="appointment-details"><span><b>Doctor:</b> ${esc(a.doctor_name)} (${esc(a.specialty)})</span><span><b>Date:</b> ${esc(a.appointment_date)}</span><span><b>Time:</b> ${time(a.appointment_time)}</span><span><b>Problem:</b> ${nl2br(a.problem_description||'Not provided')}</span></div></div><div class="appointment-actions">${a.status==='PENDING'?`<button class="confirm-btn" data-confirm="${a.id}">Confirm</button>`:''}${a.status!=='CANCELLED'?`<button class="cancel-btn" data-cancel="${a.id}">Cancel</button>`:''}</div></article>`).join('');el.querySelectorAll('[data-confirm]').forEach(b=>b.onclick=()=>updateAdmin(b.dataset.confirm,'admin_confirm'));el.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>updateAdmin(b.dataset.cancel,'admin_cancel'))}catch(e){msg(e.message,'error')}}async function updateAdmin(id,action){if(!confirm(action==='admin_confirm'?'Confirm this appointment?':'Cancel this appointment?'))return;try{const r=await api(action,{appointment_id:id},'POST');msg(r.message);await adminAppointments()}catch(e){msg(e.message,'error')}}
async function doctorAppointments(){try{const r=await api('doctor_appointments');const el=$('doctorAppointmentList');if(!r.appointments.length){el.innerHTML='<p class="muted">No patients scheduled for today.</p>';return}el.innerHTML=r.appointments.map(a=>`<article class="appointment-item"><div class="appointment-main"><div class="appointment-title"><strong>${esc(a.patient_name)} · ${esc(a.patient_phone)}</strong><span class="status ${a.status.toLowerCase()}">${esc(a.status)}</span></div><div class="appointment-details"><span><b>Time:</b> ${time(a.appointment_time)}</span><span><b>Problem:</b> ${nl2br(a.problem_description||'Not provided')}</span></div></div><div class="appointment-actions"><button class="cancel-btn" data-doctor-cancel="${a.id}">Cancel</button></div></article>`).join('');el.querySelectorAll('[data-doctor-cancel]').forEach(b=>b.onclick=async()=>{if(!confirm('Cancel this appointment?'))return;try{const x=await api('doctor_cancel',{appointment_id:b.dataset.doctorCancel},'POST');msg(x.message);await doctorAppointments()}catch(e){msg(e.message,'error')}})}catch(e){msg(e.message,'error')}}async function logout(){try{await api('logout','', 'POST')}catch(e){}state.role=null;state.patient=state.admin=state.doctor=null;home()}

// Event Listeners
document.querySelectorAll('.brand').forEach(el => {
  el.onclick = (e) => {
    e.preventDefault();
    home();
  };
});

if($('doctorsCard'))$('doctorsCard').onclick = openDoctorsModal;
if($('closeDoctorsModal')) $('closeDoctorsModal').onclick = () =>$('doctorsModal').classList.add('hidden');
if($('modalBookBtn')) $('modalBookBtn').onclick = () => {$('doctorsModal').classList.add('hidden'); auth('patient'); };

$('homePatientLogin').onclick = () => auth('patient');$('homeAdminLogin').onclick = () => auth('admin');
$('homeDoctorLogin').onclick = () => auth('doctor');$('heroBookBtn').onclick = () => auth('patient');
$('aboutLoginBtn').onclick = () => auth('patient');$('showRegisterBtn').onclick = () => auth('register');
$('showLoginBtn').onclick = () => auth('patient');$('loginBtn').onclick = patientLogin;
$('registerBtn').onclick = register;
$('adminLoginBtn').onclick = adminLogin;
$('doctorLoginBtn').onclick = doctorLogin;
$('patientLogoutBtn').onclick = logout;
$('adminLogoutBtn').onclick = logout;
$('doctorLogoutBtn').onclick = logout;
$('doctorSelect').onchange = loadSlots;
$('dateSelect').onchange = loadSlots;
$('bookAppointmentBtn').onclick = book;
$('refreshAppointmentsBtn').onclick = adminAppointments;
$('refreshDoctorAppointmentsBtn').onclick = doctorAppointments;
$('refreshPatientAppointmentsBtn').onclick = patientAppointments;
$('problemDescription').oninput = e =>$('problemCount').textContent = `${e.target.value.length} / 2000`;

// --- Enter Key Form Submission Support ---
['loginPhone', 'loginPassword'].forEach(id => {
  $(id)?.addEventListener('keypress', e => { if(e.key === 'Enter') patientLogin(); });
});
['registerName', 'registerPhone', 'registerPassword', 'registerAge', 'registerAddress'].forEach(id => {
  $(id)?.addEventListener('keypress', e => { if(e.key === 'Enter') register(); });
});
['adminUsername', 'adminPassword'].forEach(id => {
  $(id)?.addEventListener('keypress', e => { if(e.key === 'Enter') adminLogin(); });
});
['doctorUsername', 'doctorPassword'].forEach(id => {
  $(id)?.addEventListener('keypress', e => { if(e.key === 'Enter') doctorLogin(); });
});

(async()=>{try{const r=await api('session');if(!r.logged_in){home();return}if(r.role==='patient')await enterPatient(r.patient);else if(r.role==='admin'){state.admin=r.admin;hideScreens();$('adminScreen').classList.remove('hidden');$('adminName').textContent=r.admin.name;await adminAppointments()}else{state.doctor=r.doctor;hideScreens();$('doctorScreen').classList.remove('hidden');$('doctorName').textContent=r.doctor.name;await doctorAppointments()}}catch(e){home();msg(e.message,'error')}})();
