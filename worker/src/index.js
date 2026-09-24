// SwiftRun API - Cloudflare Worker port of the Express backend (v2.1.0).
// D1 binding: DB. Secret: JWT_SECRET.
// All inputs validated (mirrors backend/src/validation.js). All SQL parameterized.

import bcrypt from 'bcryptjs';

// bcryptjs cannot always detect a random source inside a bundle, so hand it
// WebCrypto explicitly. Works in Workers and in Node.
try {
  bcrypt.setRandomFallback((len) =>
    Array.from(globalThis.crypto.getRandomValues(new Uint8Array(len)))
  );
} catch {
  // ignore; native detection will be used
}

const JWT_EXPIRY_S = 24 * 3600;

// ---------- base64url ----------
function b64urlEncode(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

// ---------- JWT (HS256 via WebCrypto) ----------
async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}
async function signToken(user, secret) {
  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_S,
      })
    )
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    new TextEncoder().encode(`${header}.${body}`)
  );
  return `${header}.${body}.${b64urlEncode(sig)}`;
}
async function verifyToken(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  let sigBytes;
  try {
    sigBytes = b64urlDecode(s);
  } catch {
    return null;
  }
  const ok = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret),
    sigBytes,
    new TextEncoder().encode(`${h}.${p}`)
  );
  if (!ok) return null;
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(p)));
  } catch {
    return null;
  }
  if (!payload || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ---------- validation (mirrors validation.js) ----------
const PHONE_RE = /^7\d{6,7}$/;
const CATEGORIES = ['errands', 'food', 'groceries', 'documents', 'parcels', 'shopping'];
const ROLES = ['customer', 'runner', 'admin'];
const BOOKING_STATUSES = ['pending', 'accepted', 'en_route', 'delivered', 'cancelled'];

function fail(details) {
  return { ok: false, details };
}
function vRegister(b) {
  const d = [];
  const name = typeof b?.name === 'string' ? b.name.trim() : '';
  if (!name) d.push('name: Name is required.');
  else if (name.length > 100) d.push('name: Name is too long.');
  const phone = typeof b?.phone === 'string' ? b.phone.trim() : '';
  if (!PHONE_RE.test(phone)) d.push('phone: Phone must be a Botswana mobile number: 7 or 8 digits starting with 7.');
  const pw = b?.password;
  if (typeof pw !== 'string' || pw.length < 6) d.push('password: Password must be at least 6 characters.');
  else if (pw.length > 128) d.push('password: Password is too long.');
  let role = b?.role;
  if (role === undefined) role = 'customer';
  if (!['customer', 'runner'].includes(role)) d.push('role: Invalid role.');
  if (d.length) return fail(d);
  return { ok: true, value: { name, phone, password: pw, role } };
}
function vLogin(b) {
  const d = [];
  const phone = typeof b?.phone === 'string' ? b.phone.trim() : '';
  if (!PHONE_RE.test(phone)) d.push('phone: Phone must be a Botswana mobile number: 7 or 8 digits starting with 7.');
  if (typeof b?.password !== 'string' || !b.password.length) d.push('password: Password is required.');
  if (d.length) return fail(d);
  return { ok: true, value: { phone, password: b.password } };
}
function vBookingCreate(b) {
  const d = [];
  if (!Number.isInteger(b?.service_id) || b.service_id <= 0) d.push('service_id: Must be a positive integer.');
  const pickup = typeof b?.pickup === 'string' ? b.pickup.trim() : '';
  const dropoff = typeof b?.dropoff === 'string' ? b.dropoff.trim() : '';
  if (!pickup) d.push('pickup: Pickup location is required.');
  else if (pickup.length > 200) d.push('pickup: Too long.');
  if (!dropoff) d.push('dropoff: Dropoff location is required.');
  else if (dropoff.length > 200) d.push('dropoff: Too long.');
  let scheduled_for;
  const sf = b?.scheduled_for;
  if (sf !== undefined && sf !== null && String(sf).trim() !== '') {
    if (Number.isNaN(Date.parse(String(sf).trim()))) d.push('scheduled_for: scheduled_for must be a valid ISO date string.');
    else scheduled_for = String(sf).trim();
  }
  if (d.length) return fail(d);
  return { ok: true, value: { service_id: b.service_id, pickup, dropoff, scheduled_for } };
}
function vId(idStr) {
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) return fail(['id: Invalid id.']);
  return { ok: true, value: id };
}

// ---------- D1 helpers ----------
async function qAll(db, sql, params = []) {
  const r = await db.prepare(sql).bind(...params).all();
  return r.results || [];
}
async function qOne(db, sql, params = []) {
  return db.prepare(sql).bind(...params).first();
}

// ---------- response helpers ----------
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
function err(status, message) {
  return json({ error: message }, status);
}
function validationErr(details) {
  return json({ error: 'Validation failed.', details }, 400);
}

// ---------- domain logic ----------
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

function safeUser(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, phone: row.phone, role: row.role, created_at: row.created_at };
}
function adminSafeUser(row, verified) {
  if (!row) return null;
  const user = { ...safeUser(row), suspended: Boolean(row.suspended) };
  if (row.role === 'runner') user.verified = Boolean(verified);
  return user;
}
async function runnerIdForUser(db, userId) {
  const row = await qOne(db, 'SELECT id FROM runners WHERE user_id = ?', [userId]);
  return row ? row.id : null;
}

const ENRICHED_BOOKING_SQL = `
  SELECT b.*, s.title AS service_title, s.category AS service_category,
         r.display_name AS runner_name, u.name AS customer_name
  FROM bookings b
  JOIN services s ON s.id = b.service_id
  JOIN runners r ON r.id = b.runner_id
  JOIN users u ON u.id = b.customer_id`;

// ---------- main handler ----------
async function handle(req, env) {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();
  const path = url.pathname;

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const db = env.DB;
  const secret = env.JWT_SECRET;
  if (!secret) return err(500, 'Server misconfigured.');

  let body;
  if (method === 'POST' || method === 'PATCH') {
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return err(400, 'Invalid request body.');
    }
  }

  async function authUser() {
    const header = req.headers.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return verifyToken(token, secret);
  }
  async function requireAuth() {
    const user = await authUser();
    if (!user) return { error: err(401, 'Authentication required.') };
    return { user };
  }
  function requireRole(user, ...roles) {
    if (!roles.includes(user.role)) return err(403, 'You do not have permission for this action.');
    return null;
  }

  // ----- health -----
  if (method === 'GET' && path === '/api/health') {
    return json({ ok: true, version: '2.1.0', time: new Date().toISOString() });
  }

  // ----- auth -----
  if (method === 'POST' && path === '/api/auth/register') {
    const v = vRegister(body);
    if (!v.ok) return validationErr(v.details);
    const { name, phone, password, role } = v.value;
    const existing = await qOne(db, 'SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing) return err(409, 'Phone number is already registered.');
    const hash = bcrypt.hashSync(password, 10);
    const ins = await db.prepare('INSERT INTO users (name, phone, password_hash, role) VALUES (?, ?, ?, ?)').bind(name, phone, hash, role).run();
    const userId = ins.meta.last_row_id;
    if (role === 'runner') {
      await db.prepare(`INSERT INTO runners (user_id, display_name, vehicle, zone, rating, runs_completed, verified) VALUES (?, ?, 'car', 'CBD / Main Mall', 5.0, 0, 0)`).bind(userId, name).run();
    }
    const user = safeUser(await qOne(db, 'SELECT * FROM users WHERE id = ?', [userId]));
    return json({ token: await signToken(user, secret), user }, 201);
  }

  if (method === 'POST' && path === '/api/auth/login') {
    const v = vLogin(body);
    if (!v.ok) return validationErr(v.details);
    const { phone, password } = v.value;
    const row = await qOne(db, 'SELECT * FROM users WHERE phone = ?', [phone]);
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return err(401, 'Invalid phone number or password.');
    }
    if (row.suspended) return err(401, 'Account suspended.');
    const user = safeUser(row);
    return json({ token: await signToken(user, secret), user });
  }

  // ----- runners -----
  if (method === 'GET' && path === '/api/runners') {
    const zone = url.searchParams.get('zone');
    const minRatingRaw = url.searchParams.get('min_rating');
    let minRating;
    if (minRatingRaw !== null && minRatingRaw !== '') {
      minRating = Number(minRatingRaw);
      if (Number.isNaN(minRating) || minRating < 0 || minRating > 5) {
        return validationErr(['min_rating: Must be a number between 0 and 5.']);
      }
    }
    const conds = [];
    const params = [];
    if (zone) { conds.push('r.zone = ?'); params.push(zone); }
    if (minRating !== undefined) { conds.push('COALESCE(rev.avg_rating, r.rating) >= ?'); params.push(minRating); }
    const rows = await qAll(db, `
      SELECT r.id, r.display_name, r.vehicle, r.zone,
             COALESCE(rev.avg_rating, r.rating) AS avg_rating,
             COALESCE(rev.review_count, 0) AS review_count,
             r.runs_completed, r.verified, r.created_at
      FROM runners r
      LEFT JOIN (SELECT runner_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count FROM reviews GROUP BY runner_id) rev ON rev.runner_id = r.id
      ${conds.length ? 'WHERE ' + conds.join(' AND ') : ''}
      ORDER BY avg_rating DESC, r.runs_completed DESC`, params);
    return json({ runners: rows });
  }

  // ----- services -----
  if (method === 'GET' && path === '/api/services') {
    const category = url.searchParams.get('category');
    const zone = url.searchParams.get('zone');
    const q = url.searchParams.get('q');
    if (category && !CATEGORIES.includes(category)) return validationErr(['category: Invalid category.']);
    const conds = ['s.active = 1'];
    const params = [];
    if (category) { conds.push('s.category = ?'); params.push(category); }
    if (zone) { conds.push('r.zone = ?'); params.push(zone); }
    if (q) { conds.push('(s.title LIKE ? OR s.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const rows = await qAll(db, `
      SELECT s.id, s.title, s.category, s.description, s.price_pula, s.unit, s.created_at,
             r.id AS runner_id, r.display_name AS runner_name, r.zone AS runner_zone,
             r.vehicle AS runner_vehicle, r.rating AS runner_rating, r.verified AS runner_verified
      FROM services s JOIN runners r ON r.id = s.runner_id
      WHERE ${conds.join(' AND ')}
      ORDER BY s.created_at DESC`, params);
    return json({ services: rows });
  }

  const svcMatch = path.match(/^\/api\/services\/(\d+)$/);
  if (method === 'GET' && svcMatch) {
    const v = vId(svcMatch[1]);
    if (!v.ok) return validationErr(v.details);
    const row = await qOne(db, `
      SELECT s.id, s.title, s.category, s.description, s.price_pula, s.unit, s.active, s.created_at,
             r.id AS runner_id, r.display_name AS runner_name, r.zone AS runner_zone,
             r.vehicle AS runner_vehicle, r.rating AS runner_rating, r.verified AS runner_verified
      FROM services s JOIN runners r ON r.id = s.runner_id
      WHERE s.id = ?`, [v.value]);
    if (!row) return err(404, 'Service not found.');
    return json({ service: row });
  }

  // ----- bookings -----
  if (method === 'POST' && path === '/api/bookings') {
    const a = await requireAuth();
    if (a.error) return a.error;
    const rg = requireRole(a.user, 'customer');
    if (rg) return rg;
    const v = vBookingCreate(body);
    if (!v.ok) return validationErr(v.details);
    const { service_id, pickup, dropoff, scheduled_for } = v.value;
    const service = await qOne(db, 'SELECT id, runner_id, price_pula, active FROM services WHERE id = ?', [service_id]);
    if (!service || !service.active) return err(404, 'Service not found or unavailable.');
    const ins = await db.prepare(
      `INSERT INTO bookings (customer_id, service_id, runner_id, pickup, dropoff, scheduled_for, price_pula, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).bind(a.user.id, service.id, service.runner_id, pickup, dropoff, scheduled_for || null, service.price_pula).run();
    const booking = await qOne(db, 'SELECT * FROM bookings WHERE id = ?', [ins.meta.last_row_id]);
    return json({ booking }, 201);
  }

  if (method === 'GET' && path === '/api/bookings') {
    const a = await requireAuth();
    if (a.error) return a.error;
    let rows;
    if (a.user.role === 'customer') {
      rows = await qAll(db, `${ENRICHED_BOOKING_SQL} WHERE b.customer_id = ? ORDER BY b.created_at DESC, b.id DESC`, [a.user.id]);
    } else if (a.user.role === 'runner') {
      const rid = await runnerIdForUser(db, a.user.id);
      rows = rid ? await qAll(db, `${ENRICHED_BOOKING_SQL} WHERE b.runner_id = ? ORDER BY b.created_at DESC, b.id DESC`, [rid]) : [];
    } else {
      rows = await qAll(db, `${ENRICHED_BOOKING_SQL} ORDER BY b.created_at DESC, b.id DESC`);
    }
    return json({ bookings: rows });
  }

  const bookPatchMatch = path.match(/^\/api\/bookings\/(\d+)$/);
  if (method === 'PATCH' && bookPatchMatch) {
    const a = await requireAuth();
    if (a.error) return a.error;
    const v = vId(bookPatchMatch[1]);
    if (!v.ok) return validationErr(v.details);
    const status = body?.status;
    const allowedStatuses = Object.values(TRANSITIONS[a.user.role] || {}).flat();
    const uniqueAllowed = [...new Set([...allowedStatuses])];
    if (!uniqueAllowed.includes(status)) {
      return validationErr(['status: Invalid status for your role.']);
    }
    const booking = await qOne(db, 'SELECT * FROM bookings WHERE id = ?', [v.value]);
    if (!booking) return err(404, 'Booking not found.');
    if (a.user.role === 'customer' && booking.customer_id !== a.user.id) {
      return err(403, 'You can only change your own bookings.');
    }
    if (a.user.role === 'runner') {
      const rid = await runnerIdForUser(db, a.user.id);
      if (!rid || booking.runner_id !== rid) return err(403, 'This booking is not assigned to you.');
    }
    const allowed = (TRANSITIONS[a.user.role] || {})[booking.status] || [];
    if (!allowed.includes(status)) {
      return err(409, `Cannot move booking from "${booking.status}" to "${status}" as ${a.user.role}.`);
    }
    const stmts = [db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(status, v.value)];
    if (status === 'delivered') {
      stmts.push(db.prepare('UPDATE runners SET runs_completed = runs_completed + 1 WHERE id = ?').bind(booking.runner_id));
    }
    await db.batch(stmts);
    const updated = await qOne(db, 'SELECT * FROM bookings WHERE id = ?', [v.value]);
    return json({ booking: updated });
  }

  // ----- runner job board -----
  if (method === 'GET' && path === '/api/jobs') {
    const a = await requireAuth();
    if (a.error) return a.error;
    const rg = requireRole(a.user, 'runner');
    if (rg) return rg;
    const rid = await runnerIdForUser(db, a.user.id);
    if (!rid) return err(404, 'Runner profile not found.');
    const jobs = await qAll(db, `${ENRICHED_BOOKING_SQL} WHERE b.runner_id = ? AND b.status = 'pending' ORDER BY b.created_at DESC, b.id DESC`, [rid]);
    return json({ jobs });
  }

  const acceptMatch = path.match(/^\/api\/bookings\/(\d+)\/accept$/);
  if (method === 'POST' && acceptMatch) {
    const a = await requireAuth();
    if (a.error) return a.error;
    const rg = requireRole(a.user, 'runner');
    if (rg) return rg;
    const v = vId(acceptMatch[1]);
    if (!v.ok) return validationErr(v.details);
    const booking = await qOne(db, 'SELECT * FROM bookings WHERE id = ?', [v.value]);
    if (!booking) return err(404, 'Booking not found.');
    const rid = await runnerIdForUser(db, a.user.id);
    if (booking.status !== 'pending' || !rid || booking.runner_id !== rid) {
      return err(409, 'Only pending bookings assigned to you can be accepted.');
    }
    await db.prepare("UPDATE bookings SET status = 'accepted', updated_at = datetime('now') WHERE id = ?").bind(v.value).run();
    const updated = await qOne(db, 'SELECT * FROM bookings WHERE id = ?', [v.value]);
    return json({ booking: updated });
  }

  const statusMatch = path.match(/^\/api\/bookings\/(\d+)\/status$/);
  if (method === 'PATCH' && statusMatch) {
    const a = await requireAuth();
    if (a.error) return a.error;
    const rg = requireRole(a.user, 'runner');
    if (rg) return rg;
    const v = vId(statusMatch[1]);
    if (!v.ok) return validationErr(v.details);
    const status = body?.status;
    if (!['en_route', 'delivered'].includes(status)) {
      return validationErr(['status: Must be en_route or delivered.']);
    }
    const booking = await qOne(db, 'SELECT * FROM bookings WHERE id = ?', [v.value]);
    if (!booking) return err(404, 'Booking not found.');
    const rid = await runnerIdForUser(db, a.user.id);
    if (!rid || booking.runner_id !== rid) return err(403, 'This booking is not assigned to you.');
    const allowed = (TRANSITIONS.runner || {})[booking.status] || [];
    if (!allowed.includes(status)) {
      return err(409, `Cannot move booking from "${booking.status}" to "${status}" as runner.`);
    }
    const stmts = [db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(status, v.value)];
    if (status === 'delivered') {
      stmts.push(db.prepare('UPDATE runners SET runs_completed = runs_completed + 1 WHERE id = ?').bind(booking.runner_id));
    }
    await db.batch(stmts);
    const updated = await qOne(db, 'SELECT * FROM bookings WHERE id = ?', [v.value]);
    return json({ booking: updated });
  }

  if (method === 'GET' && path === '/api/runner/jobs') {
    const a = await requireAuth();
    if (a.error) return a.error;
    const rg = requireRole(a.user, 'runner');
    if (rg) return rg;
    const rid = await runnerIdForUser(db, a.user.id);
    const rows = rid ? await qAll(db, `${ENRICHED_BOOKING_SQL} WHERE b.runner_id = ? ORDER BY b.created_at DESC, b.id DESC`, [rid]) : [];
    return json({ bookings: rows });
  }

  if (method === 'GET' && path === '/api/runner/earnings') {
    const a = await requireAuth();
    if (a.error) return a.error;
    const rg = requireRole(a.user, 'runner');
    if (rg) return rg;
    const rid = await runnerIdForUser(db, a.user.id);
    const rows = rid ? await qAll(db, `
      SELECT b.id AS booking_id, s.title AS service_title, b.price_pula, b.updated_at AS delivered_at
      FROM bookings b JOIN services s ON s.id = b.service_id
      WHERE b.runner_id = ? AND b.status = 'delivered'
      ORDER BY b.updated_at DESC, b.id DESC`, [rid]) : [];
    const total = rows.reduce((sum, r) => sum + (Number(r.price_pula) || 0), 0);
    return json({ total_pula: Math.round(total * 100) / 100, job_count: rows.length, earnings: rows });
  }

  // ----- reviews -----
  if (method === 'POST' && path === '/api/reviews') {
    const a = await requireAuth();
    if (a.error) return a.error;
    const rg = requireRole(a.user, 'customer');
    if (rg) return rg;
    const d = [];
    const booking_id = body?.booking_id;
    if (!Number.isInteger(booking_id) || booking_id <= 0) d.push('booking_id: Must be a positive integer.');
    const rating = body?.rating;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) d.push('rating: Must be an integer between 1 and 5.');
    const comment = typeof body?.comment === 'string' ? body.comment.trim() : '';
    if (comment.length > 500) d.push('comment: Too long.');
    if (d.length) return validationErr(d);
    const booking = await qOne(db, 'SELECT * FROM bookings WHERE id = ?', [booking_id]);
    if (!booking || booking.customer_id !== a.user.id) return err(404, 'Booking not found.');
    if (booking.status !== 'delivered') return err(409, 'You can only review delivered bookings.');
    const existing = await qOne(db, 'SELECT id FROM reviews WHERE booking_id = ?', [booking_id]);
    if (existing) return err(409, 'This booking already has a review.');
    const ins = await db.prepare('INSERT INTO reviews (booking_id, reviewer_id, runner_id, rating, comment) VALUES (?, ?, ?, ?, ?)').bind(booking_id, a.user.id, booking.runner_id, rating, comment).run();
    const reviewId = ins.meta.last_row_id;
    const agg = await qOne(db, 'SELECT AVG(rating) AS avg_rating FROM reviews WHERE runner_id = ?', [booking.runner_id]);
    await db.prepare('UPDATE runners SET rating = ROUND(?, 1) WHERE id = ?').bind(agg.avg_rating, booking.runner_id).run();
    const review = await qOne(db, 'SELECT * FROM reviews WHERE id = ?', [reviewId]);
    return json({ review }, 201);
  }

  // ----- leaderboard & zones -----
  if (method === 'GET' && path === '/api/leaderboard') {
    const rows = await qAll(db, `
      SELECT id, display_name, vehicle, zone, rating, runs_completed, verified,
             ROUND(rating * runs_completed, 1) AS score
      FROM runners ORDER BY score DESC, rating DESC LIMIT 10`);
    return json({ leaderboard: rows });
  }

  if (method === 'GET' && path === '/api/zones') {
    const rows = await qAll(db, 'SELECT * FROM zones ORDER BY demand DESC');
    return json({ zones: rows });
  }

  // ----- admin -----
  if (method === 'GET' && path === '/api/admin/stats') {
    const a = await requireAuth();
    if (a.error) return a.error;
    const rg = requireRole(a.user, 'admin');
    if (rg) return rg;
    const users = await qOne(db, `
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN role = 'customer' THEN 1 ELSE 0 END) AS customers,
             SUM(CASE WHEN role = 'runner' THEN 1 ELSE 0 END) AS runners,
             SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins
      FROM users`);
    const statusRows = await qAll(db, 'SELECT status, COUNT(*) AS c FROM bookings GROUP BY status');
    const bookings_by_status = { pending: 0, accepted: 0, en_route: 0, delivered: 0, cancelled: 0 };
    for (const r of statusRows) {
      if (r.status in bookings_by_status) bookings_by_status[r.status] = r.c;
    }
    const rev = await qOne(db, "SELECT COALESCE(SUM(price_pula), 0) AS total FROM bookings WHERE status = 'delivered'");
    const rc = await qOne(db, 'SELECT COUNT(*) AS c FROM reviews');
    return json({
      users: {
        total: users.total || 0,
        customers: users.customers || 0,
        runners: users.runners || 0,
        admins: users.admins || 0,
      },
      bookings_by_status,
      total_revenue_pula: rev.total || 0,
      pending_reviews: rc.c || 0,
    });
  }

  if (method === 'GET' && path === '/api/admin/users') {
    const a = await requireAuth();
    if (a.error) return a.error;
    const rg = requireRole(a.user, 'admin');
    if (rg) return rg;
    const role = url.searchParams.get('role');
    if (role && !['customer', 'runner', 'admin'].includes(role)) {
      return validationErr(['role: Invalid role.']);
    }
    const rows = role
      ? await qAll(db, 'SELECT * FROM users WHERE role = ? ORDER BY created_at DESC, id DESC', [role])
      : await qAll(db, 'SELECT * FROM users ORDER BY created_at DESC, id DESC');
    const users = [];
    for (const row of rows) {
      let verified;
      if (row.role === 'runner') {
        const r = await qOne(db, 'SELECT verified FROM runners WHERE user_id = ?', [row.id]);
        verified = r?.verified;
      }
      users.push(adminSafeUser(row, verified));
    }
    return json({ users });
  }

  const adminUserMatch = path.match(/^\/api\/admin\/users\/(\d+)$/);
  if (method === 'PATCH' && adminUserMatch) {
    const a = await requireAuth();
    if (a.error) return a.error;
    const rg = requireRole(a.user, 'admin');
    if (rg) return rg;
    const v = vId(adminUserMatch[1]);
    if (!v.ok) return validationErr(v.details);
    const d = [];
    const updates = {};
    if (body?.role !== undefined) {
      if (!ROLES.includes(body.role)) d.push('role: Invalid role.');
      else updates.role = body.role;
    }
    if (body?.suspended !== undefined) {
      if (typeof body.suspended !== 'boolean') d.push('suspended: Must be a boolean.');
      else updates.suspended = body.suspended;
    }
    if (body?.verified !== undefined) {
      if (typeof body.verified !== 'boolean') d.push('verified: Must be a boolean.');
      else updates.verified = body.verified;
    }
    if (d.length) return validationErr(d);
    const target = await qOne(db, 'SELECT * FROM users WHERE id = ?', [v.value]);
    if (!target) return err(404, 'User not found.');
    const isSelf = target.id === a.user.id;
    if (isSelf && updates.suspended === true) return err(403, 'You cannot suspend your own account.');
    if (isSelf && updates.role && updates.role !== target.role) {
      return err(403, 'You cannot change your own role.');
    }
    const stmts = [];
    if (updates.role && updates.role !== target.role) {
      stmts.push(db.prepare('UPDATE users SET role = ? WHERE id = ?').bind(updates.role, v.value));
      if (updates.role === 'runner') {
        const hasProfile = await qOne(db, 'SELECT id FROM runners WHERE user_id = ?', [v.value]);
        if (!hasProfile) {
          stmts.push(
            db.prepare(`INSERT INTO runners (user_id, display_name, vehicle, zone, rating, runs_completed, verified) VALUES (?, ?, 'car', 'CBD / Main Mall', 5.0, 0, 0)`).bind(v.value, target.name)
          );
        }
      }
    }
    if (typeof updates.suspended === 'boolean') {
      stmts.push(db.prepare('UPDATE users SET suspended = ? WHERE id = ?').bind(updates.suspended ? 1 : 0, v.value));
    }
    if (typeof updates.verified === 'boolean') {
      stmts.push(db.prepare('UPDATE runners SET verified = ? WHERE user_id = ?').bind(updates.verified ? 1 : 0, v.value));
    }
    if (stmts.length) await db.batch(stmts);
    const fresh = await qOne(db, 'SELECT * FROM users WHERE id = ?', [v.value]);
    let verified;
    if (fresh.role === 'runner') {
      const r = await qOne(db, 'SELECT verified FROM runners WHERE user_id = ?', [v.value]);
      verified = r?.verified;
    }
    return json({ user: adminSafeUser(fresh, verified) });
  }

  if (method === 'GET' && path === '/api/admin/bookings') {
    const a = await requireAuth();
    if (a.error) return a.error;
    const rg = requireRole(a.user, 'admin');
    if (rg) return rg;
    const status = url.searchParams.get('status');
    if (status && !BOOKING_STATUSES.includes(status)) {
      return validationErr(['status: Invalid status.']);
    }
    const rows = status
      ? await qAll(db, `${ENRICHED_BOOKING_SQL} WHERE b.status = ? ORDER BY b.created_at DESC, b.id DESC`, [status])
      : await qAll(db, `${ENRICHED_BOOKING_SQL} ORDER BY b.created_at DESC, b.id DESC`);
    return json({ bookings: rows });
  }

  return err(404, 'Not found.');
}

export default {
  async fetch(req, env) {
    try {
      return await handle(req, env);
    } catch (e) {
      // Never leak stack traces to clients.
      return json({ error: 'Internal server error.' }, 500);
    }
  },
};
