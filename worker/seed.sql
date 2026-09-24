-- SwiftRun v2 - demo seed data for D1. Mirrors backend/src/seed.js exactly.
-- Apply with: wrangler d1 execute swiftrun --remote --file seed.sql
--
-- DEMO CREDENTIALS (demo-mode launch only):
--   admin:  72170001 / admin1234
--   runner: 72111111 / runner1234
--   demo:   72170000 / demo1234
-- Passwords below are bcrypt hashes (cost 10). These are demo-only accounts.

-- ---------- zones ----------
INSERT INTO zones (id, name, color, demand, base_price) VALUES
  (1, 'CBD / Main Mall', '#EAB308', 95, 35),
  (2, 'Game City', '#22C55E', 88, 30),
  (3, 'Airport Junction', '#3B82F6', 82, 30),
  (4, 'Riverwalk', '#A855F7', 76, 30),
  (5, 'Broadhurst', '#F97316', 68, 28),
  (6, 'Phakalane', '#14B8A6', 61, 35),
  (7, 'Extension 9', '#EC4899', 55, 25),
  (8, 'Mogoditshane', '#64748B', 47, 25);

-- ---------- users ----------
-- admin user (id 1)
INSERT INTO users (id, name, phone, password_hash, role) VALUES
  (1, 'SwiftRun Admin', '72170001', '$2b$10$tB5nlfzmyzrzSlZDNrXoHuUF9FoBwhBO2GkRqrRlZPEh3FvyM3t7S', 'admin');
-- runner users (ids 2-11)
INSERT INTO users (id, name, phone, password_hash, role) VALUES
  (2, 'Portia S.', '72111111', '$2b$10$2UyaqdHv7r.8kQF7TQ.lNeMmg3dctL1oCzL7kNT0FrxRtCFFaB.1y', 'runner'),
  (3, 'Lebo K.', '72222222', '$2b$10$2UyaqdHv7r.8kQF7TQ.lNeMmg3dctL1oCzL7kNT0FrxRtCFFaB.1y', 'runner'),
  (4, 'Tshepo M.', '72333333', '$2b$10$2UyaqdHv7r.8kQF7TQ.lNeMmg3dctL1oCzL7kNT0FrxRtCFFaB.1y', 'runner'),
  (5, 'Boitumelo R.', '72444444', '$2b$10$2UyaqdHv7r.8kQF7TQ.lNeMmg3dctL1oCzL7kNT0FrxRtCFFaB.1y', 'runner'),
  (6, 'Bakang M.', '72555555', '$2b$10$2UyaqdHv7r.8kQF7TQ.lNeMmg3dctL1oCzL7kNT0FrxRtCFFaB.1y', 'runner'),
  (7, 'Mpho T.', '72666666', '$2b$10$2UyaqdHv7r.8kQF7TQ.lNeMmg3dctL1oCzL7kNT0FrxRtCFFaB.1y', 'runner'),
  (8, 'Kago S.', '72777777', '$2b$10$2UyaqdHv7r.8kQF7TQ.lNeMmg3dctL1oCzL7kNT0FrxRtCFFaB.1y', 'runner'),
  (9, 'Dineo S.', '72888888', '$2b$10$2UyaqdHv7r.8kQF7TQ.lNeMmg3dctL1oCzL7kNT0FrxRtCFFaB.1y', 'runner'),
  (10, 'Onalenna P.', '72999999', '$2b$10$2UyaqdHv7r.8kQF7TQ.lNeMmg3dctL1oCzL7kNT0FrxRtCFFaB.1y', 'runner'),
  (11, 'Katlego D.', '72000001', '$2b$10$2UyaqdHv7r.8kQF7TQ.lNeMmg3dctL1oCzL7kNT0FrxRtCFFaB.1y', 'runner');
-- demo customer (id 12)
INSERT INTO users (id, name, phone, password_hash, role) VALUES
  (12, 'Demo Customer', '72170000', '$2b$10$ko54Ekrw3MgJL3yAWhUIqef/FjvWzEk9pbSCoWzX32Gn8zbJjvR6q', 'customer');

-- ---------- runners ----------
-- Portia's rating recomputed as her review average (5.0) and runs_completed
-- incremented by 1 (214 -> 215), matching seed.js live behavior.
INSERT INTO runners (id, user_id, display_name, vehicle, zone, rating, runs_completed, verified) VALUES
  (1, 2, 'Portia S.', 'Honda Fit', 'CBD / Main Mall', 5.0, 215, 1),
  (2, 3, 'Lebo K.', 'Toyota Corolla', 'Game City', 4.8, 189, 1),
  (3, 4, 'Tshepo M.', 'Motorbike', 'Broadhurst', 4.7, 156, 1),
  (4, 5, 'Boitumelo R.', 'VW Polo', 'Phakalane', 4.9, 201, 1),
  (5, 6, 'Bakang M.', 'Bicycle', 'Extension 9', 4.6, 98, 1),
  (6, 7, 'Mpho T.', 'Nissan NP200', 'Airport Junction', 4.8, 143, 1),
  (7, 8, 'Kago S.', 'Scooter', 'Riverwalk', 4.5, 87, 1),
  (8, 9, 'Dineo S.', 'Toyota Vitz', 'Mogoditshane', 4.7, 112, 1),
  (9, 10, 'Onalenna P.', 'Honda Fit', 'CBD / Main Mall', 4.4, 64, 1),
  (10, 11, 'Katlego D.', 'Motorbike', 'Game City', 4.8, 176, 1);

-- ---------- services ----------
INSERT INTO services (id, runner_id, title, category, description, price_pula, unit) VALUES
  (1, 1, 'CBD lunch rush delivery', 'food', 'Hot lunch pickup from Main Mall eateries to your office. 30-45 min.', 35, 'per trip'),
  (2, 1, 'Document drop: offices in CBD', 'documents', 'Same-day document delivery between offices around the CBD and Main Mall.', 40, 'per trip'),
  (3, 2, 'Game City grocery run', 'groceries', 'Pick n Pay / Spar grocery list shopping and delivery. You pay for the groceries.', 45, 'per trip'),
  (4, 2, 'Parcel pickup and drop', 'parcels', 'Small parcels up to 10kg anywhere in Gaborone. Courier shops included.', 50, 'per parcel'),
  (5, 3, 'Fast motorbike errands', 'errands', 'Beat the traffic: quick errands on motorbike across Broadhurst and surrounds.', 30, 'per trip'),
  (6, 4, 'Phakalane premium concierge', 'shopping', 'Personal shopping and errands in Phakalane and Golf Estate area.', 60, 'per hour'),
  (7, 5, 'Budget bicycle courier', 'documents', 'Eco-friendly bicycle courier for envelopes and small items in Extension 9.', 25, 'per trip'),
  (8, 6, 'Bakkie loads and furniture', 'parcels', 'NP200 bakkie for bulky items, small moves and furniture within Gaborone.', 120, 'per trip'),
  (9, 7, 'Riverwalk food dash', 'food', 'Restaurant and takeaway pickup around Riverwalk and Village.', 30, 'per trip'),
  (10, 8, 'Mogoditshane weekly groceries', 'groceries', 'Weekly grocery shopping run with list, packed and delivered to your door.', 40, 'per trip'),
  (11, 9, 'After-hours errands', 'errands', 'Evening and weekend errands: pharmacy, airtime, bill payments.', 35, 'per trip'),
  (12, 10, 'Express parcel relay', 'parcels', 'Same-day express parcels between Game City and Airport Junction corridor.', 55, 'per parcel'),
  (13, 3, 'Airport pickup: small items', 'errands', 'Collect small items and documents from Sir Seretse Khama airport area.', 65, 'per trip'),
  (14, 6, 'Monthly office supplies run', 'shopping', 'Scheduled monthly run for office supplies and consumables.', 80, 'per trip');

-- ---------- bookings ----------
INSERT INTO bookings (id, customer_id, service_id, runner_id, pickup, dropoff, scheduled_for, price_pula, status, created_at, updated_at) VALUES
  (1, 12, 1, 1, 'Main Mall, KFC entrance', 'CBD, iTowers 4th floor', NULL, 35, 'delivered', datetime('now', '-2 days'), datetime('now', '-1 day')),
  (2, 12, 3, 2, 'Game City, Pick n Pay', 'Broadhurst, Plot 1234', NULL, 45, 'accepted', datetime('now', '-2 days'), datetime('now', '-1 day')),
  (3, 12, 5, 3, 'Broadhurst, pharmacy', 'Broadhurst, home', NULL, 30, 'pending', datetime('now', '-2 days'), datetime('now', '-1 day'));

-- ---------- reviews ----------
INSERT INTO reviews (id, booking_id, reviewer_id, runner_id, rating, comment) VALUES
  (1, 1, 12, 1, 5, 'Super fast, food still hot. Highly recommended!');
