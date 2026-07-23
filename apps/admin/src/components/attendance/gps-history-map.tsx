"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export type GpsPoint = {
  id: string;
  work_date: string;
  kind: "in" | "out";
  lat: number;
  lng: number;
  name: string;
  code: string;
};

function FitAll({ points }: { points: GpsPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export function GpsHistoryMap({ points }: { points: GpsPoint[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const center = useMemo<[number, number]>(() => {
    if (points[0]) return [points[0].lat, points[0].lng];
    return [33.3152, 44.3661];
  }, [points]);

  const line = useMemo(
    () => points.map((p) => [p.lat, p.lng] as [number, number]),
    [points],
  );

  if (!mounted) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-line bg-surface-muted text-sm text-ink-muted">
        بارکردنی نەخشە...
      </div>
    );
  }

  if (!points.length) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-line bg-surface-muted text-sm text-ink-muted">
        هیچ خاڵێکی GPS نییە بۆ ئەم فلتەرە
      </div>
    );
  }

  return (
    <div className="h-[420px] overflow-hidden rounded-2xl border border-line">
      <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitAll points={points} />
        {line.length > 1 && (
          <Polyline positions={line} pathOptions={{ color: "#2a5a8f", weight: 3 }} />
        )}
        {points.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={markerIcon}>
            <Popup>
              <div dir="rtl" className="text-sm">
                <p className="font-semibold">{p.name}</p>
                <p>
                  {p.kind === "in" ? "چک-ئین" : "چک-ئاوت"} · {p.work_date}
                </p>
                <p dir="ltr" className="text-xs">
                  {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
