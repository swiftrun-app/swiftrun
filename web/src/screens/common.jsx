// Shared bits for the role screens: status labels, date formatting,
// small loading and empty states.

import LiveMap from "../components/LiveMap.jsx";

function LiveRunnerPin({ lat, lng, name }) {
  return <LiveMap pins={[{ lat, lng, label: name || "Runner" }]} height={170} zoom={14} />;
}

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

export function BookingDetail({ b, role }) {
  const phonesVisible = b.status !== "pending";
  const liveFresh =
    phonesVisible &&
    (b.status === "accepted" || b.status === "en_route") &&
    typeof b.runner_lat === "number" &&
    typeof b.runner_lng === "number" &&
    b.runner_location_updated_at &&
    Date.now() - new Date(String(b.runner_location_updated_at).replace(" ", "T") + "Z").getTime() < 5 * 60000;
  return (
    <div style={{ fontSize: 14, lineHeight: 1.9 }}>
      <div>🏃 <b>Runner:</b> {b.runner_name || "Not assigned yet"}</div>
      <div>🧾 <b>Customer:</b> {b.customer_name || "-"}</div>
      <div>📍 <b>From:</b> {b.pickup}</div>
      <div>🏁 <b>To:</b> {b.dropoff}</div>
      <div>💰 <b>Price:</b> P{b.price_pula} · pay on delivery</div>
      {phonesVisible && role === "customer" && b.runner_phone && (
        <div style={{ marginTop: 6 }}>
          <a href={`tel:+267${b.runner_phone}`} style={{ textDecoration: "none" }}>
            <button className="btn primary sm" style={{ pointerEvents: "none" }}>
              📞 Call runner · +267 {b.runner_phone}
            </button>
          </a>
        </div>
      )}
      {phonesVisible && role === "runner" && b.customer_phone && (
        <div style={{ marginTop: 6 }}>
          <a href={`tel:+267${b.customer_phone}`} style={{ textDecoration: "none" }}>
            <button className="btn primary sm" style={{ pointerEvents: "none" }}>
              📞 Call sender · +267 {b.customer_phone}
            </button>
          </a>
        </div>
      )}
      {phonesVisible && role === "admin" && (b.runner_phone || b.customer_phone) && (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          📞 Runner +267 {b.runner_phone} · Sender +267 {b.customer_phone}
        </div>
      )}
      {role === "customer" && liveFresh && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>🛵 Your runner is on the way</div>
          <LiveRunnerPin lat={b.runner_lat} lng={b.runner_lng} name={b.runner_name} />
        </div>
      )}
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{b.id} · {fmtDateTime(b.created_at)}</div>
    </div>
  );
}
