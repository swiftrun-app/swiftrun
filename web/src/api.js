// Backend client with token auth and one-shot demo-mode detection.
//
// BASE = VITE_API_URL (unset in the APK build, so the app runs fully offline).
// demoMode is true when BASE is unset OR a single /api/health probe at
// startup fails. The probe result is cached; every API function awaits it
// once and then routes to the live endpoints or the local demo store.

import * as demo from "./demo.js";
import { RUNNERS, SERVICES, ZONES } from "./data.js";

export const BASE = import.meta.env.VITE_API_URL || "";

let demoMode = !BASE;
let probePromise = null;

function withTimeout(ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(timer) };
}

async function probe() {
  if (!BASE) {
    demoMode = true;
    return demoMode;
  }
  const { signal, done } = withTimeout(6000);
  try {
    const res = await fetch(`${BASE}/api/health`, { signal });
    demoMode = !res.ok;
  } catch {
    demoMode = true;
  } finally {
    done();
  }
  return demoMode;
}

// Resolves when startup detection has finished. Safe to call many times.
export function apiReady() {
  if (!probePromise) probePromise = probe();
  return probePromise;
}

export function isDemo() {
  return demoMode;
}

function getToken() {
  try {
    return localStorage.getItem("sr_token");
  } catch {
    return null;
  }
}

export function currentUser() {
  try {
    const raw = localStorage.getItem("sr_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem("sr_token");
    localStorage.removeItem("sr_user");
  } catch {
    // ignore
  }
}

let unauthorizedHandler = null;
export function onUnauthorized(fn) {
  unauthorizedHandler = fn;
}

async function authFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const { signal, done } = withTimeout(12000);
  try {
    const res = await fetch(`${BASE}${path}`, { ...opts, headers, signal });
    done();
    if (res.status === 401) {
      clearSession();
      if (unauthorizedHandler) unauthorizedHandler();
      throw new Error("SESSION_EXPIRED");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed (${res.status}).`);
    }
    return data;
  } catch (err) {
    done();
    throw err;
  }
}

async function publicGet(path) {
  const { signal, done } = withTimeout(8000);
  try {
    const res = await fetch(`${BASE}${path}`, { signal });
    done();
    if (!res.ok) throw new Error(`Request failed (${res.status}).`);
    return await res.json();
  } catch (err) {
    done();
    throw err;
  }
}

function unwrap(data, key) {
  if (!data) return null;
  return data[key] !== undefined ? data[key] : data;
}

function okOrThrow(result, key) {
  if (result.error) throw new Error(result.error);
  return key ? result[key] : result;
}

// ---------- Auth ----------

export async function login(phone, password) {
  await apiReady();
  if (demoMode) return okOrThrow(demo.demoLogin(phone, password));
  const r = await authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
  if (!r.token || !r.user) throw new Error("Login failed. Try again.");
  return r;
}

export async function register(name, phone, password, role) {
  await apiReady();
  if (demoMode) return okOrThrow(demo.demoRegister(name, phone, password, role));
  const r = await authFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, phone, password, role }),
  });
  if (!r.token || !r.user) throw new Error("Signup failed. Try again.");
  return r;
}

// ---------- Catalog (unauthenticated) ----------

export async function getRunners() {
  await apiReady();
  if (demoMode) return RUNNERS;
  const d = await publicGet("/api/runners");
  const list = unwrap(d, "runners");
  return Array.isArray(list) ? list : RUNNERS;
}

export async function getServices() {
  await apiReady();
  if (demoMode) return SERVICES;
  const d = await publicGet("/api/services");
  const list = unwrap(d, "services");
  return Array.isArray(list) ? list : SERVICES;
}

export async function getZones() {
  await apiReady();
  if (demoMode) return ZONES;
  const d = await publicGet("/api/zones");
  const list = unwrap(d, "zones");
  return Array.isArray(list) ? list : ZONES;
}

// ---------- Bookings ----------

export async function getBookings() {
  await apiReady();
  const user = currentUser();
  if (demoMode) return user ? demo.demoGetBookings(user) : [];
  const r = await authFetch("/api/bookings");
  return unwrap(r, "bookings") || [];
}

export async function createBooking({ service_id, pickup, dropoff }) {
  await apiReady();
  const user = currentUser();
  if (demoMode) {
    if (!user) throw new Error("Please log in first.");
    return okOrThrow(demo.demoCreateBooking(user, service_id, pickup, dropoff), "booking");
  }
  const r = await authFetch("/api/bookings", {
    method: "POST",
    body: JSON.stringify({ service_id, pickup, dropoff }),
  });
  const b = unwrap(r, "booking");
  if (!b) throw new Error("Booking failed. Try again.");
  return b;
}

export async function acceptBooking(id) {
  await apiReady();
  const user = currentUser();
  if (demoMode) {
    if (!user) throw new Error("Please log in first.");
    return okOrThrow(demo.demoAcceptBooking(user, id), "booking");
  }
  const r = await authFetch(`/api/bookings/${id}/accept`, { method: "POST" });
  const b = unwrap(r, "booking");
  if (!b) throw new Error("Could not accept this job.");
  return b;
}

export async function advanceBooking(id, status) {
  await apiReady();
  const user = currentUser();
  if (demoMode) {
    if (!user) throw new Error("Please log in first.");
    return okOrThrow(demo.demoAdvanceBooking(user, id, status), "booking");
  }
  const r = await authFetch(`/api/bookings/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  const b = unwrap(r, "booking");
  if (!b) throw new Error("Could not update this job.");
  return b;
}

// Cancel exists in demo mode. The live contract has no cancel endpoint,
// so online we try a best-effort PATCH /api/bookings/:id/cancel and
// surface a clear message if the backend does not support it.
export async function cancelBooking(id) {
  await apiReady();
  const user = currentUser();
  if (demoMode) {
    if (!user) throw new Error("Please log in first.");
    return okOrThrow(demo.demoCancelBooking(user, id), "booking");
  }
  try {
    const r = await authFetch(`/api/bookings/${id}/cancel`, { method: "PATCH" });
    const b = unwrap(r, "booking");
    if (!b) throw new Error("Cancel is not supported by the server.");
    return b;
  } catch (err) {
    if (err.message === "SESSION_EXPIRED") throw err;
    throw new Error("Cancel is not available right now. Try again later.");
  }
}

// ---------- Runner ----------

export async function getJobs() {
  await apiReady();
  if (demoMode) return demo.demoRunnerJobs();
  const r = await authFetch("/api/jobs");
  return unwrap(r, "jobs") || [];
}

export async function getRunnerJobs() {
  await apiReady();
  const user = currentUser();
  if (demoMode) return user ? demo.demoGetBookings(user) : [];
  const r = await authFetch("/api/runner/jobs");
  return unwrap(r, "bookings") || [];
}

export async function getRunnerEarnings() {
  await apiReady();
  const user = currentUser();
  if (demoMode) return user ? demo.demoEarnings(user) : { total_pula: 0, job_count: 0, earnings: [] };
  return authFetch("/api/runner/earnings");
}

// ---------- Support queries ----------

export async function submitQuery(subject, message) {
  await apiReady();
  const user = currentUser();
  if (demoMode) {
    if (!user) throw new Error("Please log in first.");
    return okOrThrow(demo.demoSubmitQuery(user, subject, message), "query");
  }
  const r = await authFetch("/api/queries", {
    method: "POST",
    body: JSON.stringify({ subject, message }),
  });
  const q = unwrap(r, "query");
  if (!q) throw new Error("Could not send your query. Try again.");
  return q;
}

export async function getMyQueries() {
  await apiReady();
  const user = currentUser();
  if (demoMode) return user ? demo.demoGetQueries(user) : [];
  const r = await authFetch("/api/queries");
  return unwrap(r, "queries") || [];
}

export async function adminQueries(status = "") {
  await apiReady();
  if (demoMode) return demo.demoAdminQueries(status);
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  const r = await authFetch(`/api/queries${q}`);
  return unwrap(r, "queries") || [];
}

export async function adminUpdateQuery(id, status) {
  await apiReady();
  if (demoMode) return okOrThrow(demo.demoUpdateQuery(id, status), "query");
  const r = await authFetch(`/api/queries/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  const q = unwrap(r, "query");
  if (!q) throw new Error("Could not update this query.");
  return q;
}

// ---------- Runner live location ----------

export async function postRunnerLocation(lat, lng) {
  await apiReady();
  if (demoMode) return { ok: true, online: true };
  return authFetch("/api/runner/location", {
    method: "POST",
    body: JSON.stringify({ lat, lng }),
  });
}

export async function runnerGoOffline() {
  await apiReady();
  if (demoMode) return { ok: true, online: false };
  return authFetch("/api/runner/location", {
    method: "POST",
    body: JSON.stringify({ offline: true }),
  });
}

export async function getLiveRunners() {
  await apiReady();
  if (demoMode) return demo.demoLiveRunners();
  const r = await authFetch("/api/admin/runners/live");
  return unwrap(r, "runners") || [];
}

// ---------- Admin ----------

export async function adminStats() {
  await apiReady();
  if (demoMode) return demo.demoAdminStats();
  return authFetch("/api/admin/stats");
}

export async function adminUsers(role = "") {
  await apiReady();
  if (demoMode) return demo.demoAdminUsers(role);
  const q = role ? `?role=${encodeURIComponent(role)}` : "";
  const r = await authFetch(`/api/admin/users${q}`);
  return unwrap(r, "users") || [];
}

export async function adminUpdateUser(id, patch) {
  await apiReady();
  if (demoMode) return okOrThrow(demo.demoUpdateUser(id, patch), "user");
  const r = await authFetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const u = unwrap(r, "user");
  if (!u) throw new Error("Could not update this user.");
  return u;
}

export async function adminBookings(status = "") {
  await apiReady();
  if (demoMode) return demo.demoAdminBookings(status);
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  const r = await authFetch(`/api/admin/bookings${q}`);
  return unwrap(r, "bookings") || [];
}
