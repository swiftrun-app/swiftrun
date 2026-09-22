import { useCallback, useEffect, useState } from "react";
import { adminStats } from "../api.js";
import { ErrorState, Loading, STATUS_LABEL } from "./common.jsx";

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setStats(await adminStats());
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not load stats.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (stats === null && !error) return <Loading label="Loading overview..." />;
  if (error && stats === null)
    return <div className="screen"><h2>Overview</h2><ErrorState message={error} onRetry={load} /></div>;

  const users = stats?.users || {};
  const byStatus = stats?.bookings_by_status || {};
  const totalBookings = Object.values(byStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="screen">
      <h2>Overview</h2>
      <p className="sub">Platform at a glance.</p>

      {error && <div className="err">{error}</div>}

      <div className="sec-row"><h3>Users</h3><span>{users.total || 0} total</span></div>
      <div className="stat-grid">
        <div className="stat"><div className="sv">{users.customers ?? 0}</div><div className="sl">Senders</div></div>
        <div className="stat"><div className="sv">{users.runners ?? 0}</div><div className="sl">Runners</div></div>
        <div className="stat"><div className="sv">{users.admins ?? 0}</div><div className="sl">Admins</div></div>
      </div>

      <div className="sec-row"><h3>Bookings</h3><span>{totalBookings} total</span></div>
      <div className="card" style={{ padding: 6 }}>
        {Object.keys(STATUS_LABEL).map((s, i) => (
          <div
            key={s}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px",
              borderTop: i === 0 ? "none" : "1px solid var(--line)",
              fontSize: 14, fontWeight: 600,
            }}
          >
            {STATUS_LABEL[s]}
            <span style={{ marginLeft: "auto", fontWeight: 800 }}>{byStatus[s] || 0}</span>
          </div>
        ))}
      </div>

      <div className="sec-row"><h3>Money</h3></div>
      <div className="stat-grid">
        <div className="stat"><div className="sv">P{stats?.total_revenue_pula || 0}</div><div className="sl">Revenue</div></div>
        <div className="stat"><div className="sv">{stats?.pending_reviews ?? 0}</div><div className="sl">Runners to verify</div></div>
      </div>
    </div>
  );
}
