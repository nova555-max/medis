"use client";

import { useActionState, useEffect, useState } from "react";
import {
  updateCompanySettingsAction,
  type SettingsState,
} from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SafeImage } from "@/components/ui/safe-image";
import { ckb } from "@/lib/ckb";
import { currencyLabel } from "@/lib/money";
import { safeImageSrc } from "@/lib/storage/image-url";

const initial: SettingsState = {};
const MAX_LOGO_BYTES = 1_500_000;

type Company = {
  name: string;
  logo_url: string | null;
  late_fine_enabled: boolean;
  late_fine_amount: number;
  late_fine_after_minutes: number;
  late_fine_currency: "IQD" | "USD";
  qr_required: boolean;
  selfie_required: boolean;
  weekly_off_dows: number[];
  overtime_rate_per_hour: number;
  overtime_currency: "IQD" | "USD";
  absence_fine_enabled: boolean;
  absence_fine_amount: number;
  absence_fine_currency: "IQD" | "USD";
  absence_fine_mode: "fixed" | "daily_wage";
};

const WEEK_DAYS = [
  { dow: 0, label: "یەکشەممە" },
  { dow: 1, label: "دووشەممە" },
  { dow: 2, label: "سێشەممە" },
  { dow: 3, label: "چوارشەممە" },
  { dow: 4, label: "پێنجشەممە" },
  { dow: 5, label: "هەینی" },
  { dow: 6, label: "شەممە" },
];

async function compressLogo(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= 400_000) return file;

  const bitmap = await createImageBitmap(file);
  const maxSide = 512;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82),
  );
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}

export function CompanySettingsForm({
  company,
  adminEmail,
}: {
  company: Company;
  adminEmail: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateCompanySettingsAction,
    initial,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(
    safeImageSrc(company.logo_url),
  );
  const [fineEnabled, setFineEnabled] = useState(company.late_fine_enabled);
  const [absenceFineEnabled, setAbsenceFineEnabled] = useState(
    company.absence_fine_enabled,
  );
  const [moneyCurrency, setMoneyCurrency] = useState<"IQD" | "USD">(
    company.late_fine_currency === "USD" ? "USD" : "IQD",
  );
  const [weeklyOff, setWeeklyOff] = useState<number[]>(
    company.weekly_off_dows?.length ? company.weekly_off_dows : [5],
  );

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function toggleDow(dow: number) {
    setWeeklyOff((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort(),
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const logo = fd.get("logo");

    if (logo instanceof File && logo.size > 0) {
      try {
        const compressed = await compressLogo(logo);
        if (compressed.size > MAX_LOGO_BYTES) {
          setLocalError(
            "لۆگۆ زۆر گەورەیە. تکایە وێنەیەکی بچووکتر هەڵبژێرە (ژێر ٢ مێگابایت).",
          );
          return;
        }
        fd.set("logo", compressed);
      } catch {
        setLocalError("کەمکردنەوەی قەبارەی لۆگۆ سەرنەکەوت.");
        return;
      }
    }

    formAction(fd);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="panel grid gap-4 p-5 md:grid-cols-2"
    >
      <div className="md:col-span-2">
        <h2 className="text-lg font-semibold">کۆمپانیا</h2>
        <p className="mt-1 text-sm text-ink-muted">
          ناوی کۆمپانیا و لۆگۆ
        </p>
      </div>

      <div className="md:col-span-2">
        <Label htmlFor="name">{ckb.companyName}</Label>
        <Input id="name" name="name" defaultValue={company.name} required />
      </div>

      <div className="md:col-span-2">
        <Label htmlFor="logo">لۆگۆ</Label>
        <Input
          id="logo"
          name="logo"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 8_000_000) {
              setLocalError("لۆگۆ زۆر گەورەیە (زۆرینە ٨ مێگابایت).");
              e.target.value = "";
              return;
            }
            setLocalError(null);
            setPreview((prev) => {
              if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
              return URL.createObjectURL(f);
            });
          }}
        />
        <p className="mt-1 text-xs text-ink-muted">
          پێش بارکردن خۆکار بچووک دەکرێتەوە
        </p>
        <input type="hidden" name="logoUrl" value={company.logo_url || ""} />
        {preview && (
          <SafeImage
            src={preview}
            alt="logo"
            className="mt-2 h-12 w-12 rounded-lg border border-line object-contain"
          />
        )}
      </div>

      <div className="md:col-span-2 border-t border-line pt-4">
        <h2 className="text-lg font-semibold">هەژماری ئەدمین</h2>
        <p className="mt-1 text-sm text-ink-muted">
          ئیمەیڵ و وشەی نهێنی بۆ چوونەژوورەوە
        </p>
      </div>

      <div className="md:col-span-2">
        <Label htmlFor="loginEmail">ئیمەیڵی داخڵبوون</Label>
        <Input
          id="loginEmail"
          name="loginEmail"
          type="email"
          defaultValue={adminEmail}
          required
          dir="ltr"
          className="text-left"
          autoComplete="username"
        />
      </div>
      <div>
        <Label htmlFor="newPassword">وشەی نهێنی نوێ</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          dir="ltr"
          className="text-left"
          autoComplete="new-password"
          placeholder="بەتاڵ = بێ گۆڕان"
        />
      </div>
      <div>
        <Label htmlFor="confirmPassword">دووبارەکردنەوەی وشەی نهێنی</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          dir="ltr"
          className="text-left"
          autoComplete="new-password"
        />
      </div>

      <div className="md:col-span-2 border-t border-line pt-4">
        <h2 className="text-lg font-semibold">غەرامەی خۆکاری دواکەوتن</h2>
        <p className="mt-1 text-sm text-ink-muted">
          کاتێک کارمەند دواکەوت، سیستەم خۆکار غەرامە دەخاتە سەر مووچە
        </p>
      </div>

      <div className="md:col-span-2">
        <Label htmlFor="moneyCurrency">دراوی غەرامە و کاتی زیادە</Label>
        <select
          id="moneyCurrency"
          name="moneyCurrency"
          value={moneyCurrency}
          onChange={(e) =>
            setMoneyCurrency(e.target.value === "USD" ? "USD" : "IQD")
          }
          className="mt-1 w-full max-w-xs rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
        >
          <option value="IQD">{currencyLabel("IQD")}</option>
          <option value="USD">{currencyLabel("USD")}</option>
        </select>
        <p className="mt-1 text-xs text-ink-muted">
          ئەدمین بە دڵی خۆی دینار یان دۆلار هەڵدەبژێرێت بۆ هەموو بڕەکان
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input
          type="checkbox"
          name="lateFineEnabled"
          checked={fineEnabled}
          onChange={(e) => setFineEnabled(e.target.checked)}
          className="h-4 w-4"
        />
        غەرامەی دواکەوتن چالاک بێت
      </label>

      <div>
        <Label htmlFor="lateFineAfterMinutes">
          دوای چەند خولەک غەرامە بکرێت؟
        </Label>
        <Input
          id="lateFineAfterMinutes"
          name="lateFineAfterMinutes"
          type="number"
          min={0}
          defaultValue={company.late_fine_after_minutes}
          disabled={!fineEnabled}
          dir="ltr"
          className="text-left"
        />
      </div>
      <div>
        <Label htmlFor="lateFineAmount">
          بڕی غەرامە ({currencyLabel(moneyCurrency)})
        </Label>
        <Input
          id="lateFineAmount"
          name="lateFineAmount"
          type="number"
          min={0}
          step="0.01"
          defaultValue={company.late_fine_amount}
          disabled={!fineEnabled}
          dir="ltr"
          className="text-left"
        />
      </div>

      <div className="md:col-span-2 border-t border-line pt-4">
        <h2 className="text-lg font-semibold">ئامادەبوون</h2>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="qrRequired"
          defaultChecked={company.qr_required}
          className="h-4 w-4"
        />
        QR پێویستە (گشتی)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="selfieRequired"
          defaultChecked={company.selfie_required}
          className="h-4 w-4"
        />
        سێڵفی پێویستە (گشتی)
      </label>

      <div className="md:col-span-2 border-t border-line pt-4">
        <h2 className="text-lg font-semibold">ڕۆژانی پشووی هەفتانە</h2>
        <p className="mt-1 text-sm text-ink-muted">
          لەم ڕۆژانەدا چک-ئین ناکرێت و غەیب نیشانە ناکرێت
        </p>
      </div>

      <div className="flex flex-wrap gap-3 md:col-span-2">
        {WEEK_DAYS.map((d) => (
          <label key={d.dow} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="weeklyOffDows"
              value={d.dow}
              checked={weeklyOff.includes(d.dow)}
              onChange={() => toggleDow(d.dow)}
              className="h-4 w-4"
            />
            {d.label}
          </label>
        ))}
      </div>

      <div className="md:col-span-2 border-t border-line pt-4">
        <h2 className="text-lg font-semibold">کاتی زیادە و غەرامەی غەیب</h2>
      </div>

      <div>
        <Label htmlFor="overtimeRatePerHour">
          نرخی کاتی زیادە / کاتژمێر ({currencyLabel(moneyCurrency)})
        </Label>
        <Input
          id="overtimeRatePerHour"
          name="overtimeRatePerHour"
          type="number"
          min={0}
          step="0.01"
          defaultValue={company.overtime_rate_per_hour}
          dir="ltr"
          className="text-left"
        />
      </div>

      <label className="flex items-center gap-2 text-sm self-end">
        <input
          type="checkbox"
          name="absenceFineEnabled"
          checked={absenceFineEnabled}
          onChange={(e) => setAbsenceFineEnabled(e.target.checked)}
          className="h-4 w-4"
        />
        غەرامەی غەیب چالاک بێت
      </label>

      <div>
        <Label htmlFor="absenceFineAmount">
          بڕی غەرامەی غەیب ({currencyLabel(moneyCurrency)})
        </Label>
        <Input
          id="absenceFineAmount"
          name="absenceFineAmount"
          type="number"
          min={0}
          step="0.01"
          defaultValue={company.absence_fine_amount}
          disabled={!absenceFineEnabled}
          dir="ltr"
          className="text-left"
        />
        <p className="mt-1 text-xs text-ink-muted">
          تەنها بۆ جۆری «بڕی جێگیر» بەکاردێت
        </p>
      </div>
      <div>
        <Label htmlFor="absenceFineMode">جۆری غەرامەی غەیب</Label>
        <select
          id="absenceFineMode"
          name="absenceFineMode"
          defaultValue={company.absence_fine_mode}
          disabled={!absenceFineEnabled}
          className="w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm disabled:opacity-50"
        >
          <option value="fixed">بڕی جێگیر</option>
          <option value="daily_wage">مووچەی ڕۆژانە</option>
        </select>
      </div>

      {(localError || state.error) && (
        <p className="md:col-span-2 text-sm text-red-600">
          {localError || state.error}
        </p>
      )}
      {state.success && (
        <p className="md:col-span-2 text-sm text-brand-700">{state.success}</p>
      )}

      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? ckb.loading : ckb.save}
        </Button>
      </div>
    </form>
  );
}
