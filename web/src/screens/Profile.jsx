import { useState } from "react";
import { CITIES } from "../data.js";

const SUPPORT_PHONE = "72173308";

export default function Profile({ profile, onSaveProfile }) {
  const [name, setName] = useState(profile.name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [saved, setSaved] = useState(false);

  const save = () => {
    onSaveProfile({ name: name.trim(), phone: phone.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const initial = (name.trim()[0] || "🙂").toUpperCase();

  return (
    <div className="screen">
      <h2>Profile</h2>
      <p className="sub">Your details stay on this device.</p>

      <div className="card">
        <div className="profile-head">
          <div className="avatar">{name.trim() ? initial : "🙂"}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{name.trim() || "SwiftRun user"}</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {phone.trim() ? `+267 ${phone.trim()}` : "Add your number below"}
            </div>
          </div>
        </div>
        <div className="field">
          <label>Your name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Thato M." maxLength={40} />
        </div>
        <div className="field">
          <label>Phone number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
            placeholder="e.g. 71234567"
            inputMode="numeric"
          />
        </div>
        <button className="btn primary" onClick={save}>
          {saved ? "Saved ✓" : "Save details"}
        </button>
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
        SwiftRun 2.0. The runner marketplace for Botswana. Book verified runners for errands,
        food, groceries, documents and parcels. Works offline. Made in Gaborone.
      </div>
    </div>
  );
}
