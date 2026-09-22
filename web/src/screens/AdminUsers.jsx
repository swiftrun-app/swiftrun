import { useCallback, useEffect, useState } from "react";
import { adminUsers, adminUpdateUser } from "../api.js";
import { EmptyState, ErrorState, Loading, fmtDate } from "./common.jsx";

const ROLE_FILTERS = [
  { id: "", label: "All" },
  { id: "customer", label: "Senders" },
  { id: "runner", label: "Runners" },
  { id: "admin", label: "Admins" },
];

const ROLE_LABEL = { customer: "Sender", runner: "Runner", admin: "Admin" };

export default function AdminUsers() {
  const [role, setRole] = useState("");
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (r) => {
    setError("");
    try {
      setList(await adminUsers(r));
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not load users.");
    }
  }, []);

  useEffect(() => {
    load(role);
  }, [load, role]);

  const patch = async (id, p) => {
    if (busyId) return;
    setBusyId(id);
    setError("");
    try {
      await adminUpdateUser(id, p);
      await load(role);
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not update this user.");
    } finally {
      setBusyId(null);
    }
  };

  if (list === null && !error) return <Loading label="Loading users..." />;
  if (error && list === null)
    return <div className="screen"><h2>Users</h2><ErrorState message={error} onRetry={() => load(role)} /></div>;

  const users = list || [];

  return (
    <div className="screen">
      <h2>Users</h2>
      <p className="sub">Verify runners, manage roles and access.</p>

      {error && <div className="err">{error}</div>}

      <div className="chips">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.id}
            className={role === f.id ? "chip active" : "chip"}
            onClick={() => setRole(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {users.length === 0 && <EmptyState icon="👥" title="No users here." />}

      {users.map((u) => (
        <div className="card" key={u.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar">{(u.name || "?")[0].toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {u.name}
                {u.suspended && <span className="badge cancelled" style={{ marginLeft: 8 }}>Suspended</span>}
                {!u.verified && u.role === "runner" && (
                  <span className="badge pending" style={{ marginLeft: 8 }}>Unverified</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                +267 {u.phone} · {ROLE_LABEL[u.role] || u.role} · joined {fmtDate(u.created_at)}
              </div>
            </div>
          </div>
          <div className="user-actions">
            {u.role === "runner" && !u.verified && !u.suspended && (
              <button className="btn primary sm" onClick={() => patch(u.id, { verified: true })} disabled={busyId !== null}>
                Verify runner
              </button>
            )}
            <button
              className="btn ghost sm"
              onClick={() => patch(u.id, { suspended: !u.suspended })}
              disabled={busyId !== null}
            >
              {u.suspended ? "Activate" : "Suspend"}
            </button>
            <select
              className="role-select"
              value={u.role}
              disabled={busyId !== null}
              onChange={(e) => patch(u.id, { role: e.target.value })}
              aria-label="Change role"
            >
              <option value="customer">Sender</option>
              <option value="runner">Runner</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
