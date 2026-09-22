// Backend client with silent offline fallback.
// The APK must never show errors when offline or when no backend is configured,
// so every call resolves to the bundled local demo data on any failure.

const BASE = import.meta.env.VITE_API_URL;
const TIMEOUT_MS = 8000;

function withTimeout(promise) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return { signal: ctrl.signal, done: () => clearTimeout(timer) };
}

export async function apiGet(path, fallback) {
  if (!BASE) return fallback;
  const { signal, done } = withTimeout();
  try {
    const res = await fetch(`${BASE}${path}`, { signal });
    done();
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    done();
    return fallback;
  }
}

export async function apiPost(path, body, fallback = null) {
  if (!BASE) return fallback;
  const { signal, done } = withTimeout();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    done();
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    done();
    return fallback;
  }
}

// Domain helpers. Each falls back to bundled data from data.js.
export const getRunners = (fallback) => apiGet("/api/runners", fallback);
export const getServices = (fallback) => apiGet("/api/services", fallback);
export const getZones = (fallback) => apiGet("/api/zones", fallback);
