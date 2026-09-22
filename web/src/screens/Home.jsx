import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, RUNNERS, SERVICES, ZONES, REVIEWS } from "../data.js";
import { getRunners, getServices } from "../api.js";
import Sheet from "../components/Sheet.jsx";

// Keyword based offline price and time estimator. No network needed.
const ESTIMATE_RULES = [
  { keys: ["food", "pizza", "kfc", "burger", "lunch", "dinner", "meal", "nando", "chicken", "eat"], cat: "Food", price: [45, 90], time: [25, 45] },
  { keys: ["grocer", "shopping", "pick n pay", "spar", "choppies", "shoprite", "list"], cat: "Groceries", price: [95, 180], time: [45, 90] },
  { keys: ["document", "contract", "passport", "legal", "paper", "certificate", "cv"], cat: "Documents", price: [60, 120], time: [30, 60] },
  { keys: ["parcel", "package", "box", "send", "courier"], cat: "Parcels", price: [50, 110], time: [30, 60] },
  { keys: ["medicine", "meds", "pharmacy", "prescription", "clicks", "pills"], cat: "Errands", price: [55, 100], time: [30, 50] },
  { keys: ["errand", "queue", "bank", "pay", "collect", "pickup", "pick up", "fetch"], cat: "Errands", price: [40, 90], time: [30, 60] },
];

function estimateFor(query) {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return null;
  for (const rule of ESTIMATE_RULES) {
    if (rule.keys.some((k) => q.includes(k))) return rule;
  }
  return { cat: "Errand", price: [40, 120], time: [30, 60], generic: true };
}

function stars(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export default function Home({ onBook }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [runners, setRunners] = useState(RUNNERS);
  const [services, setServices] = useState(SERVICES);
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(null);

  // Try the backend silently. Any failure keeps the bundled demo data.
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await getRunners(RUNNERS);
      const s = await getServices(SERVICES);
      if (alive) {
        setRunners(r);
        setServices(s);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const runnerById = useMemo(() => {
    const m = {};
    for (const r of runners) m[r.id] = r;
    return m;
  }, [runners]);

  const estimate = useMemo(() => estimateFor(query), [query]);

  const filtered = useMemo(
    () => (cat === "all" ? services : services.filter((s) => s.category === cat)),
    [services, cat]
  );

  const top = useMemo(() => [...runners].sort((a, b) => b.rating - a.rating).slice(0, 5), [runners]);

  const zoneName = (id) => (ZONES.find((z) => z.id === id) || {}).name || "Gaborone";

  return (
    <div className="screen">
      <h2>What do you need moved?</h2>
      <p className="sub">Verified runners across Gaborone. Pay on delivery.</p>

      <div className="searchbar">
        <span className="sic">🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you need moved?"
        />
      </div>

      {estimate && (
        <div className="estimate">
          <span className="etag">{estimate.cat}</span>
          <b>
            Est. P{estimate.price[0]} to P{estimate.price[1]}.
          </b>{" "}
          {estimate.time[0]} to {estimate.time[1]} min.
          {estimate.generic ? " Tap a runner below for an exact quote." : " Runners near you can do this now."}
        </div>
      )}

      <div className="chips">
        <button className={cat === "all" ? "chip active" : "chip"} onClick={() => setCat("all")}>
          ✨ All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={cat === c.id ? "chip active" : "chip"}
            onClick={() => setCat(c.id)}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div className="sec-row">
        <h3>Runner services</h3>
        <span>{filtered.length} available</span>
      </div>
      <div className="hscroll">
        {filtered.map((s) => {
          const r = runnerById[s.runnerId];
          if (!r) return null;
          return (
            <div className="svc-card" key={s.id} onClick={() => setSelected({ s, r })}>
              <div className="svc-top">
                <div className="avatar">{r.emoji}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</div>
                  <div className="stars">{stars(r.rating)} <span style={{ color: "#6b7280" }}>{r.rating.toFixed(2)}</span></div>
                </div>
              </div>
              <div className="t">{s.title}</div>
              <div className="r">{r.runs} runs completed</div>
              <div>
                <span className="catpill">{s.category}</span>
              </div>
              <div className="price-row">
                <span className="price">P{s.price}</span>
                <span className="eta">{s.eta}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sec-row">
        <h3>Top runners</h3>
        <span>This week</span>
      </div>
      <div className="lb-strip">
        {top.map((r, i) => (
          <div className="lb-item" key={r.id}>
            <span className="lb-rank">{["🥇", "🥈", "🥉", "4.", "5."][i]}</span>
            <div className="avatar" style={{ width: 36, height: 36, fontSize: 19 }}>{r.emoji}</div>
            <div>
              <div className="n">{r.name}</div>
              <div className="s">★ {r.rating.toFixed(2)} · {zoneName(r.zone)}</div>
            </div>
          </div>
        ))}
      </div>

      {selected && !booking && (
        <Sheet onClose={() => setSelected(null)}>
          <h3>{selected.s.title}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
            <div className="avatar">{selected.r.emoji}</div>
            <div>
              <div style={{ fontWeight: 700 }}>{selected.r.name} {selected.r.verified ? "✓" : ""}</div>
              <div className="stars">{stars(selected.r.rating)} <span style={{ color: "#6b7280" }}>{selected.r.rating.toFixed(2)} · {selected.r.runs} runs</span></div>
            </div>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: "#374151" }}>{selected.s.desc}</p>
          <div className="price-row" style={{ margin: "12px 0" }}>
            <span className="price" style={{ fontSize: 22 }}>P{selected.s.price}</span>
            <span className="eta">{selected.s.eta} · {zoneName(selected.r.zone)}</span>
          </div>
          <h4 style={{ margin: "14px 0 4px", fontSize: 14 }}>Reviews</h4>
          {REVIEWS.map((rv, i) => (
            <div className="review" key={i}>
              <div className="rn">{rv.name} <span className="stars">{"★".repeat(rv.rating)}</span></div>
              <div className="rt">{rv.text}</div>
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={() => setBooking({ s: selected.s, r: selected.r })}>
              Book this run
            </button>
          </div>
        </Sheet>
      )}

      {booking && (
        <BookingForm
          service={booking.s}
          runner={booking.r}
          onClose={() => setBooking(null)}
          onConfirm={(b) => {
            onBook(b);
            setBooking(null);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function BookingForm({ service, runner, onClose, onConfirm }) {
  const [pickup, setPickup] = useState(ZONES[0].id);
  const [dropoff, setDropoff] = useState(ZONES[2].id);
  const [note, setNote] = useState("");

  const zoneName = (id) => (ZONES.find((z) => z.id === id) || {}).name || "";

  const confirm = () => {
    onConfirm({
      id: "BK-" + Math.floor(1000 + Math.random() * 9000),
      serviceTitle: service.title,
      runnerName: runner.name,
      category: service.category,
      pickup: zoneName(pickup),
      dropoff: zoneName(dropoff),
      note: note.trim(),
      price: service.price,
      status: "pending",
      createdAt: Date.now(),
    });
  };

  return (
    <Sheet onClose={onClose}>
      <h3>Book: {service.title}</h3>
      <p className="sub">Runner: {runner.name} · P{service.price} · pay on delivery.</p>
      <div className="field">
        <label>Pickup zone</label>
        <select value={pickup} onChange={(e) => setPickup(e.target.value)}>
          {ZONES.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Drop off zone</label>
        <select value={dropoff} onChange={(e) => setDropoff(e.target.value)}>
          {ZONES.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Note for the runner (optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Gate code, landmarks, what to buy..." />
      </div>
      <div style={{ marginTop: 12 }} className="btnrow">
        <button className="btn ghost" onClick={onClose}>Back</button>
        <button className="btn primary" onClick={confirm}>Confirm booking</button>
      </div>
    </Sheet>
  );
}
