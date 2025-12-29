import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { openDb, run, close, get } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const db = openDb();

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await run(db, stmt + ';');
  }

  const clears = [
    "DELETE FROM appointments",
    "DELETE FROM barber_locations",
    "DELETE FROM barbers",
    "DELETE FROM clients",
    "DELETE FROM services",
    "DELETE FROM locations",
    "DELETE FROM users"
  ];
  for (const c of clears) await run(db, c);

  const passwordHash = bcrypt.hashSync('Admin123!', 10);
  await run(db, "INSERT INTO users(email,password_hash,role) VALUES (?,?,?)", [
    "admin@demo.com", passwordHash, "admin"
  ]);

  const locations = [
    ["Barber & Co — Queen West", "Toronto", "ON", "123 Queen St W", "+1 416-555-0101"],
    ["Barber & Co — Square One", "Mississauga", "ON", "100 City Centre Dr", "+1 905-555-0110"],
    ["Barber & Co — Bramalea", "Brampton", "ON", "25 Peel Centre Dr", "+1 905-555-0120"]
  ];
  for (const l of locations) {
    await run(db, "INSERT INTO locations(name,city,province,address,phone) VALUES (?,?,?,?,?)", l);
  }

  const services = [
    ["Haircut", 30, 3500],
    ["Haircut + Beard", 45, 5000],
    ["Beard Trim", 20, 2500],
    ["Line-up", 15, 1500]
  ];
  for (const s of services) {
    await run(db, "INSERT INTO services(name,duration_min,price_cents) VALUES (?,?,?)", s);
  }

  const barbers = [
    ["Jordan Blake", "+1 416-555-0201", "jordan@demo.com"],
    ["Malik Grant", "+1 416-555-0202", "malik@demo.com"],
    ["Ethan Chen", "+1 416-555-0203", "ethan@demo.com"],
    ["Aaliyah Reid", "+1 416-555-0204", "aaliyah@demo.com"]
  ];
  for (const b of barbers) {
    await run(db, "INSERT INTO barbers(full_name,phone,email) VALUES (?,?,?)", b);
  }

  const assigns = [[1,1],[2,1],[2,2],[3,2],[4,3]];
  for (const a of assigns) {
    await run(db, "INSERT INTO barber_locations(barber_id,location_id) VALUES (?,?)", a);
  }

  const clients = [
    ["Noah Williams", "+1 416-555-0301", "noah@example.com", "Prefers low fade."],
    ["Liam Johnson", "+1 416-555-0302", "liam@example.com", "Beard sensitive skin."],
    ["Emma Brown", "+1 905-555-0303", "emma@example.com", "Usually books for partner."],
    ["Olivia Smith", "+1 905-555-0304", "olivia@example.com", "Likes lineup weekly."]
  ];
  for (const c of clients) {
    await run(db, "INSERT INTO clients(full_name,phone,email,notes) VALUES (?,?,?,?)", c);
  }

  const now = new Date();
  function iso(dt){ return dt.toISOString(); }
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 0, 0)); // ~1pm Toronto winter-ish
  const appts = [
    [1,1,1,1, iso(today), iso(new Date(today.getTime()+30*60000)), "booked", 500, 3500],
    [2,3,2,2, iso(new Date(today.getTime()+60*60000)), iso(new Date(today.getTime()+105*60000)), "booked", 1000, 5000],
    [3,4,4,4, iso(new Date(today.getTime()+120*60000)), iso(new Date(today.getTime()+135*60000)), "booked", 0, 1500]
  ];
  for (const a of appts) {
    await run(db, `INSERT INTO appointments(location_id,barber_id,client_id,service_id,start_time,end_time,status,deposit_cents,total_cents)
                  VALUES (?,?,?,?,?,?,?,?,?)`, a);
  }

  await close(db);
  console.log("✅ Seed complete. Demo admin: admin@demo.com / Admin123!");
}

main().catch(e => { console.error(e); process.exit(1); });
