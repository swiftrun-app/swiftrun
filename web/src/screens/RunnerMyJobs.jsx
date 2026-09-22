import { useCallback, useEffect, useState } from "react";
import Sheet from "../components/Sheet.jsx";
import { getRunnerJobs, advanceBooking } from "../api.js";
import {
  BookingCard, BookingDetail, EmptyState, ErrorState, Loading,
  STATUS_LABEL, statusClass,
} from "./common.jsx";

const NEXT_ACTION = {
  accepted: { label: "Pick up", status: "en_route" },
  en_route: { label: "Deliver", status: "delivered" },
};

export default function RunnerMyJobs() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const all = await getRunnerJobs();
      setJobs(all.filter((b) => b.status !== "cancelled"));
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not load your jobs.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const advance = async (b, status) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await advanceBooking(b.id, status);
      setSelected(null);
      await load();
      return updated;
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not update this job.");
    } finally {
      setBusy(false);
    }
  };

  if (jobs === null && !error) return <Loading label="Loading your jobs..." />;
  if (error && jobs === null)
    return <div className="screen"><h2>My Jobs</h2><ErrorState message={error} onRetry={load} /></div>;

  const list = jobs || [];
  const active = list.filter((b) => b.status === "accepted" || b.status === "en_route");
  const done = list.filter((b) => b.status === "delivered");

  const renderAction = (b) => {
    const next = NEXT_ACTION[b.status];
    if (!next) return null;
    return (
      <div style={{ marginTop: 10 }}>
        <button className="btn primary" onClick={() => advance(b, next.status)} disabled={busy}>
          {busy ? "Updating..." : next.label}
        </button>
      </div>
    );
  };

  return (
    <div className="screen">
      <h2>My Jobs</h2>
      <p className="sub">Jobs you accepted. Update each step.</p>

      {error && <div className="err">{error}</div>}

      {list.length === 0 && (
        <EmptyState icon="📦" title="No jobs yet." hint="Accept a job from the Jobs tab to get started." />
      )}

      {active.length > 0 && (
        <>
          <div className="sec-row"><h3>Active</h3><span>{active.length}</span></div>
          {active.map((b) => (
            <BookingCard key={b.id} b={b} onOpen={() => setSelected(b)}>
              {renderAction(b)}
            </BookingCard>
          ))}
        </>
      )}

      {done.length > 0 && (
        <>
          <div className="sec-row"><h3>Completed</h3><span>{done.length}</span></div>
          {done.map((b) => (
            <BookingCard key={b.id} b={b} onOpen={() => setSelected(b)} />
          ))}
        </>
      )}

      {selected && (
        <Sheet onClose={() => setSelected(null)}>
          <h3>{selected.service_title}</h3>
          <div style={{ display: "flex", gap: 8, margin: "8px 0 14px" }}>
            <span className={`badge ${statusClass(selected.status)}`}>{STATUS_LABEL[selected.status]}</span>
          </div>
          <BookingDetail b={selected} />
          {renderAction(selected)}
        </Sheet>
      )}
    </div>
  );
}
