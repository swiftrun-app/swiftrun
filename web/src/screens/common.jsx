// Shared bits for the role screens: status labels, date formatting,
// small loading and empty states.

export const STATUS_LABEL = {
  pending: "Pending",
  accepted: "Accepted",
  en_route: "En route",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_ICON = {
  pending: "⏳",
  accepted: "✅",
  en_route: "🛵",
  delivered: "📦",
  cancelled: "✕",
};

export function statusClass(status) {
  return status === "en_route" ? "enroute" : status;
}

export function fmtDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function fmtDateTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function Loading({ label = "Loading..." }) {
  return (
    <div className="screen">
      <div className="empty">
        <div className="big">⏳</div>
        <div>{label}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon = "📦", title, hint }) {
  return (
    <div className="empty">
      <div className="big">{icon}</div>
      <div>{title}</div>
      {hint && <div style={{ fontSize: 13, color: "var(--muted)" }}>{hint}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty">
      <div className="big">⚠️</div>
      <div>{message || "Something went wrong."}</div>
      {onRetry && (
        <button className="btn ghost" style={{ marginTop: 12 }} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function BookingCard({ b, onOpen, children }) {
  return (
    <div className="card clickable" onClick={onOpen}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 26 }}>{STATUS_ICON[b.status] || "📦"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{b.service_title}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            {b.runner_name || "Finding a runner"} · {b.pickup} to {b.dropoff}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className={`badge ${statusClass(b.status)}`}>{STATUS_LABEL[b.status] || b.status}</span>
          <div style={{ fontWeight: 800, marginTop: 4 }}>P{b.price_pula}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function BookingDetail({ b }) {
  return (
    <div style={{ fontSize: 14, lineHeight: 1.9 }}>
      <div>🏃 <b>Runner:</b> {b.runner_name || "Not assigned yet"}</div>
      <div>🧾 <b>Customer:</b> {b.customer_name || "-"}</div>
      <div>📍 <b>From:</b> {b.pickup}</div>
      <div>🏁 <b>To:</b> {b.dropoff}</div>
      <div>💰 <b>Price:</b> P{b.price_pula} · pay on delivery</div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{b.id} · {fmtDateTime(b.created_at)}</div>
    </div>
  );
}
