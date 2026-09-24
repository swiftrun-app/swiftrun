import { CITIES } from "../data.js";

const SUPPORT_PHONE = "72173308";
const ROLE_LABEL = { customer: "Sender", runner: "Runner", admin: "Admin" };

// The APK download link only makes sense on the website, not inside the app itself.
const SHOW_APK_LINK =
  typeof window !== "undefined" &&
  (window.location.protocol === "http:" || window.location.protocol === "https:");

export default function Profile({ user, demoMode, onLogout }) {
  const initial = ((user?.name || "?").trim()[0] || "?").toUpperCase();

  return (
    <div className="screen">
      <h2>Profile</h2>
      <p className="sub">Your account and support.</p>

      <div className="card">
        <div className="profile-head">
          <div className="avatar">{initial}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{user?.name || "SwiftRun user"}</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {user?.phone ? `+267 ${user.phone}` : "No number on file"}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="badge" style={{ background: "#eaf4ff", color: "#0a63c4" }}>
                {ROLE_LABEL[user?.role] || user?.role}
              </span>
              {user?.role === "runner" && (
                <span className={user?.verified ? "badge delivered" : "badge pending"}>
                  {user?.verified ? "Verified" : "Unverified"}
                </span>
              )}
              {demoMode && (
                <span className="badge" style={{ background: "#f3f4f6", color: "#4b5563" }}>
                  Demo mode
                </span>
              )}
            </div>
          </div>
        </div>
        {demoMode && (
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginTop: 4 }}>
            Demo mode. The app is offline and your data is stored on this device only.
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <button className="btn ghost" onClick={onLogout}>Log out</button>
        </div>
      </div>

      <div className="sec-row"><h3>Support</h3></div>
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 700 }}>Need help? Talk to us.</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Mon to Sat, 8am to 8pm.
        </div>
        <div className="support-grid">
          <a href={`tel:+267${SUPPORT_PHONE}`}>
            <button className="btn primary" style={{ pointerEvents: "none" }}>📞 Call us</button>
          </a>
          <a href={`https://wa.me/267${SUPPORT_PHONE}`} target="_blank" rel="noreferrer">
            <button className="btn ghost" style={{ pointerEvents: "none" }}>💬 WhatsApp</button>
          </a>
        </div>
        <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 10 }}>
          +267 {SUPPORT_PHONE}
        </div>
      </div>

      <div className="sec-row"><h3>Coverage</h3><span>Botswana wide</span></div>
      <div className="card">
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>
          SwiftRun delivers across Botswana.
        </div>
        <div className="city-strip">
          {CITIES.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
      </div>

      <div className="sec-row"><h3>About</h3></div>
      <div className="card" style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
        SwiftRun. The runner marketplace for Botswana. Book verified runners for errands,
        food, groceries, documents and parcels. Works offline. Made in Gaborone.
      </div>

      {SHOW_APK_LINK && (
        <>
          <div className="sec-row"><h3>Android app</h3></div>
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 700 }}>SwiftRun for Android</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, lineHeight: 1.6 }}>
              Download the app and keep it on your phone. No need to visit the website.
            </div>
            <div style={{ marginTop: 10 }}>
              <a href="/SwiftRun.apk" style={{ textDecoration: "none" }}>
                <button className="btn primary" style={{ pointerEvents: "none" }}>⬇️ Download SwiftRun.apk</button>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
