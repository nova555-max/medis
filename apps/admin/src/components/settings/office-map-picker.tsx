"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Circle,
  TileLayer,
  useMapEvents,
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

const DEFAULT_CENTER: [number, number] = [33.3152, 44.3661]; // Baghdad

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function OfficeMapPicker({
  lat,
  lng,
  radiusMeters,
  onChange,
  readOnly = false,
}: {
  lat: number | null;
  lng: number | null;
  radiusMeters: number;
  onChange: (lat: number, lng: number) => void;
  readOnly?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (lat != null && lng != null) return [lat, lng];
    return DEFAULT_CENTER;
  }, [lat, lng]);

  if (!mounted) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-line bg-surface-muted text-sm text-ink-muted">
        نەخشە بار دەبێت...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom
        className="h-[320px] w-full"
        style={{ direction: "ltr" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!readOnly && <ClickHandler onPick={onChange} />}
        {lat != null && lng != null && (
          <>
            <Marker position={[lat, lng]} icon={markerIcon} />
            <Circle
              center={[lat, lng]}
              radius={radiusMeters || 150}
              pathOptions={{
                color: "#2a5a8f",
                fillColor: "#568fc5",
                fillOpacity: 0.2,
              }}
            />
          </>
        )}
      </MapContainer>
      {!readOnly && (
        <p className="border-t border-line bg-surface-muted/50 px-3 py-2 text-xs text-ink-muted">
          کلیک لەسەر نەخشە بکە بۆ دیاریکردنی شوێنی GPSی ئەم کارمەندە
        </p>
      )}
    </div>
  );
}
