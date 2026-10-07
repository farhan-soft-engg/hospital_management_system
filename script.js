const API="api.php";
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
let cache={patients:[],doctors:[],appointments:[]};

async function api(action, options={}) {
  const url=API+"?action="+encodeURIComponent(action)+(options.query?"&"+new URLSearchParams(options.query):"");
  const res=await fetch(url,{method:options.method||"GET",headers:{"Content-Type":"application/json"},body:options.body?JSON.stringify(options.body):undefined});
  const data=await res.json();
  if(!data.success) throw new Error(data.message||"Request failed");
  return data;
}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)}
function openModal(id){$("#"+id).classList.add("show")}
function closeModal(id){$("#"+id).classList.remove("show")}
function today(){return new Date().toISOString().slice(0,10)}
async function loadPatients(){
  const d=await api("patients",{query:{q:$("#patientSearch")?.value||""}});
  cache.patients=d.patients;
  $("#patientsTable").innerHTML=d.patients.map(p=>`<tr><td>${p.patient_code}</td><td>${p.name}</td><td>${p.phone}</td><td>${p.age}</td><td>${p.gender}</td><td><button class="action-btn" data-patient="${p.id}">Use for appointment</button></td></tr>`).join("")||`<tr><td colspan="6">No patients found.</td></tr>`;
  fillPatientSelect("#quickPatient");fillPatientSelect("#aPatient");
}
function fillPatientSelect(id){$(id).innerHTML=cache.patients.map(p=>`<option value="${p.id}">${p.name} (${p.patient_code})</option>`).join("")}
async function loadDoctors(){
  const d=await api("doctors");cache.doctors=d.doctors;
  $("#doctorCards").innerHTML=d.doctors.map(x=>`<div class="doctor-card"><h3>${x.name}</h3><p>${x.specialty} · ${x.slots.length} free slots today</p>${x.slots.map(s=>`<span class="slot">${s.slice(0,5)}</span>`).join("")}</div>`).join("");
  fillDoctorSelect("#quickDoctor");fillDoctorSelect("#aDoctor");
}
function fillDoctorSelect(id){$(id).innerHTML=cache.doctors.map(d=>`<option value="${d.id}">${d.name} — ${d.specialty}</option>`).join("")}
async function loadAppointments(){
 const d=await api("appointments",{query:{q:$("#appointmentSearch")?.value||"",status:$("#appointmentStatus")?.value||"all"}});
 cache.appointments=d.appointments;
 $("#appointmentsTable").innerHTML=d.appointments.map(a=>`<tr><td>${a.appointment_code}</td><td>${a.patient_name}</td><td>${a.doctor_name}</td><td>${a.appointment_date}</td><td>${a.appointment_time.slice(0,5)}</td><td><span class="status ${a.status.toLowerCase()}">${a.status}</span></td><td>${a.status==="Confirmed"?`<button class="action-btn cancel" data-cancel="${a.id}">Cancel</button>`:"-"}</td></tr>`).join("")||`<tr><td colspan="7">No appointments found.</td></tr>`;
}
async function loadDashboard(){
 const d=await api("dashboard");
 $("#statPatients").textContent=d.stats.patients;$("#statDoctors").textContent=d.stats.doctors;$("#statConfirmed").textContent=d.stats.confirmed;$("#statSlots").textContent=d.stats.slots;
 $("#todayAppointments").innerHTML=d.today.length?d.today.map(a=>`<div class="list-item"><span><b>${a.appointment_time.slice(0,5)}</b> · ${a.patient_name}<br><small>${a.doctor_name}</small></span><span class="status ${a.status.toLowerCase()}">${a.status}</span></div>`).join(""):`<div class="list-item">No appointments today.</div>`;
}
async function refresh(){try{await Promise.all([loadPatients(),loadDoctors(),loadAppointments(),loadDashboard()])}catch(e){toast(e.message)}}
async function createAppointment(patient_id,doctor_id,date,time){
 const d=await api("create_appointment",{method:"POST",body:{patient_id,doctor_id,date,time}});
 toast(d.message);await refresh();return true;
}
function navigate(section){$$(".section").forEach(s=>s.classList.remove("active"));$("#"+section).classList.add("active");$$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.section===section));$("#pageTitle").textContent=section[0].toUpperCase()+section.slice(1)}
$$(".nav-btn").forEach(b=>b.onclick=()=>navigate(b.dataset.section));
$("#newPatientBtn").onclick=()=>openModal("patientModal");$("#newAppointmentBtn").onclick=()=>openModal("appointmentModal");
$$("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
$("#patientSearch").oninput=()=>loadPatients();$("#appointmentSearch").oninput=()=>loadAppointments();$("#appointmentStatus").onchange=()=>loadAppointments();
$("#patientForm").onsubmit=async e=>{e.preventDefault();try{await api("create_patient",{method:"POST",body:{name:$("#pName").value,phone:$("#pPhone").value,age:Number($("#pAge").value),gender:$("#pGender").value,address:$("#pAddress").value}});closeModal("patientModal");e.target.reset();navigate("patients");toast("New patient registered successfully.");await refresh()}catch(x){toast(x.message)}};
$("#appointmentForm").onsubmit=async e=>{e.preventDefault();try{await createAppointment($("#aPatient").value,$("#aDoctor").value,$("#aDate").value,$("#aTime").value);closeModal("appointmentModal");navigate("appointments")}catch(x){toast(x.message)}};
$("#quickAppointmentForm").onsubmit=async e=>{e.preventDefault();try{await createAppointment($("#quickPatient").value,$("#quickDoctor").value,$("#quickDate").value,$("#quickTime").value)}catch(x){toast(x.message)}};
document.addEventListener("click",async e=>{
 const p=e.target.closest("[data-patient]");if(p){$("#aPatient").value=p.dataset.patient;openModal("appointmentModal")}
 const c=e.target.closest("[data-cancel]");
 if(c&&confirm("Cancel this appointment?")){try{const d=await api("cancel_appointment",{method:"POST",body:{id:c.dataset.cancel}});toast(d.message);await refresh()}catch(x){toast(x.message)}}
});
$("#quickDate").value=today();$("#aDate").value=today();
refresh();
