const KEY="hms_v1";
const TIMES=["09:00","09:30","10:00","10:30","11:00","11:30","12:00","14:00","14:30","15:00","15:30","16:00"];
const initial={
 patients:[
  {id:"P001",name:"Rahim Ahmed",phone:"01700000001",age:28,gender:"Male",address:"Dhaka"},
  {id:"P002",name:"Nusrat Jahan",phone:"01700000002",age:24,gender:"Female",address:"Dhaka"}
 ],
 doctors:[
  {id:"D001",name:"Dr. Ayesha Rahman",specialty:"Medicine",slots:6},
  {id:"D002",name:"Dr. Tanvir Hasan",specialty:"Cardiology",slots:6},
  {id:"D003",name:"Dr. Sadia Islam",specialty:"Dermatology",slots:6}
 ],
 appointments:[]
};
let db=JSON.parse(localStorage.getItem(KEY)||"null")||initial;
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function save(){localStorage.setItem(KEY,JSON.stringify(db));renderAll()}
function today(){return new Date().toISOString().slice(0,10)}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500)}
function openModal(id){$("#"+id).classList.add("show")}
function closeModal(id){$("#"+id).classList.remove("show")}
function fillPatientSelect(id){$(id).innerHTML=db.patients.map(p=>`<option value="${p.id}">${p.name} (${p.id})</option>`).join("")}
function fillDoctorSelect(id){$(id).innerHTML=db.doctors.map(d=>`<option value="${d.id}">${d.name} — ${d.specialty}</option>`).join("")}
function fillTimes(id){$(id).innerHTML=TIMES.map(t=>`<option>${t}</option>`).join("")}
function occupied(did,date,time){return db.appointments.some(a=>a.doctorId===did&&a.date===date&&a.time===time&&a.status==="Confirmed")}
function availableSlots(did,date=today()){return TIMES.filter(t=>!occupied(did,date,t))}
function createAppointment(patientId,doctorId,date,time){
 if(occupied(doctorId,date,time)){toast("Sorry, that slot is already booked.");return false}
 const id="A"+String(db.appointments.length+1).padStart(3,"0");
 db.appointments.push({id,patientId,doctorId,date,time,status:"Confirmed",createdAt:new Date().toISOString()});
 save();toast("Appointment confirmed. Patient informed.");return true
}
function renderDashboard(){
 $("#statPatients").textContent=db.patients.length;
 $("#statDoctors").textContent=db.doctors.length;
 $("#statConfirmed").textContent=db.appointments.filter(a=>a.status==="Confirmed").length;
 $("#statSlots").textContent=db.doctors.reduce((n,d)=>n+availableSlots(d.id).length,0);
 const list=db.appointments.filter(a=>a.date===today()).slice(-6).reverse();
 $("#todayAppointments").innerHTML=list.length?list.map(a=>{
  const p=db.patients.find(x=>x.id===a.patientId),d=db.doctors.find(x=>x.id===a.doctorId);
  return `<div class="list-item"><span><b>${a.time}</b> · ${p?.name||"Unknown"}<br><small>${d?.name||""}</small></span><span class="status ${a.status.toLowerCase()}">${a.status}</span></div>`
 }).join(""):`<div class="list-item">No appointments today.</div>`;
}
function renderPatients(){
 const q=$("#patientSearch").value.toLowerCase();
 const rows=db.patients.filter(p=>`${p.id} ${p.name} ${p.phone}`.toLowerCase().includes(q));
 $("#patientsTable").innerHTML=rows.map(p=>`<tr><td>${p.id}</td><td>${p.name}</td><td>${p.phone}</td><td>${p.age}</td><td>${p.gender}</td><td><button class="action-btn" data-patient="${p.id}">Use for appointment</button></td></tr>`).join("");
}
function renderDoctors(){
 $("#doctorCards").innerHTML=db.doctors.map(d=>{
  const slots=availableSlots(d.id);
  return `<div class="doctor-card"><h3>${d.name}</h3><p>${d.specialty} · ${slots.length} free slots today</p>${slots.map(s=>`<span class="slot">${s}</span>`).join("")}</div>`
 }).join("");
}
function renderAppointments(){
 const q=$("#appointmentSearch").value.toLowerCase(), status=$("#appointmentStatus").value;
 const rows=db.appointments.filter(a=>{
  const p=db.patients.find(x=>x.id===a.patientId),d=db.doctors.find(x=>x.id===a.doctorId);
  const text=`${a.id} ${p?.name} ${d?.name}`.toLowerCase();
  return text.includes(q)&&(status==="all"||a.status===status);
 }).slice().reverse();
 $("#appointmentsTable").innerHTML=rows.map(a=>{
  const p=db.patients.find(x=>x.id===a.patientId),d=db.doctors.find(x=>x.id===a.doctorId);
  return `<tr><td>${a.id}</td><td>${p?.name||"-"}</td><td>${d?.name||"-"}</td><td>${a.date}</td><td>${a.time}</td><td><span class="status ${a.status.toLowerCase()}">${a.status}</span></td><td>${a.status==="Confirmed"?`<button class="action-btn cancel" data-cancel="${a.id}">Cancel</button>`:"-"}</td></tr>`
 }).join("")||`<tr><td colspan="7">No appointments found.</td></tr>`;
}
function renderAll(){
 fillPatientSelect("#quickPatient");fillPatientSelect("#aPatient");
 fillDoctorSelect("#quickDoctor");fillDoctorSelect("#aDoctor");
 fillTimes("#quickTime");fillTimes("#aTime");
 $("#quickDate").value ||= today();$("#aDate").value ||= today();
 renderDashboard();renderPatients();renderDoctors();renderAppointments();
}
function navigate(section){
 $$(".section").forEach(s=>s.classList.remove("active"));$("#"+section).classList.add("active");
 $$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.section===section));
 $("#pageTitle").textContent=section[0].toUpperCase()+section.slice(1);
}
$$(".nav-btn").forEach(b=>b.onclick=()=>navigate(b.dataset.section));
$("#newPatientBtn").onclick=()=>openModal("patientModal");
$("#newAppointmentBtn").onclick=()=>openModal("appointmentModal");
$$("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
$("#patientSearch").oninput=renderPatients;$("#appointmentSearch").oninput=renderAppointments;$("#appointmentStatus").onchange=renderAppointments;
$("#patientForm").onsubmit=e=>{
 e.preventDefault();
 const id="P"+String(db.patients.length+1).padStart(3,"0");
 db.patients.push({id,name:$("#pName").value.trim(),phone:$("#pPhone").value.trim(),age:Number($("#pAge").value),gender:$("#pGender").value,address:$("#pAddress").value.trim()});
 save();closeModal("patientModal");e.target.reset();navigate("patients");toast("New patient registered successfully.");
};
$("#appointmentForm").onsubmit=e=>{
 e.preventDefault();
 if(createAppointment($("#aPatient").value,$("#aDoctor").value,$("#aDate").value,$("#aTime").value)){closeModal("appointmentModal");navigate("appointments")}
};
$("#quickAppointmentForm").onsubmit=e=>{
 e.preventDefault();createAppointment($("#quickPatient").value,$("#quickDoctor").value,$("#quickDate").value,$("#quickTime").value);
};
document.addEventListener("click",e=>{
 const patientBtn=e.target.closest("[data-patient]");
 if(patientBtn){$("#aPatient").value=patientBtn.dataset.patient;openModal("appointmentModal")}
 const cancel=e.target.closest("[data-cancel]");
 if(cancel){
  const a=db.appointments.find(x=>x.id===cancel.dataset.cancel);
  if(a&&confirm("Cancel this appointment?")){a.status="Cancelled";save();toast("Appointment cancelled and patient informed.")}
 }
});
renderAll();
