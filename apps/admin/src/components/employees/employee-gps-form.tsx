"use client";

import dynamic from "next/dynamic";
import { useActionState, useState } from "react";
import {
  updateEmployeeGpsAction,
  type ActionResult,
} from "@/lib/actions/org";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const OfficeMapPicker = dynamic(
  () =>
    import("@/components/settings/office-map-picker").then(
      (m) => m.OfficeMapPicker,
    ),
  { ssr: false },
);

const initial: ActionResult = {};

type EmployeeGps = {
  id: string;
  full_name: string;
  employee_type?: "office" | "online";
  gps_enabled: boolean;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_radius_meters: number;
  last_lat?: number | null;
  last_lng?: number | null;
  last_location_at?: string | null;
  last_activity?: string | null;
};

function activityLabel(raw: string | null | undefined) {
  if (!raw) return "—";
  if (raw === "check_in") return "چک-ئین";
  if (raw === "check_out") return "چک-ئاوت";
  if (raw === "working") return "لە کاردا";
  return raw;
}

export function EmployeeGpsForm({ employee }: { employee: EmployeeGps }) {
  const isOnline = employee.employee_type === "online";
  const [state, formAction, pending] = useActionState(
    updateEmployeeGpsAction,
    initial,
  );
  const [gpsEnabled, setGpsEnabled] = useState(employee.gps_enabled);
  const [lat, setLat] = useState<number | null>(employee.gps_lat);
  const [lng, setLng] = useState<number | null>(employee.gps_lng);
  const [radius, setRadius] = useState(employee.gps_radius_meters || 150);

  if (isOnline) {
    return (
      <div className="panel space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">
            شوێنی ئۆنلاین — {employee.full_name}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            کارمەندی ئۆنلاین GPSی ئۆفیس نییە. شوێن و چالاکی ڕاستەوخۆ لێرە
            دەردەکەوێت.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-xl bg-surface-muted/50 px-3 py-3">
            <p className="text-xs text-ink-muted">دوایین چالاکی</p>
            <p className="mt-1 font-medium">
              {activityLabel(employee.last_activity)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-muted/50 px-3 py-3">
            <p className="text-xs text-ink-muted">کاتی شوێن</p>
            <p className="mt-1 font-medium" dir="ltr">
              {employee.last_location_at
                ? new Date(employee.last_location_at).toLocaleString()
                : "—"}
            </p>
          </div>
        </div>
        {employee.last_lat != null && employee.last_lng != null ? (
          <OfficeMapPicker
            lat={employee.last_lat}
            lng={employee.last_lng}
            radiusMeters={40}
            readOnly
            onChange={() => {}}
          />
        ) : (
          <p className="text-sm text-ink-muted">
            هێشتا شوێن نەنێردراوە — کاتێک کارمەند ئەپی کارمەند دەکاتەوە
            دەردەکەوێت.
          </p>
        )}
        {employee.last_lat != null && employee.last_lng != null ? (
          <p className="text-xs text-ink-muted" dir="ltr">
            {employee.last_lat.toFixed(5)}, {employee.last_lng.toFixed(5)}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="panel space-y-4 p-5">
      <input type="hidden" name="employeeId" value={employee.id} />
      <input type="hidden" name="gpsEnabled" value={gpsEnabled ? "on" : ""} />
      <input type="hidden" name="gpsLat" value={lat ?? ""} />
      <input type="hidden" name="gpsLng" value={lng ?? ""} />

      <div>
        <h2 className="text-lg font-semibold">
          GPSی ئۆفیس — {employee.full_name}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          شوێنی کار و مەودای دووری دیاری بکە. کارمەند ناتوانێت هاتن یان چوون تۆمار
          بکات تاکوو نەچێتە ناو بازنەکە (بۆ نموونە ١٠٠ مەتر).
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={gpsEnabled}
          onChange={(e) => setGpsEnabled(e.target.checked)}
        />
        <span className="font-medium">
          GPS چالاک بێت + شوێنی ڕاستەوخۆ بۆ ئەدمین
        </span>
      </label>

      {gpsEnabled && (
        <>
          <div className="max-w-xs">
            <Label htmlFor="gpsRadius">مەودای دووری (مەتر)</Label>
            <Input
              id="gpsRadius"
              name="gpsRadius"
              type="number"
              min={10}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value) || 150)}
              dir="ltr"
              className="text-left"
            />
            <p className="mt-1 text-xs text-ink-muted">
              لە دەرەوەی ئەم مەودایە هاتن/چوون قەدەغەیە
            </p>
          </div>
          <OfficeMapPicker
            lat={lat}
            lng={lng}
            radiusMeters={radius}
            onChange={(nextLat, nextLng) => {
              setLat(nextLat);
              setLng(nextLng);
            }}
          />
        </>
      )}

      {!gpsEnabled && <input type="hidden" name="gpsRadius" value={radius} />}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-brand-700">{state.success}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? ckb.loading : ckb.save}
      </Button>
    </form>
  );
}
