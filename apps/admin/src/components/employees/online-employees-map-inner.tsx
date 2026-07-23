"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { OnlinePoint } from "@/components/employees/online-employees-map";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function OnlineEmployeesMapInner({ points }: { points: OnlinePoint[] }) {
  const center: [number, number] = [points[0].lat, points[0].lng];

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      className="h-[360px] w-full"
      style={{ direction: "ltr" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={markerIcon}>
          <Popup>
            <strong>{p.name}</strong>
            <br />
            {p.activity}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
