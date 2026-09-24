import { useCallback, useEffect, useState } from "react";
import { adminQueries, adminUpdateQuery } from "../api.js";
import { EmptyState, ErrorState, Loading, fmtDateTime } from "./common.jsx";

const FILTERS = [
  { id: "", label: "All" },
  { id: "open", label: "Open" },
  { id: "closed", label: "Closed" },
];

export default function AdminQueries() {
  const [status, setStatus] = useState("");
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (s) => {
    setError("");
    try {
      setList(await adminQueries(s));
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not load queries.");
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [load, status]);

  const flip = async (q) => {
    if (busyId) return;
    setBusyId(q.id);
    setError("");
    try {
      await adminUpdateQuery(q.id, q.status === "open" ? "closed" : "open");
      await load(status);
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not update this query.");
    } finally {
      setBusyId(null);
    }
  };

  if (list === null && !error) return <Loading label="Loading queries..." />;
  if (error && list === null)
    return (
      <div className="screen">
        <h2>Queries</h2>
        <ErrorState message={error} onRetry={() => load(status)} />
      </div>
    );

  const queries = list || [];

  return (
    <div className="screen">
      <h2>Queries</h2>
      <p className="sub">Complaints and questions from users. Reply by phone or WhatsApp.</p>

      {error && <div className="err">{error}</div>}

      <div className="chips">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={status === f.id ? "chip active" : "chip"}
            onClick={() => setStatus(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {queries.length === 0 && <EmptyState icon="💬" title="No queries here." />}

      {queries.map((q) => (
        <div className="card" key={q.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{q.subject}</div>
            <span className={q.status === "open" ? "badge pending" : "badge delivered"}>
              {q.status === "open" ? "Open" : "Closed"}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>{q.message}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            {q.name} · +267 {q.phone} · {fmtDateTime(q.created_at)}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <a href={`tel:+267${q.phone}`}>
              <button className="btn primary sm" style={{ pointerEvents: "none" }}>📞 Call user</button>
            </a>
            <a href={`https://wa.me/267${q.phone}`} target="_blank" rel="noreferrer">
              <button className="btn ghost sm" style={{ pointerEvents: "none" }}>💬 WhatsApp</button>
            </a>
            <button
              className="btn ghost sm"
              style={{ marginLeft: "auto" }}
              onClick={() => flip(q)}
              disabled={busyId !== null}
            >
              {q.status === "open" ? "Mark closed" : "Reopen"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
