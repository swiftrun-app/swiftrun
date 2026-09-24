import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Small embedded Leaflet map. pins: [{ lat, lng, label }]. Renders once per
// pins change; the parent should keep the list stable.
export default function LiveMap({ pins = [], height = 180, zoom = 14 }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapEl.current) return;
    if (!mapRef.current) {
      const map = L.map(mapEl.current, { zoomControl: false }).setView([-24.6282, 25.9231], zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      mapRef.current = map;
    }
    const map = mapRef.current;
    // Clear old pins.
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });
    const valid = pins.filter((p) => typeof p.lat === "number" && typeof p.lng === "number");
    for (const p of valid) {
      const icon = L.divIcon({
        className: "sr-pin",
        html: '<div class="pin">🛵</div>',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(p.label || "Runner");
    }
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], zoom);
    } else if (valid.length > 1) {
      map.fitBounds(L.latLngBounds(valid.map((p) => [p.lat, p.lng])).pad(0.2));
    }
    return () => {
      // Keep the map instance for pin updates; full teardown on unmount.
    };
  }, [pins, zoom]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="map-wrap" style={{ height }}>
      <div ref={mapEl} style={{ height: "100%", width: "100%", borderRadius: 12 }} />
    </div>
  );
}
