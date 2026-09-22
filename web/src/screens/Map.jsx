import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ZONES, RUNNERS } from "../data.js";

const CENTER = [-24.6282, 25.9231];

// Small deterministic offsets so pins do not sit exactly on zone centers.
const OFFSETS = [
  [0.004, 0.003], [-0.003, 0.005], [0.005, -0.004], [-0.005, -0.003],
  [0.003, -0.005], [-0.004, 0.004], [0.006, 0.001], [-0.001, -0.006],
];

export default function MapScreen() {
  const mapEl = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | online | offline

  useEffect(() => {
    if (!mapEl.current) return;

    const map = L.map(mapEl.current, { zoomControl: false }).setView(CENTER, 12);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    let loaded = false;
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    });
    tiles.on("tileload", () => {
      if (!loaded) {
        loaded = true;
        setStatus("online");
      }
    });
    tiles.addTo(map);

    // If no tiles arrive, assume offline and show the friendly fallback.
    const timer = setTimeout(() => {
      if (!loaded) setStatus("offline");
    }, 6000);

    // Colored zone circles.
    for (const z of ZONES) {
      L.circle([z.lat, z.lng], {
        radius: 1100,
        color: z.color,
        fillColor: z.color,
        fillOpacity: 0.16,
        weight: 1.5,
      })
        .addTo(map)
        .bindTooltip(z.name, { permanent: false, direction: "top" });
    }

    // Runner pins with custom emoji markers (default Leaflet image icons break under bundlers).
    RUNNERS.forEach((r, i) => {
      const zone = ZONES.find((z) => z.id === r.zone) || { lat: CENTER[0], lng: CENTER[1], name: "Gaborone" };
      const off = OFFSETS[i % OFFSETS.length];
      const icon = L.divIcon({
        className: "sr-pin",
        html: `<div class="pin">${r.emoji}</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      L.marker([zone.lat + off[0], zone.lng + off[1]], { icon })
        .addTo(map)
        .bindPopup(
          `<b>${r.name}</b> ${r.verified ? "✓" : ""}<br/>★ ${r.rating.toFixed(2)} · ${r.runs} runs<br/>${zone.name}`
        );
    });

    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, []);

  return (
    <div className="screen">
      <h2>Live map</h2>
      <p className="sub">Runner zones and active runners in Gaborone.</p>

      <div className="map-wrap">
        <div id="sr-map" ref={mapEl} />
        {status === "offline" && (
          <div className="map-offline">
            <div className="big">📡</div>
            <h3>You are offline</h3>
            <p>Map tiles need a connection. Your bookings still work. Here are our zones:</p>
            <div className="zone-list">
              {ZONES.map((z) => (
                <span key={z.id}>
                  <i style={{ background: z.color }} />
                  {z.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sec-row">
        <h3>Zones</h3>
        <span>{ZONES.length} in Gaborone</span>
      </div>
      <div className="card" style={{ padding: 6 }}>
        {ZONES.map((z, i) => (
          <div
            key={z.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderTop: i === 0 ? "none" : "1px solid var(--line)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: z.color }} />
            {z.name}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>
              {RUNNERS.filter((r) => r.zone === z.id).length} runners
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
