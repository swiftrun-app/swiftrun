import { useCallback, useEffect, useState } from "react";
import logo from "./logo.png";
import Home from "./screens/Home.jsx";
import MapScreen from "./screens/Map.jsx";
import Bookings from "./screens/Bookings.jsx";
import Activity from "./screens/Activity.jsx";
import Profile from "./screens/Profile.jsx";
import { SEED_BOOKINGS, SEED_NOTIFICATIONS } from "./data.js";

const TABS = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "map", label: "Map", icon: "🗺️" },
  { id: "bookings", label: "Bookings", icon: "🧾" },
  { id: "activity", label: "Activity", icon: "🔔" },
  { id: "profile", label: "Profile", icon: "👤" },
];

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
    // Storage full or unavailable. The app still works in memory.
  }
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [bookings, setBookings] = useState(() => load("sr_bookings", SEED_BOOKINGS));
  const [notifications, setNotifications] = useState(() => load("sr_notifs", SEED_NOTIFICATIONS));
  const [profile, setProfile] = useState(() => load("sr_profile", { name: "", phone: "" }));

  useEffect(() => save("sr_bookings", bookings), [bookings]);
  useEffect(() => save("sr_notifs", notifications), [notifications]);
  useEffect(() => save("sr_profile", profile), [profile]);

  const pushNotification = useCallback((title, body) => {
    setNotifications((prev) => [
      { id: "n" + Date.now(), title, body, time: "Just now", unread: true },
      ...prev,
    ]);
  }, []);

  const handleBook = useCallback(
    (booking) => {
      setBookings((prev) => [booking, ...prev]);
      pushNotification(
        "Booking confirmed",
        `${booking.serviceTitle} with ${booking.runnerName}. ${booking.runnerName.split(" ")[0]} is being notified now.`
      );
      setTab("bookings");
    },
    [pushNotification]
  );

  const handleCancel = useCallback(
    (id) => {
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
      const b = bookings.find((x) => x.id === id);
      pushNotification("Booking cancelled", b ? `${b.serviceTitle} (${b.id}) was cancelled. No charge.` : "A booking was cancelled. No charge.");
    },
    [bookings, pushNotification]
  );

  const handleReadAll = useCallback(() => {
    setNotifications((prev) => (prev.some((n) => n.unread) ? prev.map((n) => ({ ...n, unread: false })) : prev));
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="app">
      <header className="topbar">
        <img className="logo" src={logo} alt="SwiftRun" />
        <div className="brand">
          Swift<span>Run</span>
        </div>
        <div className="loc">📍 Gaborone</div>
      </header>

      {tab === "home" && <Home onBook={handleBook} />}
      {tab === "map" && <MapScreen />}
      {tab === "bookings" && <Bookings bookings={bookings} onCancel={handleCancel} />}
      {tab === "activity" && <Activity notifications={notifications} onReadAll={handleReadAll} />}
      {tab === "profile" && <Profile profile={profile} onSaveProfile={setProfile} />}

      <nav className="tabbar">
        {TABS.map((t) => (
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
