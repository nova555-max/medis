"use client";

import { useActionState, useEffect, useState } from "react";
import QRCode from "qrcode";
import { createQrTokenAction, type ActionResult } from "@/lib/actions/ops";
import { QrPrintPoster } from "@/components/qr/qr-print-poster";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: ActionResult & { token?: string } = {};
const LAST_QR_KEY = "mo_last_qr_token";
const LAST_QR_LABEL_KEY = "mo_last_qr_label";
const LAST_QR_HOURS_KEY = "mo_last_qr_hours";

export function QrCreateForm({
  companyName,
  logoUrl,
}: {
  companyName?: string;
  logoUrl?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    createQrTokenAction,
    initial,
  );
  const [token, setToken] = useState<string | null>(null);
  const [label, setLabel] = useState("سەرەکی");
  const [hours, setHours] = useState(24);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(LAST_QR_KEY);
      const savedLabel = sessionStorage.getItem(LAST_QR_LABEL_KEY);
      const savedHours = sessionStorage.getItem(LAST_QR_HOURS_KEY);
      if (saved) setToken(saved);
      if (savedLabel) setLabel(savedLabel);
      if (savedHours) setHours(Number(savedHours) || 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (state.token) {
      setToken(state.token);
      try {
        sessionStorage.setItem(LAST_QR_KEY, state.token);
        sessionStorage.setItem(LAST_QR_LABEL_KEY, label);
        sessionStorage.setItem(LAST_QR_HOURS_KEY, String(hours));
      } catch {
        // ignore
      }
    }
  }, [state.token, label, hours]);

  useEffect(() => {
    if (!token) {
      setDataUrl(null);
      return;
    }
    setQrError(null);
    void QRCode.toDataURL(token, {
      width: 520,
      margin: 2,
      color: { dark: "#0f2744", light: "#ffffff" },
      errorCorrectionLevel: "H",
    })
      .then(setDataUrl)
      .catch(() => {
        setDataUrl(null);
        setQrError("وێنەی QR دروست نەبوو — کۆدەکە خوارەوە هەیە.");
      });
  }, [token]);

  const expiresHint =
    hours > 0
      ? `ماوەی کارکردن: ${hours} کاتژمێر لە کاتی دروستکردنەوە`
      : "ماوە: بێ کۆتایی (تا ناکارا بکرێت)";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <form
        action={formAction}
        className="panel space-y-4 p-5 print:hidden"
        onSubmit={(e) => {
          const fd = new FormData(e.currentTarget);
          setLabel(String(fd.get("label") || "سەرەکی").trim() || "سەرەکی");
          setHours(Number(fd.get("hours") || 0));
        }}
      >
        <h2 className="text-lg font-semibold">دروستکردنی کۆدی QR</h2>
        <div>
          <Label htmlFor="label">ناو / شوێن</Label>
          <Input id="label" name="label" defaultValue="سەرەکی" />
        </div>
        <div>
          <Label htmlFor="hours">ماوە (کاتژمێر) — ٠ = بێ کۆتایی</Label>
          <Input
            id="hours"
            name="hours"
            type="number"
            min={0}
            defaultValue={24}
            dir="ltr"
            className="text-left"
          />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && (
          <p className="text-sm text-brand-700">{state.success}</p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? ckb.loading : "دروستکردنی QR"}
        </Button>
      </form>

      <div className="space-y-4">
        {token ? (
          <>
            <div className="qr-print-screen panel overflow-hidden p-4 md:p-6">
              <QrPrintPoster
                dataUrl={dataUrl}
                token={token}
                label={label}
                companyName={companyName}
                logoUrl={logoUrl}
                expiresHint={expiresHint}
              />
              {qrError ? (
                <p className="mt-3 text-center text-sm text-red-600 print:hidden">
                  {qrError}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              <Button type="button" onClick={() => window.print()}>
                چاپکردنی پۆستەر
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(token);
                }}
              >
                کۆپیکردنی کۆد
              </Button>
            </div>
            <p
              className="break-all text-xs text-ink-muted print:hidden"
              dir="ltr"
            >
              {token}
            </p>
          </>
        ) : (
          <div className="panel flex min-h-[28rem] items-center justify-center p-8 text-center text-sm text-ink-muted print:hidden">
            دوای دروستکردن، پۆستەری جوانی چاپ لێرە دەردەکەوێت
          </div>
        )}
      </div>
    </div>
  );
}
