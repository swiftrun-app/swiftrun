import { useState } from "react";
import Sheet from "../components/Sheet.jsx";

const STATUS_LABEL = {
  pending: "Pending",
  accepted: "Accepted",
  enroute: "En route",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_ICON = {
  pending: "⏳",
  accepted: "✅",
  enroute: "🛵",
  delivered: "📦",
  cancelled: "✕",
};

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function Bookings({ bookings, onCancel }) {
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const active = bookings.filter((b) => b.status !== "delivered" && b.status !== "cancelled");
  const past = bookings.filter((b) => b.status === "delivered" || b.status === "cancelled");

  const renderRow = (b) => (
    <div className="card clickable" key={b.id} onClick={() => { setSelected(b); setConfirming(false); }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 26 }}>{STATUS_ICON[b.status] || "📦"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{b.serviceTitle}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            {b.runnerName} · {b.pickup} to {b.dropoff}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className={`badge ${b.status}`}>{STATUS_LABEL[b.status]}</span>
          <div style={{ fontWeight: 800, marginTop: 4 }}>P{b.price}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="screen">
      <h2>Bookings</h2>
      <p className="sub">Track every run from request to delivery.</p>

      {bookings.length === 0 && (
        <div className="empty">
          <div className="big">🧾</div>
          <div>No bookings yet.</div>
          <div style={{ fontSize: 13 }}>Find a runner on Home and book your first run.</div>
        </div>
      )}

      {active.length > 0 && (
        <>
          <div className="sec-row"><h3>Active</h3><span>{active.length}</span></div>
          {active.map(renderRow)}
        </>
      )}

      {past.length > 0 && (
        <>
          <div className="sec-row"><h3>History</h3><span>{past.length}</span></div>
          {past.map(renderRow)}
        </>
      )}

      {selected && (
        <Sheet onClose={() => setSelected(null)}>
          <h3>{selected.serviceTitle}</h3>
          <p className="sub">{selected.id} · {fmtDate(selected.createdAt)}</p>
          <div style={{ display: "flex", gap: 8, margin: "8px 0 14px" }}>
            <span className={`badge ${selected.status}`}>{STATUS_LABEL[selected.status]}</span>
            <span className="badge" style={{ background: "#eaf4ff", color: "#0a63c4" }}>{selected.category}</span>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.9 }}>
            <div>🏃 <b>Runner:</b> {selected.runnerName}</div>
            <div>📍 <b>From:</b> {selected.pickup}</div>
            <div>🏁 <b>To:</b> {selected.dropoff}</div>
            {selected.note && <div>📝 <b>Note:</b> {selected.note}</div>}
            <div>💰 <b>Price:</b> P{selected.price} · pay on delivery</div>
          </div>
          {(selected.status === "pending" || selected.status === "accepted") && (
            <div style={{ marginTop: 16 }}>
              {confirming ? (
                <div className="btnrow">
                  <button className="btn ghost" onClick={() => setConfirming(false)}>Keep it</button>
                  <button
                    className="btn danger-ghost"
                    onClick={() => { onCancel(selected.id); setSelected(null); }}
                  >
                    Yes, cancel
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
