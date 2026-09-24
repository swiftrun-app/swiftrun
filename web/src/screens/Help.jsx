import { useCallback, useEffect, useState } from "react";
import { getMyQueries, submitQuery } from "../api.js";
import { EmptyState, ErrorState, Loading, fmtDateTime } from "./common.jsx";

export default function Help() {
  const [queries, setQueries] = useState(null);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setQueries(await getMyQueries());
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not load your queries.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    if (sending) return;
    setError("");
    setSentOk(false);
    if (!subject.trim()) {
      setError("Please add a subject.");
      return;
    }
    if (!message.trim()) {
      setError("Please write your message.");
      return;
    }
    setSending(true);
    try {
      await submitQuery(subject.trim(), message.trim());
      setSubject("");
      setMessage("");
      setSentOk(true);
      await load();
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not send your query.");
    } finally {
      setSending(false);
    }
  };

  if (queries === null && !error) return <Loading label="Loading help..." />;
  if (error && queries === null)
    return (
      <div className="screen">
        <h2>Help</h2>
        <ErrorState message={error} onRetry={load} />
      </div>
    );

  const list = queries || [];

  return (
    <div className="screen">
      <h2>Help</h2>
      <p className="sub">Questions or complaints? Send them here. We reply by phone or WhatsApp.</p>

      <div className="card">
        <div className="field">
          <label>Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. My delivery is late"
            maxLength={120}
          />
        </div>
        <div className="field">
          <label>Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what happened..."
            rows={4}
            maxLength={2000}
          />
        </div>
        {error && <div className="err">{error}</div>}
        {sentOk && <div style={{ color: "#15803d", fontSize: 13, marginBottom: 8 }}>Sent. We will get back to you soon.</div>}
        <button className="btn primary" onClick={send} disabled={sending}>
          {sending ? "Sending..." : "Send query"}
        </button>
      </div>

      <div className="sec-row">
        <h3>My queries</h3>
        <span>{list.length}</span>
      </div>

      {list.length === 0 && <EmptyState icon="💬" title="No queries yet." hint="Anything you send will show up here." />}

      {list.map((q) => (
        <div className="card" key={q.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{q.subject}</div>
            <span className={q.status === "open" ? "badge pending" : "badge delivered"}>
              {q.status === "open" ? "Open" : "Closed"}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>{q.message}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{fmtDateTime(q.created_at)}</div>
        </div>
      ))}
    </div>
  );
}
