import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { openDb, get, close } from '../db/db.js';

export const authRouter = express.Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const db = openDb();
  try {
    const user = await get(db, "SELECT id, email, password_hash, role FROM users WHERE email = ?", [email]);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const secret = process.env.JWT_SECRET || 'dev_secret';
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, { expiresIn: '8h' });
    return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } finally {
    await close(db);
  }
});
