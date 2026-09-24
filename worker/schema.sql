-- SwiftRun v2 - D1 schema. Ported from backend/src/db.js.
-- Apply with: wrangler d1 execute swiftrun --remote --file schema.sql
-- (wrangler handles multi-statement files; single prepare().bind() calls
--  in the worker must remain one statement at a time.)

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','runner','admin')),
  suspended INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  demand INTEGER NOT NULL DEFAULT 50 CHECK (demand >= 0 AND demand <= 100),
  base_price REAL NOT NULL DEFAULT 30
);

CREATE TABLE IF NOT EXISTS runners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  vehicle TEXT NOT NULL DEFAULT 'car',
  zone TEXT NOT NULL DEFAULT 'CBD / Main Mall',
  rating REAL NOT NULL DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  runs_completed INTEGER NOT NULL DEFAULT 0 CHECK (runs_completed >= 0),
  verified INTEGER NOT NULL DEFAULT 0,
  lat REAL,
  lng REAL,
  location_updated_at TEXT,
  is_online INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  runner_id INTEGER NOT NULL REFERENCES runners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('errands','food','groceries','documents','parcels','shopping')),
  description TEXT NOT NULL DEFAULT '',
  price_pula REAL NOT NULL CHECK (price_pula > 0),
  unit TEXT NOT NULL DEFAULT 'per trip',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  runner_id INTEGER NOT NULL REFERENCES runners(id) ON DELETE RESTRICT,
  pickup TEXT NOT NULL,
  dropoff TEXT NOT NULL,
  scheduled_for TEXT,
  price_pula REAL NOT NULL CHECK (price_pula > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','en_route','delivered','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  runner_id INTEGER NOT NULL REFERENCES runners(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_services_runner ON services(runner_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_runner ON bookings(runner_id);
CREATE INDEX IF NOT EXISTS idx_reviews_runner ON reviews(runner_id);

CREATE TABLE IF NOT EXISTS queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_queries_user ON queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);
