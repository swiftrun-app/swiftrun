-- SwiftRun v2.2.0 migration: support queries + live runner location.
-- Applied to the live D1 database via the Cloudflare D1 query API on 2026-09-24.
-- (D1 query calls accept one statement at a time; run each statement separately.)

ALTER TABLE runners ADD COLUMN lat REAL;
ALTER TABLE runners ADD COLUMN lng REAL;
ALTER TABLE runners ADD COLUMN location_updated_at TEXT;
ALTER TABLE runners ADD COLUMN is_online INTEGER NOT NULL DEFAULT 0;

CREATE TABLE queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_queries_user ON queries(user_id);
CREATE INDEX idx_queries_status ON queries(status);
