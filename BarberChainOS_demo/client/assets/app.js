const API = "http://localhost:3000";
const tokenKey = "bcos_token";

function money(cents){
  return new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"}).format((cents||0)/100);
}
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

const loginForm = document.getElementById("loginForm");
const loginMsg = document.getElementById("loginMsg");
const dash = document.getElementById("dash");
const logoutBtn = document.getElementById("logoutBtn");

function showDash(show){ dash.classList.toggle("hidden", !show); }

async function loadDash(){
  const [locations, barbers, services, appts] = await Promise.all([
    api("/api/locations"),
    api("/api/barbers"),
    api("/api/services"),
    api("/api/appointments")
  ]);
  document.getElementById("kpiLocations").textContent = locations.length;
  document.getElementById("kpiBarbers").textContent = barbers.length;
  document.getElementById("kpiAppts").textContent = appts.length;

  const tbody = document.querySelector("#apptTable tbody");
  tbody.innerHTML = "";
  appts.forEach(a=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(a.start_time).toLocaleString()}</td>
      <td>${a.location}</td>
      <td>${a.barber}</td>
      <td>${a.client}</td>
      <td>${a.service}</td>
      <td><span class="badge">${a.status}</span></td>
      <td>${money(a.total_cents)}</td>
    `;
    tbody.appendChild(tr);
  });

  const locationSel = document.getElementById("locationSel");
  const barberSel = document.getElementById("barberSel");
  const serviceSel = document.getElementById("serviceSel");

  locationSel.innerHTML = locations.map(l=>`<option value="${l.id}">${l.name}</option>`).join("");
  serviceSel.innerHTML = services.filter(s=>s.active).map(s=>`<option value="${s.id}">${s.name} (${s.duration_min}m • ${money(s.price_cents)})</option>`).join("");
  barberSel.innerHTML = barbers.filter(b=>b.active).map(b=>`<option value="${b.id}">${b.full_name}</option>`).join("");

  const now = new Date();
  const from = new Date(now.getTime() - 6*24*60*60*1000);
  document.getElementById("fromDate").valueAsDate = from;
  document.getElementById("toDate").valueAsDate = now;
}

loginForm?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  setMsg(loginMsg, "Logging in...");
  try{
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const r = await api("/api/auth/login", { method:"POST", body: JSON.stringify({ email, password }) });
    localStorage.setItem(tokenKey, r.token);
    setMsg(loginMsg, "✅ Logged in.");
    showDash(true);
    await loadDash();
  }catch(err){
    setMsg(loginMsg, "❌ "+err.message, false);
  }
});

logoutBtn?.addEventListener("click", ()=>{
  localStorage.removeItem(tokenKey);
  showDash(false);
  setMsg(loginMsg, "Logged out.");
});

(async function init(){
  const token = localStorage.getItem(tokenKey);
  if (token){
    showDash(true);
    try{ await loadDash(); }
    catch(e){ localStorage.removeItem(tokenKey); showDash(false); }
  }
})();

document.getElementById("createApptForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const createMsg = document.getElementById("createMsg");
  setMsg(createMsg, "Creating booking...");
  try{
    const location_id = Number(document.getElementById("locationSel").value);
    const barber_id = Number(document.getElementById("barberSel").value);
    const service_id = Number(document.getElementById("serviceSel").value);
    const start_time_local = document.getElementById("startTime").value;
    const start_time = new Date(start_time_local).toISOString();

    const client = {
      full_name: document.getElementById("clientName").value.trim(),
      phone: document.getElementById("clientPhone").value.trim(),
      email: document.getElementById("clientEmail").value.trim(),
      notes: document.getElementById("clientNotes").value.trim()
    };

    const r = await api("/api/appointments", {
      method:"POST",
      body: JSON.stringify({ location_id, barber_id, service_id, start_time, client })
    });
    setMsg(createMsg, "✅ Booking created (ID "+r.id+").");
    await loadDash();
  }catch(err){
    setMsg(createMsg, "❌ "+err.message, false);
  }
});

document.getElementById("reportForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const reportMsg = document.getElementById("reportMsg");
  setMsg(reportMsg, "Running report...");
  try{
    const from = document.getElementById("fromDate").value;
    const to = document.getElementById("toDate").value;
    const r = await api(`/api/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    const tbody = document.querySelector("#reportTable tbody");
    tbody.innerHTML = "";
    r.by_location.forEach(x=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${x.location}</td><td>${x.bookings||0}</td><td>${money(x.revenue_cents||0)}</td>`;
      tbody.appendChild(tr);
    });
    document.getElementById("totalBookings").textContent = r.totals.bookings;
    document.getElementById("totalRevenue").textContent = money(r.totals.revenue_cents);
    setMsg(reportMsg, "✅ Done.");
  }catch(err){
    setMsg(reportMsg, "❌ "+err.message, false);
  }
});
