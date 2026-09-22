import { useCallback, useEffect, useState } from "react";
import { getJobs, acceptBooking } from "../api.js";
import { EmptyState, ErrorState, Loading } from "./common.jsx";

export default function RunnerJobs({ onAccepted }) {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setJobs(await getJobs());
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not load jobs.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const accept = async (id) => {
    if (accepting) return;
    setAccepting(id);
    setError("");
    try {
      await acceptBooking(id);
      await load();
      if (onAccepted) onAccepted();
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not accept this job.");
    } finally {
      setAccepting(null);
    }
  };

  if (jobs === null && !error) return <Loading label="Finding jobs near you..." />;
  if (error && jobs === null)
    return <div className="screen"><h2>Jobs</h2><ErrorState message={error} onRetry={load} /></div>;

  const list = jobs || [];

  return (
    <div className="screen">
      <h2>Jobs</h2>
      <p className="sub">Open requests near you. First to accept wins.</p>

      {error && <div className="err">{error}</div>}

      {list.length === 0 && (
        <EmptyState icon="🛵" title="No open jobs right now." hint="New requests show up here. Check back soon." />
      )}

      {list.map((b) => (
        <div className="card" key={b.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 26 }}>🧾</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{b.service_title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {b.customer_name || "Customer"} · {b.pickup} to {b.dropoff}
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>P{b.price_pula}</div>
          </div>
          <div style={{ marginTop: 10 }}>
            <button
              className="btn primary"
              onClick={() => accept(b.id)}
              disabled={accepting !== null}
            >
              {accepting === b.id ? "Accepting..." : "Accept job"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
