# BarberChainOS (Demo) — Multi-location Barbershop Web + Database System

A minimal, runnable demo tailored for **Canadian multi-location barbershops (3–15 locations)**.

## What this demo includes
- Multi-location support (Locations)
- Barbers (staff) with per-location assignment
- Services & pricing
- Clients (CRM-lite)
- Appointments (create/list/cancel)
- Basic reporting (bookings by day, revenue by location)
- Simple Admin login (demo JWT)

## Tech
- Backend: Node.js + Express + SQLite (file DB)
- Frontend: Vanilla HTML/CSS/JS (no build tools)

## Quick start
### 1) Backend
```bash
cd server
npm install
npm run seed
npm start
```
Server runs at: http://localhost:3000

### 2) Frontend
Open `client/index.html` in your browser (double click), or serve it:
```bash
cd client
npx serve .
```

## Demo credentials
- Email: admin@demo.com
- Password: Admin123!

## Notes (what you'd build next for production)
- Stripe deposits / cancellation fees
- SMS/WhatsApp reminders
- Client history + preferences, notes
- Loyalty tiers and memberships
- Role-based access (owner/manager/receptionist/barber)
- Multi-branch analytics dashboards
- Audit logs + exports for accounting
