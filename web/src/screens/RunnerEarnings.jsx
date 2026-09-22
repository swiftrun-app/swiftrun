import { useCallback, useEffect, useState } from "react";
import { getRunnerEarnings } from "../api.js";
import { EmptyState, ErrorState, Loading, fmtDate } from "./common.jsx";

export default function RunnerEarnings() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await getRunnerEarnings());
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not load earnings.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (data === null && !error) return <Loading label="Loading earnings..." />;
  if (error && data === null)
    return <div className="screen"><h2>Earnings</h2><ErrorState message={error} onRetry={load} /></div>;

  const total = data?.total_pula || 0;
  const count = data?.job_count || 0;
  const rows = data?.earnings || [];

  return (
    <div className="screen">
      <h2>Earnings</h2>
      <p className="sub">Paid out on delivered jobs.</p>

      {error && <div className="err">{error}</div>}

      <div className="stat-grid">
        <div className="stat">
          <div className="sv">P{total}</div>
          <div className="sl">Total earned</div>
        </div>
        <div className="stat">
          <div className="sv">{count}</div>
          <div className="sl">Jobs delivered</div>
        </div>
      </div>

      <div className="sec-row"><h3>Per job</h3><span>{rows.length}</span></div>

      {rows.length === 0 && (
        <EmptyState icon="💰" title="Nothing earned yet." hint="Deliver your first job and it shows up here." />
      )}

      {rows.map((e) => (
        <div className="card" key={e.booking_id}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 24 }}>✅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{e.service_title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {e.booking_id} · {fmtDate(e.delivered_at)}
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>P{e.price_pula}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
