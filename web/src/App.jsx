import { useCallback, useEffect, useState } from "react";
import logo from "./logo.png";
import Auth from "./screens/Auth.jsx";
import Home from "./screens/Home.jsx";
import MapScreen from "./screens/Map.jsx";
import Bookings from "./screens/Bookings.jsx";
import Activity from "./screens/Activity.jsx";
import Profile from "./screens/Profile.jsx";
import RunnerJobs from "./screens/RunnerJobs.jsx";
import RunnerMyJobs from "./screens/RunnerMyJobs.jsx";
import RunnerEarnings from "./screens/RunnerEarnings.jsx";
import AdminOverview from "./screens/AdminOverview.jsx";
import AdminUsers from "./screens/AdminUsers.jsx";
import AdminBookings from "./screens/AdminBookings.jsx";
import {
  apiReady, isDemo, onUnauthorized, currentUser, clearSession,
} from "./api.js";
import { SEED_NOTIFICATIONS } from "./data.js";

const TABS = {
  customer: [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "map", label: "Map", icon: "🗺️" },
    { id: "bookings", label: "Bookings", icon: "🧾" },
    { id: "activity", label: "Activity", icon: "🔔" },
    { id: "profile", label: "Profile", icon: "👤" },
  ],
  runner: [
    { id: "jobs", label: "Jobs", icon: "🛵" },
    { id: "myjobs", label: "My Jobs", icon: "📦" },
    { id: "earnings", label: "Earnings", icon: "💰" },
    { id: "profile", label: "Profile", icon: "👤" },
  ],
  admin: [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "bookings", label: "Bookings", icon: "🧾" },
    { id: "profile", label: "Profile", icon: "👤" },
  ],
};

const DEFAULT_TAB = { customer: "home", runner: "jobs", admin: "overview" };
const TOPBAR_RIGHT = { customer: "📍 Gaborone", runner: "🛵 Runner", admin: "📊 Admin" };

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable. The app still works in memory.
  }
}

export default function App() {
  const [booted, setBooted] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("home");
  const [notifications, setNotifications] = useState(SEED_NOTIFICATIONS);

  // Startup: detect demo vs live, then restore the session.
  useEffect(() => {
    let alive = true;
    (async () => {
      await apiReady();
      if (!alive) return;
      setDemoMode(isDemo());
      const user = currentUser();
      if (user) {
        setSession(user);
        setTab(DEFAULT_TAB[user.role] || "home");
        setNotifications(load(`sr_notifs_${user.id}`, SEED_NOTIFICATIONS));
      }
      setBooted(true);
    })();
    onUnauthorized(() => {
      setSession(null);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (session) save(`sr_notifs_${session.id}`, notifications);
  }, [notifications, session]);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const pushNotification = useCallback((title, body) => {
    setNotifications((prev) => [
      { id: "n" + Date.now(), title, body, time: "Just now", unread: true },
      ...prev,
    ]);
  }, []);

  const handleBook = useCallback(
    (booking) => {
      pushNotification(
        "Booking confirmed",
        `${booking.service_title} booked for P${booking.price_pula}. ${booking.runner_name ? booking.runner_name + " is on it." : "A runner will accept it shortly."}`
      );
      setTab("bookings");
    },
    [pushNotification]
  );

  const handleReadAll = useCallback(() => {
    setNotifications((prev) => (prev.some((n) => n.unread) ? prev.map((n) => ({ ...n, unread: false })) : prev));
  }, []);

  if (!booted) {
    return (
      <div className="app">
        <div className="screen">
          <div className="empty">
            <img src={logo} alt="SwiftRun" style={{ width: 72, height: 72, borderRadius: 18 }} />
            <div style={{ marginTop: 12, fontWeight: 700 }}>SwiftRun</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Starting up...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app">
        <Auth
          onAuth={(user) => {
            setSession(user);
            setTab(DEFAULT_TAB[user.role] || "home");
            setNotifications(load(`sr_notifs_${user.id}`, SEED_NOTIFICATIONS));
          }}
        />
      </div>
    );
  }

  const role = session.role || "customer";
  const tabs = TABS[role] || TABS.customer;
  const unreadCount = role === "customer" ? notifications.filter((n) => n.unread).length : 0;

  return (
    <div className="app">
      <header className="topbar">
        <img className="logo" src={logo} alt="SwiftRun" />
        <div className="brand">
          Swift<span>Run</span>
        </div>
        {demoMode && <span className="demo-pill">Demo</span>}
        <div className="loc">{TOPBAR_RIGHT[role] || "📍 Gaborone"}</div>
      </header>

      {role === "customer" && tab === "home" && <Home onBook={handleBook} />}
      {role === "customer" && tab === "map" && <MapScreen />}
      {role === "customer" && tab === "bookings" && <Bookings />}
      {role === "customer" && tab === "activity" && (
        <Activity notifications={notifications} onReadAll={handleReadAll} />
      )}

      {role === "runner" && tab === "jobs" && <RunnerJobs onAccepted={() => setTab("myjobs")} />}
      {role === "runner" && tab === "myjobs" && <RunnerMyJobs />}
      {role === "runner" && tab === "earnings" && <RunnerEarnings />}

      {role === "admin" && tab === "overview" && <AdminOverview />}
      {role === "admin" && tab === "users" && <AdminUsers />}
      {role === "admin" && tab === "bookings" && <AdminBookings />}

      {tab === "profile" && <Profile user={session} demoMode={demoMode} onLogout={logout} />}

      <nav className="tabbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "tab active" : "tab"}
            onClick={() => setTab(t.id)}
          >
            <span className="ti">{t.icon}</span>
            {t.label}
            {t.id === "activity" && unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  marginLeft: 34,
                  marginTop: 2,
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  borderRadius: 999,
                  minWidth: 18,
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 5px",
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
