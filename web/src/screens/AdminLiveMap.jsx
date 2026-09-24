import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getLiveRunners } from "../api.js";
import { getZones } from "../api.js";
import { ZONES } from "../data.js";
import { EmptyState, ErrorState } from "./common.jsx";

function ago(ts) {
  if (!ts) return "";
  const ms = Date.now() - new Date(String(ts).replace(" ", "T") + "Z").getTime();
  if (Number.isNaN(ms) || ms < 0) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  return `${mins} min ago`;
}

export default function AdminLiveMap() {
  const [runners, setRunners] = useState(null);
  const [zones, setZones] = useState(ZONES);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const mapEl = useRef(null);

  const load = useCallback(async (quiet) => {
    if (!quiet) setError("");
    else setRefreshing(true);
    try {
      const [live, z] = await Promise.all([getLiveRunners(), getZones().catch(() => ZONES)]);
      setRunners(live);
      if (Array.isArray(z) && z.length) setZones(z);
    } catch (e) {
      if (e.message !== "SESSION_EXPIRED") setError(e.message || "Could not load live runners.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    const timer = setInterval(() => load(true), 30000);
    return () => clearInterval(timer);
  }, [load]);

  // Draw the map whenever runners or zones change.
  useEffect(() => {
    if (!mapEl.current) return;
    const map = L.map(mapEl.current, { zoomControl: false }).setView([-24.6282, 25.9231], 12);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    for (const z of zones) {
      if (typeof z.lat !== "number" || typeof z.lng !== "number") continue;
      L.circle([z.lat, z.lng], {
        radius: 1100, color: z.color, fillColor: z.color, fillOpacity: 0.16, weight: 1.5,
      }).addTo(map).bindTooltip(z.name, { permanent: false, direction: "top" });
    }
    for (const r of runners || []) {
      if (typeof r.lat !== "number" || typeof r.lng !== "number") continue;
      const icon = L.divIcon({
        className: "sr-pin",
        html: '<div class="pin">🛵</div>',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      L.marker([r.lat, r.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>${r.display_name}</b><br/>${r.vehicle || ""} · ${r.zone || ""}<br/>+267 ${r.phone || ""}<br/>${ago(r.location_updated_at)}`);
    }
    return () => map.remove();
  }, [runners, zones]);

  if (runners === null && !error) {
    return (
      <div className="screen">
        <h2>Live map</h2>
        <p className="sub">Loading runner locations...</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2>Live map</h2>
      <p className="sub">
        Runners sharing their location right now{refreshing ? " · updating..." : ""}.{" "}
        <button className="btn ghost sm" onClick={() => load(true)}>Refresh</button>
      </p>

      {error && <ErrorState message={error} onRetry={() => load(false)} />}

      <div className="map-wrap">
        <div id="sr-admin-map" ref={mapEl} />
      </div>

      <div className="sec-row">
        <h3>Online now</h3>
        <span>{(runners || []).length}</span>
      </div>

      {(runners || []).length === 0 && (
        <EmptyState icon="🛵" title="No runners online." hint="Runners appear here when they turn on location sharing." />
      )}

      {(runners || []).map((r) => (
        <div className="card" key={r.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar">{(r.display_name || "?")[0].toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{r.display_name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {r.vehicle} · {r.zone} · {ago(r.location_updated_at)}
              </div>
            </div>
            <a href={`tel:+267${r.phone}`}>
              <button className="btn ghost sm" style={{ pointerEvents: "none" }}>📞</button>
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
