import { useCallback, useEffect, useState } from "react";
import Sheet from "../components/Sheet.jsx";
import { getBookings, cancelBooking } from "../api.js";
import {
  BookingCard, BookingDetail, EmptyState, ErrorState, Loading,
  STATUS_LABEL, statusClass,
} from "./common.jsx";

export default function Bookings() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setBookings(await getBookings());
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not load bookings.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await cancelBooking(selected.id);
      setSelected(null);
      setConfirming(false);
      await load();
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not cancel this booking.");
    } finally {
      setBusy(false);
    }
  };

  if (bookings === null && !error) return <Loading label="Loading your bookings..." />;
  if (error && bookings === null) return <div className="screen"><h2>Bookings</h2><ErrorState message={error} onRetry={load} /></div>;

  const list = bookings || [];
  const active = list.filter((b) => b.status === "pending" || b.status === "accepted" || b.status === "en_route");
  const past = list.filter((b) => b.status === "delivered" || b.status === "cancelled");

  return (
    <div className="screen">
      <h2>Bookings</h2>
      <p className="sub">Track every run from request to delivery.</p>

      {error && <div className="err">{error}</div>}

      {list.length === 0 && (
        <EmptyState icon="🧾" title="No bookings yet." hint="Find a runner on Home and book your first run." />
      )}

      {active.length > 0 && (
        <>
          <div className="sec-row"><h3>Active</h3><span>{active.length}</span></div>
          {active.map((b) => (
            <BookingCard key={b.id} b={b} onOpen={() => { setSelected(b); setConfirming(false); }} />
          ))}
        </>
      )}

      {past.length > 0 && (
        <>
          <div className="sec-row"><h3>History</h3><span>{past.length}</span></div>
          {past.map((b) => (
            <BookingCard key={b.id} b={b} onOpen={() => { setSelected(b); setConfirming(false); }} />
          ))}
        </>
      )}

      {selected && (
        <Sheet onClose={() => setSelected(null)}>
          <h3>{selected.service_title}</h3>
          <div style={{ display: "flex", gap: 8, margin: "8px 0 14px" }}>
            <span className={`badge ${statusClass(selected.status)}`}>{STATUS_LABEL[selected.status]}</span>
            {selected.service_category && (
              <span className="badge" style={{ background: "#eaf4ff", color: "#0a63c4" }}>{selected.service_category}</span>
            )}
          </div>
          <BookingDetail b={selected} />
          {(selected.status === "pending" || selected.status === "accepted") && (
            <div style={{ marginTop: 16 }}>
              {confirming ? (
                <div className="btnrow">
                  <button className="btn ghost" onClick={() => setConfirming(false)} disabled={busy}>Keep it</button>
                  <button className="btn danger-ghost" onClick={cancel} disabled={busy}>
                    {busy ? "Cancelling..." : "Yes, cancel"}
                  </button>
                </div>
              ) : (
                <button className="btn danger-ghost" onClick={() => setConfirming(true)}>
                  Cancel booking
                </button>
              )}
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
