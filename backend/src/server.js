// SwiftRun v2 - Express API for the Botswana runner/errand marketplace.
// Prices in Pula (P). All inputs validated with zod. All SQL via prepared statements.

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import db from './db.js';
import { signToken, requireAuth, requireRole } from './auth.js';
import {
  registerSchema,
  loginSchema,
  bookingCreateSchema,
  bookingStatusSchema,
  bookingStatusAdvanceSchema,
  adminUserUpdateSchema,
  reviewCreateSchema,
  runnerQuerySchema,
  serviceQuerySchema,
  idParamSchema,
} from './validation.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);

// ---------- security middleware ----------
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  })
);
app.use(express.json({ limit: '100kb' }));

// Stricter rate limit on auth routes (20 per 15 min per IP).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});
// General API limit (300 per 15 min per IP).
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Simple request logging (no sensitive bodies logged).
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`
    );
  });
  next();
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// ---------- helpers ----------
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function safeUser(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, phone: row.phone, role: row.role, created_at: row.created_at };
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

function runnerIdForUser(userId) {
  const row = db.prepare('SELECT id FROM runners WHERE user_id = ?').get(userId);
  return row ? row.id : null;
}

// Shared enriched booking SELECT: bookings + service title/category + runner
// display name + customer name. Used by runner and admin endpoints too.
const ENRICHED_BOOKING_SQL = `
  SELECT b.*, s.title AS service_title, s.category AS service_category,
         r.display_name AS runner_name, u.name AS customer_name
  FROM bookings b
  JOIN services s ON s.id = b.service_id
  JOIN runners r ON r.id = b.runner_id
  JOIN users u ON u.id = b.customer_id`;

function adminSafeUser(row) {
  if (!row) return null;
  const user = { ...safeUser(row), suspended: Boolean(row.suspended) };
  if (row.role === 'runner') {
    const r = db.prepare('SELECT verified FROM runners WHERE user_id = ?').get(row.id);
    user.verified = Boolean(r?.verified);
  }
  return user;
}

// ---------- routes ----------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: '2.1.0', time: new Date().toISOString() });
});

// ----- auth -----
app.post('/api/auth/register', (req, res, next) => {
  try {
    const { name, phone, password, role } = registerSchema.parse(req.body);
    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existing) throw new AppError(409, 'Phone number is already registered.');

    const hash = bcrypt.hashSync(password, 10);
    const insert = db.prepare(
      'INSERT INTO users (name, phone, password_hash, role) VALUES (?, ?, ?, ?)'
    );
    const info = insert.run(name, phone, hash, role);
    const user = safeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid));

    // Runners get a runner profile immediately (unverified until reviewed).
    if (role === 'runner') {
      db.prepare(
        `INSERT INTO runners (user_id, display_name, vehicle, zone, rating, runs_completed, verified)
         VALUES (?, ?, 'car', 'CBD / Main Mall', 5.0, 0, 0)`
      ).run(user.id, name);
    }

    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/login', (req, res, next) => {
  try {
    const { phone, password } = loginSchema.parse(req.body);
    const row = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      throw new AppError(401, 'Invalid phone number or password.');
    }
    if (row.suspended) {
      throw new AppError(401, 'Account suspended.');
    }
    const user = safeUser(row);
    res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
});

// ----- runners -----
app.get('/api/runners', (req, res, next) => {
  try {
    const { zone, min_rating } = runnerQuerySchema.parse(req.query);
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
    const rows = db
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
      .all(...params);
    res.json({ runners: rows });
  } catch (err) {
    next(err);
  }
});

// ----- services -----
app.get('/api/services', (req, res, next) => {
  try {
    const { category, zone, q } = serviceQuerySchema.parse(req.query);
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
    const rows = db
      .prepare(
        `SELECT s.id, s.title, s.category, s.description, s.price_pula, s.unit, s.created_at,
                r.id AS runner_id, r.display_name AS runner_name, r.zone AS runner_zone,
                r.vehicle AS runner_vehicle, r.rating AS runner_rating, r.verified AS runner_verified
         FROM services s
         JOIN runners r ON r.id = s.runner_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY s.created_at DESC`
      )
      .all(...params);
    res.json({ services: rows });
  } catch (err) {
    next(err);
  }
});

app.get('/api/services/:id', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const row = db
      .prepare(
        `SELECT s.id, s.title, s.category, s.description, s.price_pula, s.unit, s.active, s.created_at,
                r.id AS runner_id, r.display_name AS runner_name, r.zone AS runner_zone,
                r.vehicle AS runner_vehicle, r.rating AS runner_rating, r.verified AS runner_verified
         FROM services s
         JOIN runners r ON r.id = s.runner_id
         WHERE s.id = ?`
      )
      .get(id);
    if (!row) throw new AppError(404, 'Service not found.');
    res.json({ service: row });
  } catch (err) {
    next(err);
  }
});

// ----- bookings -----
app.post('/api/bookings', requireAuth, requireRole('customer'), (req, res, next) => {
  try {
    const { service_id, pickup, dropoff, scheduled_for } = bookingCreateSchema.parse(req.body);
    const service = db
      .prepare('SELECT id, runner_id, price_pula, active FROM services WHERE id = ?')
      .get(service_id);
    if (!service || !service.active) throw new AppError(404, 'Service not found or unavailable.');

    const info = db
      .prepare(
        `INSERT INTO bookings (customer_id, service_id, runner_id, pickup, dropoff, scheduled_for, price_pula, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
      )
      .run(
        req.user.id,
        service.id,
        service.runner_id,
        pickup,
        dropoff,
        scheduled_for || null,
        service.price_pula
      );

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
});

app.get('/api/bookings', requireAuth, (req, res, next) => {
  try {
    let rows;
    if (req.user.role === 'customer') {
      rows = db
        .prepare(`${ENRICHED_BOOKING_SQL} WHERE b.customer_id = ? ORDER BY b.created_at DESC, b.id DESC`)
        .all(req.user.id);
    } else if (req.user.role === 'runner') {
      const rid = runnerIdForUser(req.user.id);
      rows = rid
        ? db
            .prepare(`${ENRICHED_BOOKING_SQL} WHERE b.runner_id = ? ORDER BY b.created_at DESC, b.id DESC`)
            .all(rid)
        : [];
    } else {
      rows = db.prepare(`${ENRICHED_BOOKING_SQL} ORDER BY b.created_at DESC, b.id DESC`).all();
    }
    res.json({ bookings: rows });
  } catch (err) {
    next(err);
  }
});

app.patch('/api/bookings/:id', requireAuth, (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { status } = bookingStatusSchema.parse(req.body);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) throw new AppError(404, 'Booking not found.');

    // Ownership checks.
    if (req.user.role === 'customer' && booking.customer_id !== req.user.id) {
      throw new AppError(403, 'You can only change your own bookings.');
    }
    if (req.user.role === 'runner') {
      const rid = runnerIdForUser(req.user.id);
      if (!rid || booking.runner_id !== rid) {
        throw new AppError(403, 'This booking is not assigned to you.');
      }
    }

    const allowed = (TRANSITIONS[req.user.role] || {})[booking.status] || [];
    if (!allowed.includes(status)) {
      throw new AppError(
        409,
        `Cannot move booking from "${booking.status}" to "${status}" as ${req.user.role}.`
      );
    }

    const updateBooking = db.transaction(() => {
      db.prepare(
        "UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(status, id);
      if (status === 'delivered') {
        db.prepare('UPDATE runners SET runs_completed = runs_completed + 1 WHERE id = ?').run(
          booking.runner_id
        );
      }
    });
    updateBooking();

    res.json({ booking: db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) });
  } catch (err) {
    next(err);
  }
});

// ----- runner job board -----
// Pending bookings assigned to this runner (enriched shape).
app.get('/api/jobs', requireAuth, requireRole('runner'), (req, res, next) => {
  try {
    const rid = runnerIdForUser(req.user.id);
    if (!rid) throw new AppError(404, 'Runner profile not found.');
    const jobs = db
      .prepare(
        `${ENRICHED_BOOKING_SQL} WHERE b.runner_id = ? AND b.status = 'pending' ORDER BY b.created_at DESC, b.id DESC`
      )
      .all(rid);
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

// Accept a pending booking assigned to this runner.
app.post('/api/bookings/:id/accept', requireAuth, requireRole('runner'), (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) throw new AppError(404, 'Booking not found.');
    const rid = runnerIdForUser(req.user.id);
    if (booking.status !== 'pending' || !rid || booking.runner_id !== rid) {
      throw new AppError(409, 'Only pending bookings assigned to you can be accepted.');
    }
    db.prepare("UPDATE bookings SET status = 'accepted', updated_at = datetime('now') WHERE id = ?").run(
      id
    );
    res.json({ booking: db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) });
  } catch (err) {
    next(err);
  }
});

// Advance a booking: accepted -> en_route -> delivered (no skips).
app.patch('/api/bookings/:id/status', requireAuth, requireRole('runner'), (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { status } = bookingStatusAdvanceSchema.parse(req.body);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) throw new AppError(404, 'Booking not found.');
    const rid = runnerIdForUser(req.user.id);
    if (!rid || booking.runner_id !== rid) {
      throw new AppError(403, 'This booking is not assigned to you.');
    }

    const allowed = (TRANSITIONS.runner || {})[booking.status] || [];
    if (!allowed.includes(status)) {
      throw new AppError(409, `Cannot move booking from "${booking.status}" to "${status}" as runner.`);
    }

    const advanceBooking = db.transaction(() => {
      db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
        status,
        id
      );
      if (status === 'delivered') {
        db.prepare('UPDATE runners SET runs_completed = runs_completed + 1 WHERE id = ?').run(
          booking.runner_id
        );
      }
    });
    advanceBooking();

    res.json({ booking: db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) });
  } catch (err) {
    next(err);
  }
});

// All bookings for this runner (enriched shape), newest first.
app.get('/api/runner/jobs', requireAuth, requireRole('runner'), (req, res, next) => {
  try {
    const rid = runnerIdForUser(req.user.id);
    const rows = rid
      ? db
          .prepare(`${ENRICHED_BOOKING_SQL} WHERE b.runner_id = ? ORDER BY b.created_at DESC, b.id DESC`)
          .all(rid)
      : [];
    res.json({ bookings: rows });
  } catch (err) {
    next(err);
  }
});

// Earnings from delivered bookings for this runner.
app.get('/api/runner/earnings', requireAuth, requireRole('runner'), (req, res, next) => {
  try {
    const rid = runnerIdForUser(req.user.id);
    const rows = rid
      ? db
          .prepare(
            `SELECT b.id AS booking_id, s.title AS service_title, b.price_pula,
                    b.updated_at AS delivered_at
             FROM bookings b
             JOIN services s ON s.id = b.service_id
             WHERE b.runner_id = ? AND b.status = 'delivered'
             ORDER BY b.updated_at DESC, b.id DESC`
          )
          .all(rid)
      : [];
    const total = rows.reduce((sum, r) => sum + r.price_pula, 0);
    res.json({
      total_pula: Math.round(total * 100) / 100,
      job_count: rows.length,
      earnings: rows,
    });
  } catch (err) {
    next(err);
  }
});

// ----- reviews -----
app.post('/api/reviews', requireAuth, requireRole('customer'), (req, res, next) => {
  try {
    const { booking_id, rating, comment } = reviewCreateSchema.parse(req.body);
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id);
    if (!booking || booking.customer_id !== req.user.id) {
      throw new AppError(404, 'Booking not found.');
    }
    if (booking.status !== 'delivered') {
      throw new AppError(409, 'You can only review delivered bookings.');
    }
    const existing = db.prepare('SELECT id FROM reviews WHERE booking_id = ?').get(booking_id);
    if (existing) throw new AppError(409, 'This booking already has a review.');

    const createReview = db.transaction(() => {
      const info = db
        .prepare(
          'INSERT INTO reviews (booking_id, reviewer_id, runner_id, rating, comment) VALUES (?, ?, ?, ?, ?)'
        )
        .run(booking_id, req.user.id, booking.runner_id, rating, comment);
      const agg = db
        .prepare('SELECT AVG(rating) AS avg_rating FROM reviews WHERE runner_id = ?')
        .get(booking.runner_id);
      db.prepare('UPDATE runners SET rating = ROUND(?, 1) WHERE id = ?').run(
        agg.avg_rating,
        booking.runner_id
      );
      return info.lastInsertRowid;
    });
    const reviewId = createReview();

    res.status(201).json({ review: db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId) });
  } catch (err) {
    next(err);
  }
});

// ----- leaderboard & zones -----
app.get('/api/leaderboard', (req, res, next) => {
  try {
    const rows = db
      .prepare(
        `SELECT id, display_name, vehicle, zone, rating, runs_completed, verified,
                ROUND(rating * runs_completed, 1) AS score
         FROM runners
         ORDER BY score DESC, rating DESC
         LIMIT 10`
      )
      .all();
    res.json({ leaderboard: rows });
  } catch (err) {
    next(err);
  }
});

app.get('/api/zones', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM zones ORDER BY demand DESC').all();
    res.json({ zones: rows });
  } catch (err) {
    next(err);
  }
});

// ----- admin -----
const ADMIN_BOOKING_STATUSES = ['pending', 'accepted', 'en_route', 'delivered', 'cancelled'];

app.get('/api/admin/stats', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const users = db
      .prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN role = 'customer' THEN 1 ELSE 0 END) AS customers,
                SUM(CASE WHEN role = 'runner' THEN 1 ELSE 0 END) AS runners,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins
         FROM users`
      )
      .get();
    const statusRows = db.prepare('SELECT status, COUNT(*) AS c FROM bookings GROUP BY status').all();
    const bookings_by_status = {
      pending: 0,
      accepted: 0,
      en_route: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const r of statusRows) {
      if (r.status in bookings_by_status) bookings_by_status[r.status] = r.c;
    }
    const total_revenue_pula = db
      .prepare("SELECT COALESCE(SUM(price_pula), 0) AS total FROM bookings WHERE status = 'delivered'")
      .get().total;
    const pending_reviews = db.prepare('SELECT COUNT(*) AS c FROM reviews').get().c;
    res.json({
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
  } catch (err) {
    next(err);
  }
});

app.get('/api/admin/users', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const { role } = z
      .object({ role: z.enum(['customer', 'runner', 'admin']).optional() })
      .parse(req.query);
    const rows = role
      ? db.prepare('SELECT * FROM users WHERE role = ? ORDER BY created_at DESC, id DESC').all(role)
      : db.prepare('SELECT * FROM users ORDER BY created_at DESC, id DESC').all();
    res.json({ users: rows.map(adminSafeUser) });
  } catch (err) {
    next(err);
  }
});

app.patch('/api/admin/users/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const updates = adminUserUpdateSchema.parse(req.body);
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!target) throw new AppError(404, 'User not found.');
    const isSelf = target.id === req.user.id;
    if (isSelf && updates.suspended === true) {
      throw new AppError(403, 'You cannot suspend your own account.');
    }
    if (isSelf && updates.role && updates.role !== target.role) {
      throw new AppError(403, 'You cannot change your own role.');
    }

    const applyUpdate = db.transaction(() => {
      if (updates.role && updates.role !== target.role) {
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(updates.role, id);
        // Promoting to runner: create an unverified runner profile if none exists.
        if (updates.role === 'runner') {
          const hasProfile = db.prepare('SELECT id FROM runners WHERE user_id = ?').get(id);
          if (!hasProfile) {
            db.prepare(
              `INSERT INTO runners (user_id, display_name, vehicle, zone, rating, runs_completed, verified)
               VALUES (?, ?, 'car', 'CBD / Main Mall', 5.0, 0, 0)`
            ).run(id, target.name);
          }
        }
      }
      if (typeof updates.suspended === 'boolean') {
        db.prepare('UPDATE users SET suspended = ? WHERE id = ?').run(
          updates.suspended ? 1 : 0,
          id
        );
      }
      if (typeof updates.verified === 'boolean') {
        db.prepare('UPDATE runners SET verified = ? WHERE user_id = ?').run(
          updates.verified ? 1 : 0,
          id
        );
      }
    });
    applyUpdate();

    res.json({ user: adminSafeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
  } catch (err) {
    next(err);
  }
});

app.get('/api/admin/bookings', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const { status } = z
      .object({ status: z.enum(ADMIN_BOOKING_STATUSES).optional() })
      .parse(req.query);
    const rows = status
      ? db
          .prepare(`${ENRICHED_BOOKING_SQL} WHERE b.status = ? ORDER BY b.created_at DESC, b.id DESC`)
          .all(status)
      : db.prepare(`${ENRICHED_BOOKING_SQL} ORDER BY b.created_at DESC, b.id DESC`).all();
    res.json({ bookings: rows });
  } catch (err) {
    next(err);
  }
});

// ---------- 404 + error handling ----------
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Central error handler. Never leaks stack traces to clients.
app.use((err, req, res, _next) => {
  if (err?.name === 'ZodError') {
    const details = err.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`);
    return res.status(400).json({ error: 'Validation failed.', details });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
    return res.status(400).json({ error: 'Invalid request body.' });
  }
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error.' });
});

// Only start a listener when run directly (allows importing the app in tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`SwiftRun API listening on port ${PORT}`);
  });
}

export default app;
