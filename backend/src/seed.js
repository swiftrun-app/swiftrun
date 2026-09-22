// SwiftRun v2 - seed script.
// Usage: node src/seed.js            (skips if data already exists)
//        node src/seed.js --reset     (wipes all tables and reseeds)

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from './db.js';

const RESET = process.argv.includes('--reset');

if (RESET) {
  console.log('Reset flag set: wiping all data.');
  db.exec('DELETE FROM reviews; DELETE FROM bookings; DELETE FROM services; DELETE FROM runners; DELETE FROM users; DELETE FROM zones;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users','runners','services','bookings','reviews','zones');");
} else {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) {
    console.log(`Database already has ${count} user(s). Skipping seed (use --reset to reseed).`);
    process.exit(0);
  }
}

const hash = (pw) => bcrypt.hashSync(pw, 10);

// ---------- zones (Gaborone) ----------
const ZONES = [
  { name: 'CBD / Main Mall', color: '#EAB308', demand: 95, base_price: 35 },
  { name: 'Game City', color: '#22C55E', demand: 88, base_price: 30 },
  { name: 'Airport Junction', color: '#3B82F6', demand: 82, base_price: 30 },
  { name: 'Riverwalk', color: '#A855F7', demand: 76, base_price: 30 },
  { name: 'Broadhurst', color: '#F97316', demand: 68, base_price: 28 },
  { name: 'Phakalane', color: '#14B8A6', demand: 61, base_price: 35 },
  { name: 'Extension 9', color: '#EC4899', demand: 55, base_price: 25 },
  { name: 'Mogoditshane', color: '#64748B', demand: 47, base_price: 25 },
];
const zoneStmt = db.prepare('INSERT INTO zones (name, color, demand, base_price) VALUES (?, ?, ?, ?)');
for (const z of ZONES) zoneStmt.run(z.name, z.color, z.demand, z.base_price);

// ---------- runners ----------
const RUNNERS = [
  { name: 'Portia S.', phone: '72111111', vehicle: 'Honda Fit', zone: 'CBD / Main Mall', rating: 4.9, runs: 214, verified: 1 },
  { name: 'Lebo K.', phone: '72222222', vehicle: 'Toyota Corolla', zone: 'Game City', rating: 4.8, runs: 189, verified: 1 },
  { name: 'Tshepo M.', phone: '72333333', vehicle: 'Motorbike', zone: 'Broadhurst', rating: 4.7, runs: 156, verified: 1 },
  { name: 'Boitumelo R.', phone: '72444444', vehicle: 'VW Polo', zone: 'Phakalane', rating: 4.9, runs: 201, verified: 1 },
  { name: 'Bakang M.', phone: '72555555', vehicle: 'Bicycle', zone: 'Extension 9', rating: 4.6, runs: 98, verified: 1 },
  { name: 'Mpho T.', phone: '72666666', vehicle: 'Nissan NP200', zone: 'Airport Junction', rating: 4.8, runs: 143, verified: 1 },
  { name: 'Kago S.', phone: '72777777', vehicle: 'Scooter', zone: 'Riverwalk', rating: 4.5, runs: 87, verified: 1 },
  { name: 'Dineo S.', phone: '72888888', vehicle: 'Toyota Vitz', zone: 'Mogoditshane', rating: 4.7, runs: 112, verified: 1 },
  { name: 'Onalenna P.', phone: '72999999', vehicle: 'Honda Fit', zone: 'CBD / Main Mall', rating: 4.4, runs: 64, verified: 1 },
  { name: 'Katlego D.', phone: '72000001', vehicle: 'Motorbike', zone: 'Game City', rating: 4.8, runs: 176, verified: 1 },
];

const userStmt = db.prepare('INSERT INTO users (name, phone, password_hash, role) VALUES (?, ?, ?, ?)');
const runnerStmt = db.prepare(
  'INSERT INTO runners (user_id, display_name, vehicle, zone, rating, runs_completed, verified) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const runnerIds = [];
for (const r of RUNNERS) {
  const info = userStmt.run(r.name, r.phone, hash('runner1234'), 'runner');
  const rr = runnerStmt.run(info.lastInsertRowid, r.name, r.vehicle, r.zone, r.rating, r.runs, r.verified);
  runnerIds.push(Number(rr.lastInsertRowid));
}

// ---------- services ----------
const SERVICES = [
  { runner: 0, title: 'CBD lunch rush delivery', category: 'food', description: 'Hot lunch pickup from Main Mall eateries to your office. 30-45 min.', price_pula: 35, unit: 'per trip' },
  { runner: 0, title: 'Document drop: offices in CBD', category: 'documents', description: 'Same-day document delivery between offices around the CBD and Main Mall.', price_pula: 40, unit: 'per trip' },
  { runner: 1, title: 'Game City grocery run', category: 'groceries', description: 'Pick n Pay / Spar grocery list shopping and delivery. You pay for the groceries.', price_pula: 45, unit: 'per trip' },
  { runner: 1, title: 'Parcel pickup and drop', category: 'parcels', description: 'Small parcels up to 10kg anywhere in Gaborone. Courier shops included.', price_pula: 50, unit: 'per parcel' },
  { runner: 2, title: 'Fast motorbike errands', category: 'errands', description: 'Beat the traffic: quick errands on motorbike across Broadhurst and surrounds.', price_pula: 30, unit: 'per trip' },
  { runner: 3, title: 'Phakalane premium concierge', category: 'shopping', description: 'Personal shopping and errands in Phakalane and Golf Estate area.', price_pula: 60, unit: 'per hour' },
  { runner: 4, title: 'Budget bicycle courier', category: 'documents', description: 'Eco-friendly bicycle courier for envelopes and small items in Extension 9.', price_pula: 25, unit: 'per trip' },
  { runner: 5, title: 'Bakkie loads and furniture', category: 'parcels', description: 'NP200 bakkie for bulky items, small moves and furniture within Gaborone.', price_pula: 120, unit: 'per trip' },
  { runner: 6, title: 'Riverwalk food dash', category: 'food', description: 'Restaurant and takeaway pickup around Riverwalk and Village.', price_pula: 30, unit: 'per trip' },
  { runner: 7, title: 'Mogoditshane weekly groceries', category: 'groceries', description: 'Weekly grocery shopping run with list, packed and delivered to your door.', price_pula: 40, unit: 'per trip' },
  { runner: 8, title: 'After-hours errands', category: 'errands', description: 'Evening and weekend errands: pharmacy, airtime, bill payments.', price_pula: 35, unit: 'per trip' },
  { runner: 9, title: 'Express parcel relay', category: 'parcels', description: 'Same-day express parcels between Game City and Airport Junction corridor.', price_pula: 55, unit: 'per parcel' },
  { runner: 2, title: 'Airport pickup: small items', category: 'errands', description: 'Collect small items and documents from Sir Seretse Khama airport area.', price_pula: 65, unit: 'per trip' },
  { runner: 5, title: 'Monthly office supplies run', category: 'shopping', description: 'Scheduled monthly run for office supplies and consumables.', price_pula: 80, unit: 'per trip' },
];
const svcStmt = db.prepare(
  'INSERT INTO services (runner_id, title, category, description, price_pula, unit) VALUES (?, ?, ?, ?, ?, ?)'
);
const serviceIds = [];
for (const s of SERVICES) {
  const info = svcStmt.run(runnerIds[s.runner], s.title, s.category, s.description, s.price_pula, s.unit);
  serviceIds.push(Number(info.lastInsertRowid));
}

// ---------- demo customer ----------
const demoInfo = userStmt.run('Demo Customer', '72170000', hash('demo1234'), 'customer');
const demoId = Number(demoInfo.lastInsertRowid);

// ---------- sample bookings + reviews ----------
const bookingStmt = db.prepare(
  `INSERT INTO bookings (customer_id, service_id, runner_id, pickup, dropoff, scheduled_for, price_pula, status, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'), datetime('now', '-1 day'))`
);
// Delivered booking (with review).
const b1 = bookingStmt.run(demoId, serviceIds[0], runnerIds[0], 'Main Mall, KFC entrance', 'CBD, iTowers 4th floor', null, 35, 'delivered');
const reviewStmt = db.prepare(
  'INSERT INTO reviews (booking_id, reviewer_id, runner_id, rating, comment) VALUES (?, ?, ?, ?, ?)'
);
reviewStmt.run(Number(b1.lastInsertRowid), demoId, runnerIds[0], 5, 'Super fast, food still hot. Highly recommended!');
// Recompute Portia's aggregate rating from the review (matches live API behavior).
{
  const agg = db.prepare('SELECT AVG(rating) AS a FROM reviews WHERE runner_id = ?').get(runnerIds[0]);
  db.prepare('UPDATE runners SET rating = ROUND(?, 1), runs_completed = runs_completed + 1 WHERE id = ?')
    .run(agg.a, runnerIds[0]);
}
// Accepted booking in progress.
bookingStmt.run(demoId, serviceIds[2], runnerIds[1], 'Game City, Pick n Pay', 'Broadhurst, Plot 1234', null, 45, 'accepted');
// Pending booking.
bookingStmt.run(demoId, serviceIds[4], runnerIds[2], 'Broadhurst, pharmacy', 'Broadhurst, home', null, 30, 'pending');

console.log('Seed complete:');
console.log(`  zones:    ${ZONES.length}`);
console.log(`  runners:  ${RUNNERS.length}`);
console.log(`  services: ${SERVICES.length}`);
console.log(`  demo customer: phone 72170000 / password demo1234`);
console.log(`  bookings: 3 (1 delivered + reviewed, 1 accepted, 1 pending)`);
