import express from 'express';
import { openDb, all, close } from '../db/db.js';
import { requireAuth } from '../middleware/auth.js';

export const reportsRouter = express.Router();
reportsRouter.use(requireAuth);

reportsRouter.get('/summary', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: "from and to required (YYYY-MM-DD)" });

  const fromDt = new Date(from + "T00:00:00.000Z");
  const toDt = new Date(to + "T23:59:59.999Z");
  if (isNaN(fromDt.getTime()) || isNaN(toDt.getTime())) return res.status(400).json({ error: "Invalid date(s)" });

  const db = openDb();
  try {
    const rows = await all(db, `
      SELECT l.name as location,
             COUNT(CASE WHEN a.status='booked' OR a.status='completed' THEN 1 END) as bookings,
             SUM(CASE WHEN a.status='booked' OR a.status='completed' THEN a.total_cents ELSE 0 END) as revenue_cents
      FROM locations l
      LEFT JOIN appointments a ON a.location_id=l.id
        AND a.start_time BETWEEN ? AND ?
      GROUP BY l.id
      ORDER BY revenue_cents DESC
    `, [fromDt.toISOString(), toDt.toISOString()]);

    const totals = rows.reduce((acc, r) => {
      acc.bookings += Number(r.bookings || 0);
      acc.revenue_cents += Number(r.revenue_cents || 0);
      return acc;
    }, { bookings: 0, revenue_cents: 0 });

    res.json({ from, to, totals, by_location: rows });
  } finally { await close(db); }
});
