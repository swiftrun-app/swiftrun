import { useCallback, useEffect, useRef, useState } from "react";
import Sheet from "../components/Sheet.jsx";
import { getRunnerJobs, advanceBooking, postRunnerLocation, runnerGoOffline, isDemo } from "../api.js";
import {
  BookingCard, BookingDetail, EmptyState, ErrorState, Loading,
  STATUS_LABEL, statusClass,
} from "./common.jsx";

const NEXT_ACTION = {
  accepted: { label: "Pick up", status: "en_route" },
  en_route: { label: "Deliver", status: "delivered" },
};
const LOCATION_INTERVAL_MS = 30000;

function LocationToggle() {
  const [sharing, setSharing] = useState(false);
  const [locError, setLocError] = useState("");
  const sharingRef = useRef(false);

  useEffect(() => {
    if (!sharing) return;
    sharingRef.current = true;
    let timer = null;

    const post = () => {
      if (!navigator.geolocation) {
        setLocError("Location is not available on this device.");
        setSharing(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (!sharingRef.current) return;
          try {
            await postRunnerLocation(pos.coords.latitude, pos.coords.longitude);
            setLocError("");
          } catch {
            // Keep the toggle on and retry on the next interval.
          }
        },
        () => {
          setLocError("Location access was denied. Turn it on in your browser or phone settings to share your live location.");
          setSharing(false);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
      );
    };

    post();
    timer = setInterval(post, LOCATION_INTERVAL_MS);
    return () => {
      sharingRef.current = false;
      if (timer) clearInterval(timer);
    };
  }, [sharing]);

  const toggle = async () => {
    if (sharing) {
      try {
        await runnerGoOffline();
      } catch {
        // Offline flag is best-effort; the toggle still turns off locally.
      }
      setSharing(false);
    } else {
      setLocError("");
      setSharing(true);
    }
  };

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 26 }}>📡</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Share my live location</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            {sharing
              ? "On. Customers and admin can see where you are while you work."
              : "Off. Turn on so customers can follow your delivery."}
          </div>
        </div>
        <button
          className={sharing ? "btn primary sm" : "btn ghost sm"}
          onClick={toggle}
          aria-pressed={sharing}
        >
          {sharing ? "On" : "Off"}
        </button>
      </div>
      {locError && <div className="err" style={{ marginTop: 8 }}>{locError}</div>}
      {isDemo() && sharing && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
          Demo mode. Your location is not actually sent anywhere.
        </div>
      )}
    </div>
  );
}

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

      <LocationToggle />

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
          <BookingDetail b={selected} role="runner" />
          {renderAction(selected)}
        </Sheet>
      )}
    </div>
  );
}
