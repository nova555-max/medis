"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinned, Navigation, Radio } from "lucide-react";

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function FitBounds({
  workplace,
  me,
}: {
  workplace: [number, number];
  me: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (me) {
      map.fitBounds([workplace, me], { padding: [48, 48], maxZoom: 16 });
    } else {
      map.setView(workplace, 16);
    }
  }, [map, workplace, me]);
  return null;
}

function PulseRing({
  center,
  radius,
}: {
  center: [number, number];
  radius: number;
}) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Circle
        center={center}
        radius={radius}
        pathOptions={{
          color: "#2a5a8f",
          weight: 2,
          fillColor: "#568fc5",
          fillOpacity: 0.18,
        }}
      />
      <Circle
        key={t}
        center={center}
        radius={radius}
        pathOptions={{
          color: "#568fc5",
          weight: 2,
          fillOpacity: 0,
          opacity: 0.55,
          className: "gps-pulse-ring",
        }}
      />
    </>
  );
}

export function WorkplaceMapInner({
  lat,
  lng,
  radius,
  enabled,
  tall = false,
}: {
  lat: number | null;
  lng: number | null;
  radius: number;
  enabled: boolean;
  tall?: boolean;
}) {
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [locating, setLocating] = useState(true);

  const workplaceIcon = useMemo(
    () =>
      L.divIcon({
        className: "gps-workplace-marker",
        html: `<div style="
          width:44px;height:44px;border-radius:999px;
          background:linear-gradient(145deg,#234a75,#568fc5);
          border:3px solid white;box-shadow:0 8px 24px rgba(31,111,106,.45);
          display:flex;align-items:center;justify-content:center;
        "><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      }),
    [],
  );

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      setLocating(false);
      if (!navigator.geolocation) setLocError("دەستگەیشتن بە GPS لەسەر ئەم ئامێرە نییە");
      return;
    }

    setLocating(true);
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocError(null);
        setLocating(false);
      },
      () => {
        setLocError("مۆڵەتی شوێن بدە بۆ بینینی خۆت لەسەر نەخشە");
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    return () => navigator.geolocation.clearWatch(watch);
  }, [enabled]);

  const workplace = useMemo<[number, number] | null>(() => {
    if (lat == null || lng == null) return null;
    return [lat, lng];
  }, [lat, lng]);

  const distance =
    me && workplace ? haversineM(me, { lat: workplace[0], lng: workplace[1] }) : null;
  const inside = distance != null ? distance <= radius : null;

  if (!enabled || !workplace) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-surface-muted/50 p-8 text-center">
        <MapPinned className="mx-auto mb-3 h-8 w-8 text-ink-muted/50" />
        <p className="text-sm text-ink-muted">
          GPS بۆ تۆ ناکارایە یان شوێن دیاری نەکراوە (کارمەندی ئۆنلاین).
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          ئەدمین دەتوانێت لە پەڕەی کارمەند GPS چالاک بکات و شوێن دیاری بکات.
        </p>
      </div>
    );
  }

  const height = tall ? "h-[420px]" : "h-[300px]";

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl border border-brand-200/70 shadow-[0_20px_50px_-28px_rgba(40,117,112,0.55)]">
        <div className="absolute inset-x-0 top-0 z-[500] flex items-center justify-between gap-2 bg-gradient-to-b from-black/55 to-transparent px-3 pb-8 pt-3">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur ${
              inside === true
                ? "bg-emerald-600/90"
                : inside === false
                  ? "bg-amber-600/90"
                  : "bg-brand-800/85"
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${locating ? "animate-pulse" : ""}`} />
            {inside === true
              ? "لەناو ناوچەی کاردایت"
              : inside === false
                ? "لە دەرەوەی ناوچەکەیت"
                : locating
                  ? "شوێنت دەدۆزرێتەوە..."
                  : "شوێنی کار"}
          </div>
          {distance != null && (
            <div
              className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-brand-800 shadow-md backdrop-blur"
              dir="ltr"
            >
              {distance < 1000
                ? `${Math.round(distance)} m`
                : `${(distance / 1000).toFixed(1)} km`}
            </div>
          )}
        </div>

        <MapContainer
          center={workplace}
          zoom={16}
          scrollWheelZoom
          zoomControl={false}
          className={`${height} w-full`}
          style={{ direction: "ltr" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <FitBounds workplace={workplace} me={me ? [me.lat, me.lng] : null} />
          <PulseRing center={workplace} radius={radius} />
          <Marker position={workplace} icon={workplaceIcon} />
          {me && (
            <>
              <Polyline
                positions={[workplace, [me.lat, me.lng]]}
                pathOptions={{
                  color: inside ? "#2a5a8f" : "#c2782c",
                  weight: 2,
                  dashArray: "6 8",
                  opacity: 0.75,
                }}
              />
              <CircleMarker
                center={[me.lat, me.lng]}
                radius={10}
                pathOptions={{
                  color: "#fff",
                  weight: 3,
                  fillColor: "#2563eb",
                  fillOpacity: 1,
                }}
              />
              <CircleMarker
                center={[me.lat, me.lng]}
                radius={22}
                pathOptions={{
                  color: "#3b82f6",
                  weight: 1,
                  fillColor: "#3b82f6",
                  fillOpacity: 0.15,
                  className: "gps-me-glow",
                }}
              />
            </>
          )}
        </MapContainer>

        <div className="absolute inset-x-0 bottom-0 z-[500] bg-gradient-to-t from-black/50 to-transparent px-3 pb-3 pt-10">
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-[#568fc5] ring-2 ring-white/80" />
              شوێنی کار
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white/80" />
              تۆ
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur">
              بازنە: {radius} مەتر
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="panel flex items-center gap-2 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/10 text-brand-700">
            <MapPinned className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-ink-muted">ناوچەی ڕێگەپێدراو</p>
            <p className="text-sm font-semibold">{radius} مەتر</p>
          </div>
        </div>
        <div className="panel flex items-center gap-2 p-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              inside === true
                ? "bg-emerald-500/15 text-emerald-700"
                : inside === false
                  ? "bg-amber-500/15 text-amber-700"
                  : "bg-surface-muted text-ink-muted"
            }`}
          >
            <Navigation className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-ink-muted">دووریت</p>
            <p className="text-sm font-semibold" dir="ltr">
              {distance != null
                ? distance < 1000
                  ? `${Math.round(distance)} m`
                  : `${(distance / 1000).toFixed(2)} km`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {locError && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {locError}
        </p>
      )}

      <p className="text-center text-[11px] text-ink-muted" dir="ltr">
        {workplace[0].toFixed(5)}, {workplace[1].toFixed(5)}
      </p>
    </div>
  );
}
