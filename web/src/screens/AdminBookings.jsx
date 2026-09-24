import { useCallback, useEffect, useState } from "react";
import Sheet from "../components/Sheet.jsx";
import { adminBookings } from "../api.js";
import {
  BookingCard, BookingDetail, EmptyState, ErrorState, Loading,
  STATUS_LABEL, statusClass,
} from "./common.jsx";

const FILTERS = ["", "pending", "accepted", "en_route", "delivered", "cancelled"];

export default function AdminBookings() {
  const [status, setStatus] = useState("");
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (s) => {
    setError("");
    try {
      setList(await adminBookings(s));
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not load bookings.");
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [load, status]);

  if (list === null && !error) return <Loading label="Loading bookings..." />;
  if (error && list === null)
    return <div className="screen"><h2>Bookings</h2><ErrorState message={error} onRetry={() => load(status)} /></div>;

  const bookings = list || [];

  return (
    <div className="screen">
      <h2>Bookings</h2>
      <p className="sub">Every booking on the platform.</p>

      {error && <div className="err">{error}</div>}

      <div className="chips">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={status === f ? "chip active" : "chip"}
            onClick={() => setStatus(f)}
          >
            {f === "" ? "All" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {bookings.length === 0 && <EmptyState icon="🧾" title="No bookings with this status." />}

      {bookings.map((b) => (
        <BookingCard key={b.id} b={b} onOpen={() => setSelected(b)} />
      ))}

      {selected && (
        <Sheet onClose={() => setSelected(null)}>
          <h3>{selected.service_title}</h3>
          <div style={{ display: "flex", gap: 8, margin: "8px 0 14px" }}>
            <span className={`badge ${statusClass(selected.status)}`}>{STATUS_LABEL[selected.status]}</span>
          </div>
          <BookingDetail b={selected} role="admin" />
        </Sheet>
      )}
    </div>
  );
}
