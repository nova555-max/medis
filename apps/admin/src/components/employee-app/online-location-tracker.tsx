"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ONLINE_ACTIVITIES = [
  { value: "working", label: "لە کاردا" },
  { value: "meeting", label: "کۆبوونەوە" },
  { value: "break", label: "پشوو" },
  { value: "field", label: "دەرەوە / سەردان" },
];

/** Live location heartbeat — office (geofence) or online employees. */
export function LiveLocationTracker({
  mode,
}: {
  mode: "office" | "online";
}) {
  const [activity, setActivity] = useState("working");
  const [status, setStatus] = useState<string | null>(null);
  const [atWork, setAtWork] = useState<boolean | null>(null);
  const activityRef = useRef(activity);
  activityRef.current = activity;

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function send() {
      if (!navigator.geolocation) {
        setStatus("GPS لەم ئامێرە پشتگیری ناکرێت");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          const { data, error } = await supabase.rpc("employee_update_location", {
            p_lat: pos.coords.latitude,
            p_lng: pos.coords.longitude,
            p_activity: mode === "online" ? activityRef.current : null,
          });
          if (cancelled) return;
          if (error) {
            setStatus(error.message || "ناردنی شوێن سەرنەکەوت");
            return;
          }
          const act = (data as { last_activity?: string } | null)?.last_activity;
          if (act === "at_work") setAtWork(true);
          else if (act === "left_work") setAtWork(false);
          setStatus(`دوایین نوێکردنەوە: ${new Date().toLocaleTimeString()}`);
        },
        () => {
          if (!cancelled) setStatus("ڕێگەپێدانی شوێن پێویستە");
        },
        { enableHighAccuracy: true, maximumAge: 20_000, timeout: 15_000 },
      );
    }

    void send();
    const id = window.setInterval(() => void send(), 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "online") return;
    const supabase = createClient();
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await supabase.rpc("employee_update_location", {
        p_lat: pos.coords.latitude,
        p_lng: pos.coords.longitude,
        p_activity: activity,
      });
    });
  }, [activity, mode]);

  if (mode === "office") {
    return (
      <div className="rounded-2xl border border-line bg-surface-elevated p-4">
        <p className="text-sm font-semibold">شوێنی ڕاستەوخۆ (GPS)</p>
        <p className="mt-1 text-xs text-ink-muted">
          شوێنەکەت خۆکار بۆ بەڕێوەبەر دەنێردرێت — بێ پرسیار
        </p>
        {atWork != null ? (
          <p
            className={`mt-2 text-sm font-medium ${
              atWork ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {atWork ? "لە ناو بازنەی شوێنی کاریت" : "لە دەرەوەی بازنەی شوێنی کاریت"}
          </p>
        ) : null}
        {status ? (
          <p className="mt-1 text-xs text-ink-muted" dir="ltr">
            {status}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface-elevated p-4">
      <p className="text-sm font-semibold">شوێن و چالاکی (ئۆنلاین)</p>
      <p className="mt-1 text-xs text-ink-muted">
        شوێنەکەت بۆ بەڕێوەبەر دەنێردرێت
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ONLINE_ACTIVITIES.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => setActivity(a.value)}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium ${
              activity === a.value
                ? "bg-brand-600 text-white"
                : "border border-line bg-surface-muted"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {status ? (
        <p className="mt-2 text-xs text-ink-muted" dir="ltr">
          {status}
        </p>
      ) : null}
    </div>
  );
}

/** @deprecated use LiveLocationTracker */
export function OnlineLocationTracker() {
  return <LiveLocationTracker mode="online" />;
}
