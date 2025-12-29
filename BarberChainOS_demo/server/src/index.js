import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { dataRouter } from './routes/data.js';
import { reportsRouter } from './routes/reports.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ ok: true, name: "BarberChainOS Demo" }));
app.use('/api/auth', authRouter);
app.use('/api', dataRouter);
app.use('/api/reports', reportsRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ API listening on http://localhost:${port}`));
