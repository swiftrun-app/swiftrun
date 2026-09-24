import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ZONES } from "../data.js";

const CENTER = [-24.6282, 25.9231];

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

    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, []);

  return (
    <div className="screen">
      <h2>Live map</h2>
      <p className="sub">Our delivery zones in Gaborone.</p>

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
          </div>
        ))}
      </div>
    </div>
  );
}
