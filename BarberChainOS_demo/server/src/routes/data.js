import express from 'express';
import { openDb, all, run, get, close } from '../db/db.js';
import { requireAuth } from '../middleware/auth.js';

export const dataRouter = express.Router();

// Public endpoints (for booking page)
dataRouter.get('/public/locations', async (req, res) => {
  const db = openDb();
  try {
    const rows = await all(db, "SELECT id, name, city, province FROM locations ORDER BY id");
    res.json(rows);
  } finally { await close(db); }
});

dataRouter.get('/public/services', async (req, res) => {
  const db = openDb();
  try {
    const rows = await all(db, "SELECT id, name, duration_min, price_cents FROM services WHERE active=1 ORDER BY price_cents");
    res.json(rows);
  } finally { await close(db); }
});

dataRouter.get('/public/barbers', async (req, res) => {
  const { location_id } = req.query;
  const db = openDb();
  try {
    const sql = location_id
      ? `SELECT b.id, b.full_name FROM barbers b
         JOIN barber_locations bl ON bl.barber_id=b.id
         WHERE bl.location_id=? AND b.active=1
         ORDER BY b.full_name`
      : `SELECT id, full_name FROM barbers WHERE active=1 ORDER BY full_name`;
    const rows = await all(db, sql, location_id ? [location_id] : []);
    res.json(rows);
  } finally { await close(db); }
});

// Admin endpoints
dataRouter.use(requireAuth);

dataRouter.get('/locations', async (req, res) => {
  const db = openDb();
  try { res.json(await all(db, "SELECT * FROM locations ORDER BY id")); }
  finally { await close(db); }
});

dataRouter.get('/services', async (req, res) => {
  const db = openDb();
  try { res.json(await all(db, "SELECT * FROM services ORDER BY id")); }
  finally { await close(db); }
});

dataRouter.get('/barbers', async (req, res) => {
  const db = openDb();
  try {
    const rows = await all(db, `SELECT b.*, 
      (SELECT group_concat(l.name, ' | ')
       FROM barber_locations bl JOIN locations l ON l.id=bl.location_id
       WHERE bl.barber_id=b.id) as locations
      FROM barbers b ORDER BY b.full_name`);
    res.json(rows);
  } finally { await close(db); }
});

dataRouter.get('/clients', async (req, res) => {
  const db = openDb();
  try { res.json(await all(db, "SELECT * FROM clients ORDER BY created_at DESC")); }
  finally { await close(db); }
});

dataRouter.get('/appointments', async (req, res) => {
  const db = openDb();
  try {
    const rows = await all(db, `
      SELECT a.id, a.start_time, a.end_time, a.status, a.deposit_cents, a.total_cents,
             l.name as location, b.full_name as barber, c.full_name as client, s.name as service
      FROM appointments a
      JOIN locations l ON l.id=a.location_id
      JOIN barbers b ON b.id=a.barber_id
      JOIN clients c ON c.id=a.client_id
      JOIN services s ON s.id=a.service_id
      ORDER BY a.start_time DESC
      LIMIT 200
    `);
    res.json(rows);
  } finally { await close(db); }
});

dataRouter.post('/appointments', async (req, res) => {
  const { location_id, barber_id, client, service_id, start_time } = req.body || {};
  if (!location_id || !barber_id || !service_id || !start_time || !client?.full_name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = openDb();
  try {
    let existing = null;
    if (client.phone) existing = await get(db, "SELECT id FROM clients WHERE phone=?", [client.phone]);
    if (!existing && client.email) existing = await get(db, "SELECT id FROM clients WHERE email=?", [client.email]);

    let client_id = existing?.id;
    if (!client_id) {
      const r = await run(db, "INSERT INTO clients(full_name,phone,email,notes) VALUES (?,?,?,?)",
        [client.full_name, client.phone || null, client.email || null, client.notes || null]);
      client_id = r.id;
    }

    const service = await get(db, "SELECT duration_min, price_cents FROM services WHERE id=?", [service_id]);
    if (!service) return res.status(400).json({ error: "Invalid service" });

    const start = new Date(start_time);
    if (isNaN(start.getTime())) return res.status(400).json({ error: "Invalid start_time" });

    const end = new Date(start.getTime() + service.duration_min * 60000);

    const conflict = await get(db, `
      SELECT id FROM appointments
      WHERE barber_id=? AND status='booked'
      AND NOT (end_time <= ? OR start_time >= ?)
    `, [barber_id, start.toISOString(), end.toISOString()]);
    if (conflict) return res.status(409).json({ error: "Time conflict for this barber" });

    const deposit = Math.round(service.price_cents * 0.2);
    const total = service.price_cents;

    const r = await run(db, `
      INSERT INTO appointments(location_id,barber_id,client_id,service_id,start_time,end_time,status,deposit_cents,total_cents)
      VALUES (?,?,?,?,?,?,?,?,?)
    `, [location_id, barber_id, client_id, service_id, start.toISOString(), end.toISOString(), "booked", deposit, total]);

    res.json({ id: r.id });
  } finally { await close(db); }
});

dataRouter.post('/appointments/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const db = openDb();
  try {
    await run(db, "UPDATE appointments SET status='cancelled' WHERE id=?", [id]);
    res.json({ ok: true });
  } finally { await close(db); }
});
