const API = "http://localhost:3000";
const tokenKey = "bcos_token";

function setMsg(el, txt, ok=true){
  el.textContent = txt;
  el.style.color = ok ? "#aab6c5" : "#ffb3b3";
}

async function api(path, opts={}){
  const token = localStorage.getItem(tokenKey);
  const headers = Object.assign(
    { "Content-Type":"application/json" },
    opts.headers||{},
    token ? { "Authorization":"Bearer "+token } : {}
  );
  const res = await fetch(API+path, { ...opts, headers });
  const data = await res.json().catch(()=> ({}));
  if (!res.ok) throw new Error(data.error || ("HTTP "+res.status));
  return data;
}

async function init(){
  const locSel = document.getElementById("pLocation");
  const barberSel = document.getElementById("pBarber");
  const serviceSel = document.getElementById("pService");

  const [locations, services] = await Promise.all([
    api("/api/public/locations"),
    api("/api/public/services")
  ]);

  locSel.innerHTML = locations.map(l=>`<option value="${l.id}">${l.name} (${l.city}, ${l.province})</option>`).join("");
  serviceSel.innerHTML = services.map(s=>`<option value="${s.id}">${s.name} (${s.duration_min}m)</option>`).join("");

  async function loadBarbers(){
    const location_id = locSel.value;
    const barbers = await api("/api/public/barbers?location_id="+encodeURIComponent(location_id));
    barberSel.innerHTML = barbers.map(b=>`<option value="${b.id}">${b.full_name}</option>`).join("");
  }

  locSel.addEventListener("change", loadBarbers);
  await loadBarbers();
}

document.getElementById("publicBookingForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("pMsg");
  setMsg(msg, "Submitting booking...");

  try{
    const location_id = Number(document.getElementById("pLocation").value);
    const barber_id = Number(document.getElementById("pBarber").value);
    const service_id = Number(document.getElementById("pService").value);
    const start_time_local = document.getElementById("pStartTime").value;
    const start_time = new Date(start_time_local).toISOString();

    const client = {
      full_name: document.getElementById("pName").value.trim(),
      phone: document.getElementById("pPhone").value.trim(),
      email: document.getElementById("pEmail").value.trim(),
      notes: document.getElementById("pNotes").value.trim()
    };

    await api("/api/appointments", {
      method:"POST",
      body: JSON.stringify({ location_id, barber_id, service_id, start_time, client })
    });

    setMsg(msg, "✅ Booking created (demo). In production: confirmation + deposit + reminders.");
    e.target.reset();
  }catch(err){
    setMsg(msg, "❌ "+err.message+" (Tip: login on Admin page first in this demo.)", false);
  }
});

init().catch(e=>{
  const msg = document.getElementById("pMsg");
  setMsg(msg, "❌ "+e.message, false);
});
