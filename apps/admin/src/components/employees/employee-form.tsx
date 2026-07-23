"use client";

import dynamic from "next/dynamic";
import { useActionState, useEffect, useState } from "react";
import { createEmployeeAction, type ActionResult } from "@/lib/actions/org";
import {
  generateAlphanumericPasswordClient,
  generateDigitCodeClient,
} from "@/lib/employee-auth-id";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";
import { currencyLabel } from "@/lib/money";

const OfficeMapPicker = dynamic(
  () =>
    import("@/components/settings/office-map-picker").then(
      (m) => m.OfficeMapPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-line bg-surface-muted text-sm text-ink-muted">
        نەخشە بار دەبێت...
      </div>
    ),
  },
);

const CREDS_KEY = "mo_last_employee_creds";
const initial: ActionResult = {};

type Option = { id: string; name: string };
type SavedCreds = {
  name: string;
  loginId: string;
  password: string;
  at: string;
};

function loadSavedCreds(): SavedCreds | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CREDS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedCreds;
  } catch {
    return null;
  }
}

export function EmployeeForm({
  departments,
}: {
  departments: Option[];
}) {
  const [state, formAction, pending] = useActionState(
    createEmployeeAction,
    initial,
  );
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [employeeType, setEmployeeType] = useState<"office" | "online">(
    "office",
  );
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radius, setRadius] = useState(150);
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [saved, setSaved] = useState<SavedCreds | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function regenerateCreds() {
    setLoginId(generateDigitCodeClient(10));
    setLoginPassword(generateAlphanumericPasswordClient(10));
  }

  function onTypeChange(next: "office" | "online") {
    setEmployeeType(next);
    if (next === "online") setGpsEnabled(false);
  }

  useEffect(() => {
    regenerateCreds();
    setSaved(loadSavedCreds());
  }, []);

  useEffect(() => {
    if (state.loginId && state.password) {
      const payload: SavedCreds = {
        name: "کارمەندی نوێ",
        loginId: state.loginId,
        password: state.password,
        at: new Date().toISOString(),
      };
      try {
        const nameInput = document.getElementById(
          "fullName",
        ) as HTMLInputElement | null;
        if (nameInput?.value) payload.name = nameInput.value;
        sessionStorage.setItem(CREDS_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
      setSaved(payload);
      setLoginId(state.loginId);
      setLoginPassword(state.password);
    }
  }, [state.loginId, state.password]);

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  }

  const showCreds = Boolean(
    (state.loginId && state.password) || (saved?.loginId && saved?.password),
  );
  const displayId = state.loginId || saved?.loginId || loginId;
  const displayPass = state.password || saved?.password || loginPassword;
  const displayName = saved?.name;

  return (
    <div className="space-y-3">
      {showCreds && displayId && displayPass ? (
        <div className="panel border-brand-300 bg-brand-50/60 p-4 dark:border-brand-800 dark:bg-brand-950/25">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-brand-800 dark:text-brand-200">
                ئایدی و وشەی نهێنی بۆ کارمەند
                {displayName ? ` — ${displayName}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                ئەمانە بدە بە کارمەند بۆ چوونەژوورەوە
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-ink-muted hover:text-ink"
              onClick={() => {
                sessionStorage.removeItem(CREDS_KEY);
                setSaved(null);
              }}
            >
              داخستن
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-white px-3 py-3 dark:bg-surface-elevated">
              <p className="text-[11px] text-ink-muted">ئایدی</p>
              <p className="mt-1 text-2xl font-bold tracking-[0.2em]" dir="ltr">
                {displayId}
              </p>
              <button
                type="button"
                className="mt-2 text-xs font-medium text-brand-700"
                onClick={() => copyText("id", displayId)}
              >
                {copied === "id" ? "کۆپی کرا ✓" : "کۆپیکردنی ئایدی"}
              </button>
            </div>
            <div className="rounded-xl bg-white px-3 py-3 dark:bg-surface-elevated">
              <p className="text-[11px] text-ink-muted">وشەی نهێنی</p>
              <p className="mt-1 text-2xl font-bold tracking-[0.2em]" dir="ltr">
                {displayPass}
              </p>
              <button
                type="button"
                className="mt-2 text-xs font-medium text-brand-700"
                onClick={() => copyText("pass", displayPass)}
              >
                {copied === "pass" ? "کۆپی کرا ✓" : "کۆپیکردنی وشەی نهێنی"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <details
        className="panel group overflow-hidden"
        open
      >
        <summary className="cursor-pointer list-none px-5 py-4 font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-3">
            <span>+ زیادکردنی کارمەند</span>
            <span className="text-xs font-normal text-ink-muted group-open:hidden">
              کردنەوە
            </span>
            <span className="hidden text-xs font-normal text-ink-muted group-open:inline">
              داخستن
            </span>
          </span>
        </summary>

        <form
          action={formAction}
          className="grid gap-3 border-t border-line p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <input type="hidden" name="loginId" value={loginId} />
          <input type="hidden" name="loginPassword" value={loginPassword} />

          <div className="sm:col-span-2 lg:col-span-3 space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900 dark:bg-brand-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  ئایدی و وشەی نهێنی (بۆ کارمەند)
                </p>
                <p className="text-xs text-ink-muted">
                  خۆکار دروست دەبن — پاشەکەوت بکە پاشان ئەمانە بدە بە کارمەند
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="px-3 py-2 text-xs"
                onClick={regenerateCreds}
              >
                نوێکردنەوە
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg bg-white px-3 py-2.5 dark:bg-surface-elevated">
                <p className="text-[11px] text-ink-muted">ئایدی (١٠ ژمارە)</p>
                <p
                  className="mt-1 text-xl font-bold tracking-[0.18em]"
                  dir="ltr"
                >
                  {loginId || ".........."}
                </p>
              </div>
              <div className="rounded-lg bg-white px-3 py-2.5 dark:bg-surface-elevated">
                <p className="text-[11px] text-ink-muted">
                  وشەی نهێنی (١٠ پیت و ژمارە)
                </p>
                <p
                  className="mt-1 text-xl font-bold tracking-[0.18em]"
                  dir="ltr"
                >
                  {loginPassword || ".........."}
                </p>
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <Label>جۆری کارمەند</Label>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="employeeType"
                  value="office"
                  checked={employeeType === "office"}
                  onChange={() => onTypeChange("office")}
                />
                کارمەندی ئۆفیس
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="employeeType"
                  value="online"
                  checked={employeeType === "online"}
                  onChange={() => onTypeChange("online")}
                />
                کارمەندی ئۆنلاین
              </label>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {employeeType === "online"
                ? "ئۆنلاین: GPSی ئۆفیس نییە — شوێن و چالاکی بۆ ئەدمین دەنێردرێت"
                : "ئۆفیس: دەتوانیت GPSی شوێنی کار چالاک بکەیت"}
            </p>
          </div>

          <div>
            <Label htmlFor="fullName">ناو</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div>
            <Label htmlFor="phone">مۆبایل</Label>
            <Input id="phone" name="phone" dir="ltr" className="text-left" />
          </div>
          <div>
            <Label htmlFor="hireDate">بەرواری دامەزراندن</Label>
            <Input
              id="hireDate"
              name="hireDate"
              type="date"
              dir="ltr"
              className="text-left"
            />
          </div>
          <div>
            <Label htmlFor="baseSalary">مووچە</Label>
            <Input
              id="baseSalary"
              name="baseSalary"
              type="number"
              min={0}
              step="0.01"
              defaultValue={0}
              dir="ltr"
              className="text-left"
            />
          </div>
          <div>
            <Label htmlFor="currency">دراو</Label>
            <select
              id="currency"
              name="currency"
              defaultValue="IQD"
              className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
            >
              <option value="IQD">{currencyLabel("IQD")}</option>
              <option value="USD">{currencyLabel("USD")}</option>
            </select>
          </div>
          <div>
            <Label htmlFor="departmentId">بەش</Label>
            <select
              id="departmentId"
              name="departmentId"
              className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
            >
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <input type="hidden" name="positionId" value="" />
          <div className="sm:col-span-2 lg:col-span-3">
            <Label htmlFor="notes">تێبینی</Label>
            <Input id="notes" name="notes" />
          </div>

          {employeeType === "office" ? (
          <details className="sm:col-span-2 lg:col-span-3 rounded-xl border border-line bg-surface-muted/30 p-3">
            <summary className="cursor-pointer text-sm font-medium">
              GPSی ئۆفیس (ئارەزوومەندانە)
            </summary>
            <div className="mt-3 space-y-3">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={gpsEnabled}
                  onChange={(e) => setGpsEnabled(e.target.checked)}
                />
                <span>GPS چالاک بێت</span>
              </label>
              <input
                type="hidden"
                name="gpsEnabled"
                value={gpsEnabled ? "on" : ""}
              />
              <input type="hidden" name="gpsLat" value={lat ?? ""} />
              <input type="hidden" name="gpsLng" value={lng ?? ""} />
              {gpsEnabled && (
                <>
                  <div className="max-w-xs">
                    <Label htmlFor="gpsRadius">نیشتمان (مەتر)</Label>
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
            </div>
          </details>
          ) : (
            <>
              <input type="hidden" name="gpsEnabled" value="" />
              <input type="hidden" name="gpsLat" value="" />
              <input type="hidden" name="gpsLng" value="" />
              <p className="sm:col-span-2 lg:col-span-3 rounded-xl border border-line bg-surface-muted/40 px-3 py-3 text-sm text-ink-muted">
                کارمەندی ئۆنلاین ناتوانێت GPSی ئۆفیس دابنێت. شوێنی ڕاستەوخۆی لە
                بەشی «ئۆنلاین» دەبینیت.
              </p>
            </>
          )}

          {state.error && (
            <p className="sm:col-span-2 lg:col-span-3 text-sm text-red-600">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="sm:col-span-2 lg:col-span-3 text-sm font-medium text-brand-700">
              {state.success} — سەیری سەرەوە بکە بۆ ئایدی و وشەی نهێنی
            </p>
          )}

          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={pending || !loginId || !loginPassword}>
              {pending ? ckb.loading : "پاشەکەوتکردنی کارمەند"}
            </Button>
          </div>
        </form>
      </details>
    </div>
  );
}
