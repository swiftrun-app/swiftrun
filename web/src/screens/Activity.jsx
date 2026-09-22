import { useEffect } from "react";

export default function Activity({ notifications, onReadAll }) {
  useEffect(() => {
    const t = setTimeout(onReadAll, 800);
    return () => clearTimeout(t);
  }, [onReadAll]);

  return (
    <div className="screen">
      <h2>Activity</h2>
      <p className="sub">Booking updates and offers.</p>

      {notifications.length === 0 && (
        <div className="empty">
          <div className="big">🔔</div>
          <div>Nothing here yet.</div>
        </div>
      )}

      {notifications.map((n) => (
        <div className="card" key={n.id}>
          <div className="notif">
            <div className={n.unread ? "dot" : "dot read"} />
            <div>
              <div className="nt">{n.title}</div>
              <div className="nb">{n.body}</div>
              <div className="tm">{n.time}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
