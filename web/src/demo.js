// Local demo store. Powers the app when offline or when no backend is
// configured (VITE_API_URL unset), which is the case for the Android APK.
// Mutations persist to localStorage under sr_demo_* keys.

import { SERVICES } from "./data.js";

const USERS_KEY = "sr_demo_users";
const BOOKINGS_KEY = "sr_demo_bookings";
const QUERIES_KEY = "sr_demo_queries";
const SEQ_KEY = "sr_demo_seq";
const DAY = 86400000;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable. Demo data still works in memory for this session.
  }
}

function seedUsers() {
  const now = Date.now();
  return [
    {
      id: "u_sender", name: "Thato M.", phone: "72170000", password: "demo1234",
      role: "customer", verified: true, suspended: false, created_at: now - 90 * DAY,
    },
    {
      id: "u_runner", name: "Portia S.", phone: "72111111", password: "runner1234",
      role: "runner", verified: true, suspended: false, created_at: now - 80 * DAY,
    },
    {
      id: "u_admin", name: "SwiftRun Admin", phone: "72170001", password: "admin1234",
      role: "admin", verified: true, suspended: false, created_at: now - 100 * DAY,
    },
  ];
}

function seedBookings() {
  const now = Date.now();
  return [
    {
      id: "BK-D101", customer_id: "u_sender", customer_name: "Thato M.",
      service_id: "s6", service_title: "Hot food pickup", service_category: "food",
      runner_id: null, runner_name: null,
      pickup: "CBD / Main Mall", dropoff: "Broadhurst", scheduled_for: null,
      price_pula: 55, status: "pending",
      created_at: now - 3600000, updated_at: now - 3600000,
    },
    {
      id: "BK-D102", customer_id: "u_guest", customer_name: "Neo K.",
      service_id: "s7", service_title: "Queue for me", service_category: "errands",
      runner_id: null, runner_name: null,
      pickup: "Game City", dropoff: "Extension 9", scheduled_for: null,
      price_pula: 60, status: "pending",
      created_at: now - 5400000, updated_at: now - 5400000,
    },
    {
      id: "BK-D103", customer_id: "u_sender", customer_name: "Thato M.",
      service_id: "s1", service_title: "Express document courier", service_category: "documents",
      runner_id: "u_runner", runner_name: "Portia S.",
      pickup: "Phakalane", dropoff: "CBD / Main Mall", scheduled_for: null,
      price_pula: 75, status: "accepted",
      created_at: now - 7200000, updated_at: now - 1800000,
    },
    {
      id: "BK-D104", customer_id: "u_sender", customer_name: "Thato M.",
      service_id: "s2", service_title: "Weekly grocery run", service_category: "groceries",
      runner_id: "u_runner", runner_name: "Portia S.",
      pickup: "Game City", dropoff: "Mogoditshane", scheduled_for: null,
      price_pula: 130, status: "delivered",
      created_at: now - 3 * DAY, updated_at: now - 3 * DAY + 3600000,
      delivered_at: now - 3 * DAY + 3600000,
    },
  ];
}

function users() {
  let u = read(USERS_KEY, null);
  if (!u) {
    u = seedUsers();
    write(USERS_KEY, u);
  }
  return u;
}

function bookings() {
  let b = read(BOOKINGS_KEY, null);
  if (!b) {
    b = seedBookings();
    write(BOOKINGS_KEY, b);
  }
  return b;
}

function saveUsers(u) {
  write(USERS_KEY, u);
}

function saveBookings(b) {
  write(BOOKINGS_KEY, b);
}

function publicUser(u) {
  const { password, ...safe } = u;
  return safe;
}

function fakeToken(phone) {
  return "demo." + btoa(phone + ":" + Date.now()) + ".demo";
}

// Reset helper for testing. Not called by the app itself.
export function demoReset() {
  try {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(BOOKINGS_KEY);
    localStorage.removeItem(QUERIES_KEY);
    localStorage.removeItem(SEQ_KEY);
  } catch {
    // ignore
  }
}

export function demoLogin(phone, password) {
  const user = users().find((u) => u.phone === phone);
  if (!user || user.password !== password) {
    return { error: "Wrong phone number or password. Try again." };
  }
  if (user.suspended) {
    return { error: "This account is suspended. Contact support for help." };
  }
  return { token: fakeToken(phone), user: publicUser(user) };
}

export function demoRegister(name, phone, password, role) {
  const all = users();
  if (all.some((u) => u.phone === phone)) {
    return { error: "That number is already registered. Log in instead." };
  }
  const safeRole = role === "runner" ? "runner" : "customer";
  const user = {
    id: "u_" + Date.now(),
    name, phone, role: safeRole,
    verified: safeRole !== "runner",
    suspended: false,
    created_at: Date.now(),
  };
  all.push({ ...user, password });
  saveUsers(all);
  return { token: fakeToken(phone), user };
}

export function demoCreateBooking(customer, service_id, pickup, dropoff) {
  const svc = SERVICES.find((s) => s.id === service_id);
  if (!svc) return { error: "Service not found." };
  const seq = read(SEQ_KEY, 105) + 1;
  write(SEQ_KEY, seq);
  const booking = {
    id: "BK-D" + seq,
    customer_id: customer.id, customer_name: customer.name,
    service_id, service_title: svc.title, service_category: svc.category,
    runner_id: null, runner_name: null,
    pickup, dropoff, scheduled_for: null,
    price_pula: svc.price, status: "pending",
    created_at: Date.now(), updated_at: Date.now(),
  };
  const all = bookings();
  all.unshift(booking);
  saveBookings(all);
  return { booking };
}

export function demoGetBookings(user) {
  const all = bookings();
  const list = user.role === "admin" ? all
    : user.role === "runner" ? all.filter((b) => b.runner_id === user.id)
    : all.filter((b) => b.customer_id === user.id);
  return withPhones(list);
}

// Phone numbers ride along on bookings that have been accepted, mirroring
// the live API. Pending bookings never expose them.
function withPhones(list) {
  const all = users();
  const phoneOf = (id) => {
    const u = all.find((x) => x.id === id);
    return u ? u.phone : null;
  };
  return list.map((b) => {
    if (b.status === "pending") return b;
    return {
      ...b,
      runner_phone: b.runner_id ? phoneOf(b.runner_id) : null,
      customer_phone: phoneOf(b.customer_id),
    };
  });
}

export function demoRunnerJobs() {
  return bookings().filter((b) => b.status === "pending" && !b.runner_id);
}

export function demoAcceptBooking(runner, id) {
  const all = bookings();
  const b = all.find((x) => x.id === id);
  if (!b) return { error: "Booking not found." };
  if (b.status !== "pending" || b.runner_id) {
    return { error: "This job was just taken by another runner." };
  }
  b.runner_id = runner.id;
  b.runner_name = runner.name;
  b.status = "accepted";
  b.updated_at = Date.now();
  saveBookings(all);
  return { booking: b };
}

export function demoAdvanceBooking(runner, id, status) {
  if (status !== "en_route" && status !== "delivered") {
    return { error: "Invalid status." };
  }
  const all = bookings();
  const b = all.find((x) => x.id === id);
  if (!b) return { error: "Booking not found." };
  if (b.runner_id !== runner.id) return { error: "This job is not assigned to you." };
  if (status === "en_route" && b.status !== "accepted") {
    return { error: "You can only pick up an accepted job." };
  }
  if (status === "delivered" && b.status !== "en_route") {
    return { error: "You can only deliver a job you picked up." };
  }
  b.status = status;
  b.updated_at = Date.now();
  if (status === "delivered") b.delivered_at = Date.now();
  saveBookings(all);
  return { booking: b };
}

export function demoCancelBooking(customer, id) {
  const all = bookings();
  const b = all.find((x) => x.id === id);
  if (!b) return { error: "Booking not found." };
  if (b.customer_id !== customer.id && customer.role !== "admin") {
    return { error: "This is not your booking." };
  }
  if (b.status !== "pending" && b.status !== "accepted") {
    return { error: "This booking can no longer be cancelled." };
  }
  b.status = "cancelled";
  b.updated_at = Date.now();
  saveBookings(all);
  return { booking: b };
}

export function demoEarnings(runner) {
  const mine = bookings().filter(
    (b) => b.runner_id === runner.id && b.status === "delivered"
  );
  return {
    total_pula: mine.reduce((sum, b) => sum + (b.price_pula || 0), 0),
    job_count: mine.length,
    earnings: mine.map((b) => ({
      booking_id: b.id,
      service_title: b.service_title,
      price_pula: b.price_pula,
      delivered_at: b.delivered_at || b.updated_at,
    })),
  };
}

export function demoAdminStats() {
  const all = users();
  const bk = bookings();
  const byStatus = {};
  for (const b of bk) byStatus[b.status] = (byStatus[b.status] || 0) + 1;
  const count = (role) => all.filter((u) => u.role === role && !u.suspended).length;
  return {
    users: {
      total: all.length,
      customers: count("customer"),
      runners: count("runner"),
      admins: count("admin"),
    },
    bookings_by_status: byStatus,
    total_revenue_pula: bk
      .filter((b) => b.status === "delivered")
      .reduce((sum, b) => sum + (b.price_pula || 0), 0),
    pending_reviews: all.filter((u) => u.role === "runner" && !u.verified && !u.suspended).length,
  };
}

export function demoAdminUsers(role) {
  const all = users().map(publicUser);
  return role ? all.filter((u) => u.role === role) : all;
}

export function demoUpdateUser(id, patch) {
  const all = users();
  const u = all.find((x) => x.id === id);
  if (!u) return { error: "User not found." };
  if (patch.role && ["customer", "runner", "admin"].includes(patch.role)) u.role = patch.role;
  if (typeof patch.verified === "boolean") u.verified = patch.verified;
  if (typeof patch.suspended === "boolean") u.suspended = patch.suspended;
  saveUsers(all);
  return { user: publicUser(u) };
}

export function demoAdminBookings(status) {
  const all = withPhones(bookings());
  return status ? all.filter((b) => b.status === status) : all;
}

// ---------- Support queries (demo) ----------

function demoQueries() {
  let q = read(QUERIES_KEY, null);
  if (!q) {
    q = [];
    write(QUERIES_KEY, q);
  }
  return q;
}

export function demoSubmitQuery(user, subject, message) {
  const s = String(subject || "").trim();
  const m = String(message || "").trim();
  if (!s) return { error: "Please add a subject." };
  if (!m) return { error: "Please write your message." };
  const q = {
    id: "Q" + Date.now(),
    user_id: user.id, name: user.name, phone: user.phone,
    subject: s.slice(0, 120), message: m.slice(0, 2000),
    status: "open", created_at: Date.now(),
  };
  const all = demoQueries();
  all.unshift(q);
  write(QUERIES_KEY, all);
  return { query: q };
}

export function demoGetQueries(user) {
  return demoQueries().filter((q) => q.user_id === user.id);
}

export function demoAdminQueries(status) {
  const all = demoQueries();
  return status ? all.filter((q) => q.status === status) : all;
}

export function demoUpdateQuery(id, status) {
  if (status !== "open" && status !== "closed") return { error: "Invalid status." };
  const all = demoQueries();
  const q = all.find((x) => x.id === id);
  if (!q) return { error: "Query not found." };
  q.status = status;
  write(QUERIES_KEY, all);
  return { query: q };
}

// ---------- Live runners (demo) ----------

export function demoLiveRunners() {
  return [
    {
      id: "u_runner", display_name: "Portia S.", vehicle: "Honda Fit",
      zone: "CBD / Main Mall", phone: "72111111",
      lat: -24.6282, lng: 25.9231,
      location_updated_at: new Date(Date.now() - 60000).toISOString(),
    },
  ];
}
