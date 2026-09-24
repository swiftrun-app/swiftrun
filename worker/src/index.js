// SwiftRun v2 - Cloudflare Worker API (Hono + D1).
// Ported from backend/src/server.js (Express + better-sqlite3).
// Prices in Pula (P). All inputs validated with zod. All SQL via bound
// parameters. One statement per prepare().bind() call; multi-statement
// transactions use env.DB.batch([...]).

import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// ---------- zod validation schemas (copied from backend/src/validation.js) ----------
// Botswana mobile numbers: 7 or 8 digits, starting with 7 (e.g. 72123456).
const phoneSchema = z
  .string()
  .trim()
  .regex(/^7\d{6,7}$/, 'Phone must be a Botswana mobile number: 7 or 8 digits starting with 7.');

const nameSchema = z.string().trim().min(1, 'Name is required.').max(100);

const registerSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  password: z.string().min(6, 'Password must be at least 6 characters.').max(128),
  role: z.enum(['customer', 'runner']).default('customer'),
});

const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required.'),
});

const bookingCreateSchema = z.object({
  service_id: z.number().int().positive(),
  pickup: z.string().trim().min(1, 'Pickup location is required.').max(200),
  dropoff: z.string().trim().min(1, 'Dropoff location is required.').max(200),
  scheduled_for: z
    .string()
    .trim()
    .optional()
    .refine((v) => v === undefined || v === '' || !Number.isNaN(Date.parse(v)), {
      message: 'scheduled_for must be a valid ISO date string.',
    }),
});

const bookingStatusSchema = z.object({
  status: z.enum(['accepted', 'en_route', 'delivered', 'cancelled']),
});

// Runner status advances: accepted -> en_route -> delivered (no skips, no cancels).
const bookingStatusAdvanceSchema = z.object({
  status: z.enum(['en_route', 'delivered']),
});

const adminUserUpdateSchema = z.object({
  role: z.enum(['customer', 'runner', 'admin']).optional(),
  verified: z.boolean().optional(),
  suspended: z.boolean().optional(),
});

const reviewCreateSchema = z.object({
  booking_id: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).default(''),
});

const runnerQuerySchema = z.object({
  zone: z.string().trim().max(100).optional(),
  min_rating: z.coerce.number().min(0).max(5).optional(),
});

const serviceQuerySchema = z.object({
  category: z.enum(['errands', 'food', 'groceries', 'documents', 'parcels', 'shopping']).optional(),
  zone: z.string().trim().max(100).optional(),
  q: z.string().trim().max(100).optional(),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ---------- helpers ----------
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getSecret(env) {
  if (env.JWT_SECRET) return env.JWT_SECRET;
  // Local/dev fallback only. Production sets JWT_SECRET via `wrangler secret put`.
  return 'dev-only-secret-do-not-use-in-production';
}

function safeUser(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, phone: row.phone, role: row.role, created_at: row.created_at };
}

function adminSafeUser(row, verified) {
  if (!row) return null;
  const user = { ...safeUser(row), suspended: Boolean(row.suspended) };
  if (row.role === 'runner') {
    user.verified = Boolean(verified);
  }
  return user;
}

// Status machine: which role may move a booking from -> to.
//   pending -> accepted | cancelled
//   accepted -> en_route | cancelled
//   en_route -> delivered
//   delivered, cancelled are terminal.
const TRANSITIONS = {
  customer: { pending: ['cancelled'], accepted: ['cancelled'] },
  runner: { pending: ['accepted'], accepted: ['en_route'], en_route: ['delivered'] },
  admin: {
    pending: ['accepted', 'cancelled'],
    accepted: ['en_route', 'cancelled'],
    en_route: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  },
};

// Shared enriched booking SELECT: bookings + service title/category + runner
// display name + customer name.
const ENRICHED_BOOKING_SQL = `
  SELECT b.*, s.title AS service_title, s.category AS service_category,
         r.display_name AS runner_name, u.name AS customer_name
  FROM bookings b
  JOIN services s ON s.id = b.service_id
  JOIN runners r ON r.id = b.runner_id
  JOIN users u ON u.id = b.customer_id`;

async function runnerIdForUser(db, userId) {
  const row = await db.prepare('SELECT id FROM runners WHERE user_id = ?').bind(userId).first();
  return row ? row.id : null;
}

async function signToken(env, user) {
  return sign(
    {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    },
    getSecret(env),
    'HS256'
  );
}

// 100kb JSON body limit (mirrors express.json({ limit: '100kb' })).
async function parseJsonBody(c) {
  const raw = await c.req.text();
  if (new TextEncoder().encode(raw).length > 100 * 1024) {
    throw new AppError(400, 'Invalid request body.');
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError(400, 'Invalid request body.');
  }
}

// ---------- app ----------
const app = new Hono();

// CORS: allow origin from env (default *), methods GET/POST/PATCH/OPTIONS.
app.use('*', async (c, next) => {
  const origin = c.env.CORS_ORIGIN || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  await next();
  for (const [k, v] of Object.entries(corsHeaders)) c.header(k, v);
});

// In-memory sliding-window rate limiting (per IP).
//   /api/auth/* : 20 per 15 min (stricter)
//   other /api  : 300 per 15 min
const buckets = new Map();
function checkLimit(key, limit, windowMs) {
  const now = Date.now();
  let hits = buckets.get(key) || [];
  hits = hits.filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

app.use('/api/*', async (c, next) => {
  const pathname = new URL(c.req.url).pathname;
  const isAuth = pathname.startsWith('/api/auth');
  const ip =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for') ||
    'unknown';
  const key = `${isAuth ? 'auth' : 'api'}:${ip}`;
  const ok = checkLimit(key, isAuth ? 20 : 300, 15 * 60 * 1000);
  if (!ok) {
    return c.json(
      { error: isAuth ? 'Too many attempts. Please try again later.' : 'Too many requests. Please try again later.' },
      429
    );
  }
  await next();
});

// ---------- auth middleware ----------
async function requireAuth(c, next) {
  const header = c.req.header('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return c.json({ error: 'Authentication required.' }, 401);
  }
  try {
    const payload = await verify(token, getSecret(c.env), 'HS256');
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token.' }, 401);
  }
}

function requireRole(...roles) {
  return async (c, next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'You do not have permission for this action.' }, 403);
    }
    await next();
  };
}

// ---------- routes ----------
app.get('/api/health', (c) => {
  return c.json({ ok: true, version: '2.1.0', time: new Date().toISOString() });
});

// ----- auth -----
app.post('/api/auth/register', async (c) => {
  const db = c.env.DB;
  const { name, phone, password, role } = registerSchema.parse(await parseJsonBody(c));
  const existing = await db.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).first();
  if (existing) throw new AppError(409, 'Phone number is already registered.');

  const hash = bcrypt.hashSync(password, 10);
  const info = await db
    .prepare('INSERT INTO users (name, phone, password_hash, role) VALUES (?, ?, ?, ?)')
    .bind(name, phone, hash, role)
    .run();
  const user = safeUser(
    await db.prepare('SELECT * FROM users WHERE id = ?').bind(info.meta.last_row_id).first()
  );

  // Runners get a runner profile immediately (unverified until reviewed).
  if (role === 'runner') {
    await db
      .prepare(
        `INSERT INTO runners (user_id, display_name, vehicle, zone, rating, runs_completed, verified)
         VALUES (?, ?, 'car', 'CBD / Main Mall', 5.0, 0, 0)`
      )
      .bind(user.id, name)
      .run();
  }

  return c.json({ token: await signToken(c.env, user), user }, 201);
});

app.post('/api/auth/login', async (c) => {
  const db = c.env.DB;
  const { phone, password } = loginSchema.parse(await parseJsonBody(c));
  const row = await db.prepare('SELECT * FROM users WHERE phone = ?').bind(phone).first();
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    throw new AppError(401, 'Invalid phone number or password.');
  }
  if (row.suspended) {
    throw new AppError(401, 'Account suspended.');
  }
  const user = safeUser(row);
  return c.json({ token: await signToken(c.env, user), user });
});

// ----- runners -----
app.get('/api/runners', async (c) => {
  const db = c.env.DB;
  const { zone, min_rating } = runnerQuerySchema.parse(c.req.query());
  const conditions = [];
  const params = [];
  if (zone) {
    conditions.push('r.zone = ?');
    params.push(zone);
  }
  if (min_rating !== undefined) {
    conditions.push('COALESCE(rev.avg_rating, r.rating) >= ?');
    params.push(min_rating);
  }
  const rows = await db
    .prepare(
      `SELECT r.id, r.display_name, r.vehicle, r.zone,
              COALESCE(rev.avg_rating, r.rating) AS avg_rating,
              COALESCE(rev.review_count, 0) AS review_count,
              r.runs_completed, r.verified, r.created_at
       FROM runners r
       LEFT JOIN (
         SELECT runner_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
         FROM reviews GROUP BY runner_id
       ) rev ON rev.runner_id = r.id
       ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
       ORDER BY avg_rating DESC, r.runs_completed DESC`
    )
    .bind(...params)
    .all();
  return c.json({ runners: rows.results });
});

// ----- services -----
app.get('/api/services', async (c) => {
  const db = c.env.DB;
  const { category, zone, q } = serviceQuerySchema.parse(c.req.query());
  const conditions = ['s.active = 1'];
  const params = [];
  if (category) {
    conditions.push('s.category = ?');
    params.push(category);
  }
  if (zone) {
    conditions.push('r.zone = ?');
    params.push(zone);
  }
  if (q) {
    conditions.push('(s.title LIKE ? OR s.description LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  const rows = await db
    .prepare(
      `SELECT s.id, s.title, s.category, s.description, s.price_pula, s.unit, s.created_at,
              r.id AS runner_id, r.display_name AS runner_name, r.zone AS runner_zone,
              r.vehicle AS runner_vehicle, r.rating AS runner_rating, r.verified AS runner_verified
       FROM services s
       JOIN runners r ON r.id = s.runner_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY s.created_at DESC`
    )
    .bind(...params)
    .all();
  return c.json({ services: rows.results });
});

app.get('/api/services/:id', async (c) => {
  const db = c.env.DB;
  const { id } = idParamSchema.parse(c.req.param());
  const row = await db
    .prepare(
      `SELECT s.id, s.title, s.category, s.description, s.price_pula, s.unit, s.active, s.created_at,
              r.id AS runner_id, r.display_name AS runner_name, r.zone AS runner_zone,
              r.vehicle AS runner_vehicle, r.rating AS runner_rating, r.verified AS runner_verified
       FROM services s
       JOIN runners r ON r.id = s.runner_id
       WHERE s.id = ?`
    )
    .bind(id)
    .first();
  if (!row) throw new AppError(404, 'Service not found.');
  return c.json({ service: row });
});

// ----- bookings -----
app.post('/api/bookings', requireAuth, requireRole('customer'), async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { service_id, pickup, dropoff, scheduled_for } = bookingCreateSchema.parse(
    await parseJsonBody(c)
  );
  const service = await db
    .prepare('SELECT id, runner_id, price_pula, active FROM services WHERE id = ?')
    .bind(service_id)
    .first();
  if (!service || !service.active) throw new AppError(404, 'Service not found or unavailable.');

  const info = await db
    .prepare(
      `INSERT INTO bookings (customer_id, service_id, runner_id, pickup, dropoff, scheduled_for, price_pula, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
    )
    .bind(user.id, service.id, service.runner_id, pickup, dropoff, scheduled_for || null, service.price_pula)
    .run();

  const booking = await db
    .prepare('SELECT * FROM bookings WHERE id = ?')
    .bind(info.meta.last_row_id)
    .first();
  return c.json({ booking }, 201);
});

app.get('/api/bookings', requireAuth, async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  let rows;
  if (user.role === 'customer') {
    rows = await db
      .prepare(`${ENRICHED_BOOKING_SQL} WHERE b.customer_id = ? ORDER BY b.created_at DESC, b.id DESC`)
      .bind(user.id)
      .all();
  } else if (user.role === 'runner') {
    const rid = await runnerIdForUser(db, user.id);
    rows = rid
      ? await db
          .prepare(`${ENRICHED_BOOKING_SQL} WHERE b.runner_id = ? ORDER BY b.created_at DESC, b.id DESC`)
          .bind(rid)
          .all()
      : { results: [] };
  } else {
    rows = await db
      .prepare(`${ENRICHED_BOOKING_SQL} ORDER BY b.created_at DESC, b.id DESC`)
      .all();
  }
  return c.json({ bookings: rows.results });
});

app.patch('/api/bookings/:id', requireAuth, async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = idParamSchema.parse(c.req.param());
  const { status } = bookingStatusSchema.parse(await parseJsonBody(c));

  const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
  if (!booking) throw new AppError(404, 'Booking not found.');

  // Ownership checks.
  if (user.role === 'customer' && booking.customer_id !== user.id) {
    throw new AppError(403, 'You can only change your own bookings.');
  }
  if (user.role === 'runner') {
    const rid = await runnerIdForUser(db, user.id);
    if (!rid || booking.runner_id !== rid) {
      throw new AppError(403, 'This booking is not assigned to you.');
    }
  }

  const allowed = (TRANSITIONS[user.role] || {})[booking.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(
      409,
      `Cannot move booking from "${booking.status}" to "${status}" as ${user.role}.`
    );
  }

  const stmts = [
    db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(status, id),
  ];
  if (status === 'delivered') {
    stmts.push(
      db.prepare('UPDATE runners SET runs_completed = runs_completed + 1 WHERE id = ?').bind(booking.runner_id)
    );
  }
  await db.batch(stmts);

  const updated = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
  return c.json({ booking: updated });
});

// ----- runner job board -----
// Pending bookings assigned to this runner (enriched shape).
app.get('/api/jobs', requireAuth, requireRole('runner'), async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const rid = await runnerIdForUser(db, user.id);
  if (!rid) throw new AppError(404, 'Runner profile not found.');
  const jobs = await db
    .prepare(
      `${ENRICHED_BOOKING_SQL} WHERE b.runner_id = ? AND b.status = 'pending' ORDER BY b.created_at DESC, b.id DESC`
    )
    .bind(rid)
    .all();
  return c.json({ jobs: jobs.results });
});

// Accept a pending booking assigned to this runner.
app.post('/api/bookings/:id/accept', requireAuth, requireRole('runner'), async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = idParamSchema.parse(c.req.param());
  const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
  if (!booking) throw new AppError(404, 'Booking not found.');
  const rid = await runnerIdForUser(db, user.id);
  if (booking.status !== 'pending' || !rid || booking.runner_id !== rid) {
    throw new AppError(409, 'Only pending bookings assigned to you can be accepted.');
  }
  await db
    .prepare("UPDATE bookings SET status = 'accepted', updated_at = datetime('now') WHERE id = ?")
    .bind(id)
    .run();
  const updated = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
  return c.json({ booking: updated });
});

// Advance a booking: accepted -> en_route -> delivered (no skips).
app.patch('/api/bookings/:id/status', requireAuth, requireRole('runner'), async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = idParamSchema.parse(c.req.param());
  const { status } = bookingStatusAdvanceSchema.parse(await parseJsonBody(c));

  const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
  if (!booking) throw new AppError(404, 'Booking not found.');
  const rid = await runnerIdForUser(db, user.id);
  if (!rid || booking.runner_id !== rid) {
    throw new AppError(403, 'This booking is not assigned to you.');
  }

  const allowed = (TRANSITIONS.runner || {})[booking.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(409, `Cannot move booking from "${booking.status}" to "${status}" as runner.`);
  }

  const stmts = [
    db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(status, id),
  ];
  if (status === 'delivered') {
    stmts.push(
      db.prepare('UPDATE runners SET runs_completed = runs_completed + 1 WHERE id = ?').bind(booking.runner_id)
    );
  }
  await db.batch(stmts);

  const updated = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
  return c.json({ booking: updated });
});

// All bookings for this runner (enriched shape), newest first.
app.get('/api/runner/jobs', requireAuth, requireRole('runner'), async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const rid = await runnerIdForUser(db, user.id);
  const rows = rid
    ? await db
        .prepare(`${ENRICHED_BOOKING_SQL} WHERE b.runner_id = ? ORDER BY b.created_at DESC, b.id DESC`)
        .bind(rid)
        .all()
    : { results: [] };
  return c.json({ bookings: rows.results });
});

// Earnings from delivered bookings for this runner.
app.get('/api/runner/earnings', requireAuth, requireRole('runner'), async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const rid = await runnerIdForUser(db, user.id);
  const rows = rid
    ? await db
        .prepare(
          `SELECT b.id AS booking_id, s.title AS service_title, b.price_pula,
                  b.updated_at AS delivered_at
           FROM bookings b
           JOIN services s ON s.id = b.service_id
           WHERE b.runner_id = ? AND b.status = 'delivered'
           ORDER BY b.updated_at DESC, b.id DESC`
        )
        .bind(rid)
        .all()
    : { results: [] };
  const total = rows.results.reduce((sum, r) => sum + r.price_pula, 0);
  return c.json({
    total_pula: Math.round(total * 100) / 100,
    job_count: rows.results.length,
    earnings: rows.results,
  });
});

// ----- reviews -----
app.post('/api/reviews', requireAuth, requireRole('customer'), async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { booking_id, rating, comment } = reviewCreateSchema.parse(await parseJsonBody(c));
  const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(booking_id).first();
  if (!booking || booking.customer_id !== user.id) {
    throw new AppError(404, 'Booking not found.');
  }
  if (booking.status !== 'delivered') {
    throw new AppError(409, 'You can only review delivered bookings.');
  }
  const existing = await db.prepare('SELECT id FROM reviews WHERE booking_id = ?').bind(booking_id).first();
  if (existing) throw new AppError(409, 'This booking already has a review.');

  const results = await db.batch([
    db
      .prepare('INSERT INTO reviews (booking_id, reviewer_id, runner_id, rating, comment) VALUES (?, ?, ?, ?, ?)')
      .bind(booking_id, user.id, booking.runner_id, rating, comment),
    db.prepare('SELECT AVG(rating) AS avg_rating FROM reviews WHERE runner_id = ?').bind(booking.runner_id),
  ]);
  const reviewId = results[0].meta.last_row_id;
  const agg = results[1].results[0];
  await db
    .prepare('UPDATE runners SET rating = ROUND(?, 1) WHERE id = ?')
    .bind(agg.avg_rating, booking.runner_id)
    .run();

  const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').bind(reviewId).first();
  return c.json({ review }, 201);
});

// ----- leaderboard & zones -----
app.get('/api/leaderboard', async (c) => {
  const db = c.env.DB;
  const rows = await db
    .prepare(
      `SELECT id, display_name, vehicle, zone, rating, runs_completed, verified,
              ROUND(rating * runs_completed, 1) AS score
       FROM runners
       ORDER BY score DESC, rating DESC
       LIMIT 10`
    )
    .all();
  return c.json({ leaderboard: rows.results });
});

app.get('/api/zones', async (c) => {
  const db = c.env.DB;
  const rows = await db.prepare('SELECT * FROM zones ORDER BY demand DESC').all();
  return c.json({ zones: rows.results });
});

// ----- admin -----
const ADMIN_BOOKING_STATUSES = ['pending', 'accepted', 'en_route', 'delivered', 'cancelled'];

app.get('/api/admin/stats', requireAuth, requireRole('admin'), async (c) => {
  const db = c.env.DB;
  const users = await db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN role = 'customer' THEN 1 ELSE 0 END) AS customers,
              SUM(CASE WHEN role = 'runner' THEN 1 ELSE 0 END) AS runners,
              SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins
       FROM users`
    )
    .first();
  const statusRows = await db.prepare('SELECT status, COUNT(*) AS c FROM bookings GROUP BY status').all();
  const bookings_by_status = {
    pending: 0,
    accepted: 0,
    en_route: 0,
    delivered: 0,
    cancelled: 0,
  };
  for (const r of statusRows.results) {
    if (r.status in bookings_by_status) bookings_by_status[r.status] = r.c;
  }
  const revenue = await db
    .prepare("SELECT COALESCE(SUM(price_pula), 0) AS total FROM bookings WHERE status = 'delivered'")
    .first();
  const total_revenue_pula = revenue.total;
  const pendingReviews = await db.prepare('SELECT COUNT(*) AS c FROM reviews').first();
  const pending_reviews = pendingReviews.c;
  return c.json({
    users: {
      total: users.total,
      customers: users.customers || 0,
      runners: users.runners || 0,
      admins: users.admins || 0,
    },
    bookings_by_status,
    total_revenue_pula,
    pending_reviews,
  });
});

app.get('/api/admin/users', requireAuth, requireRole('admin'), async (c) => {
  const db = c.env.DB;
  const { role } = z
    .object({ role: z.enum(['customer', 'runner', 'admin']).optional() })
    .parse(c.req.query());
  const rows = role
    ? await db.prepare('SELECT * FROM users WHERE role = ? ORDER BY created_at DESC, id DESC').bind(role).all()
    : await db.prepare('SELECT * FROM users ORDER BY created_at DESC, id DESC').all();
  const users = [];
  for (const row of rows.results) {
    let verified;
    if (row.role === 'runner') {
      const r = await db.prepare('SELECT verified FROM runners WHERE user_id = ?').bind(row.id).first();
      verified = r ? r.verified : 0;
    }
    users.push(adminSafeUser(row, verified));
  }
  return c.json({ users });
});

app.patch('/api/admin/users/:id', requireAuth, requireRole('admin'), async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = idParamSchema.parse(c.req.param());
  const updates = adminUserUpdateSchema.parse(await parseJsonBody(c));
  const target = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!target) throw new AppError(404, 'User not found.');
  const isSelf = target.id === user.id;
  if (isSelf && updates.suspended === true) {
    throw new AppError(403, 'You cannot suspend your own account.');
  }
  if (isSelf && updates.role && updates.role !== target.role) {
    throw new AppError(403, 'You cannot change your own role.');
  }

  const stmts = [];
  if (updates.role && updates.role !== target.role) {
    stmts.push(db.prepare('UPDATE users SET role = ? WHERE id = ?').bind(updates.role, id));
    // Promoting to runner: create an unverified runner profile if none exists.
    if (updates.role === 'runner') {
      const hasProfile = await db.prepare('SELECT id FROM runners WHERE user_id = ?').bind(id).first();
      if (!hasProfile) {
        stmts.push(
          db
            .prepare(
              `INSERT INTO runners (user_id, display_name, vehicle, zone, rating, runs_completed, verified)
               VALUES (?, ?, 'car', 'CBD / Main Mall', 5.0, 0, 0)`
            )
            .bind(id, target.name)
        );
      }
    }
  }
  if (typeof updates.suspended === 'boolean') {
    stmts.push(db.prepare('UPDATE users SET suspended = ? WHERE id = ?').bind(updates.suspended ? 1 : 0, id));
  }
  if (typeof updates.verified === 'boolean') {
    stmts.push(
      db.prepare('UPDATE runners SET verified = ? WHERE user_id = ?').bind(updates.verified ? 1 : 0, id)
    );
  }
  if (stmts.length) await db.batch(stmts);

  const updated = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  let verified;
  if (updated.role === 'runner') {
    const r = await db.prepare('SELECT verified FROM runners WHERE user_id = ?').bind(updated.id).first();
    verified = r ? r.verified : 0;
  }
  return c.json({ user: adminSafeUser(updated, verified) });
});

app.get('/api/admin/bookings', requireAuth, requireRole('admin'), async (c) => {
  const db = c.env.DB;
  const { status } = z
    .object({ status: z.enum(ADMIN_BOOKING_STATUSES).optional() })
    .parse(c.req.query());
  const rows = status
    ? await db
        .prepare(`${ENRICHED_BOOKING_SQL} WHERE b.status = ? ORDER BY b.created_at DESC, b.id DESC`)
        .bind(status)
        .all()
    : await db.prepare(`${ENRICHED_BOOKING_SQL} ORDER BY b.created_at DESC, b.id DESC`).all();
  return c.json({ bookings: rows.results });
});

// ---------- 404 + error handling ----------
app.notFound((c) => {
  return c.json({ error: 'Not found.' }, 404);
});

// Central error handler. Never leaks stack traces to clients.
app.onError((err, c) => {
  if (err?.name === 'ZodError') {
    const details = err.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`);
    return c.json({ error: 'Validation failed.', details }, 400);
  }
  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.status);
  }
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error.' }, 500);
});

export default app;
