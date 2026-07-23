"use client";

import { useActionState, useEffect, useState } from "react";
import QRCode from "qrcode";
import { createQrTokenAction, type ActionResult } from "@/lib/actions/ops";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";

const initial: ActionResult & { token?: string } = {};
const LAST_QR_KEY = "mo_last_qr_token";

export function QrCreateForm() {
  const [state, formAction, pending] = useActionState(
    createQrTokenAction,
    initial,
  );
  const [token, setToken] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(LAST_QR_KEY);
      if (saved) setToken(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (state.token) {
      setToken(state.token);
      try {
        sessionStorage.setItem(LAST_QR_KEY, state.token);
      } catch {
        // ignore
      }
    }
  }, [state.token]);

  useEffect(() => {
    if (!token) {
      setDataUrl(null);
      return;
    }
    setQrError(null);
    void QRCode.toDataURL(token, { width: 280, margin: 2 })
      .then(setDataUrl)
      .catch(() => {
        setDataUrl(null);
        setQrError("وێنەی QR دروست نەبوو — کۆدەکە خوارەوە هەیە.");
      });
  }, [token]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={formAction} className="panel space-y-4 p-5">
        <h2 className="text-lg font-semibold">دروستکردنی کۆدی QR</h2>
        <div>
          <Label htmlFor="label">ناو</Label>
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
        <Button type="submit" disabled={pending}>
          {pending ? ckb.loading : "دروستکردن"}
        </Button>
      </form>

      <div className="panel flex flex-col items-center justify-center gap-3 p-5 print:border-0 print:shadow-none">
        {token ? (
          <>
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt="QR"
                className="rounded-xl border border-line bg-white p-3 print:border-0"
              />
            ) : (
              <div className="flex h-[280px] w-[280px] items-center justify-center rounded-xl border border-dashed border-line text-sm text-ink-muted">
                {qrError || "وێنە بار دەبێت..."}
              </div>
            )}
            <p
              className="break-all text-center text-xs text-ink-muted"
              dir="ltr"
            >
              {token}
            </p>
            <p className="text-sm text-ink-muted print:hidden">
              ئەم کۆدە چاپ بکە یان لە مۆبایل پیشانی کارمەند بدە
            </p>
            <div className="flex gap-2 print:hidden">
              <Button
                type="button"
                variant="secondary"
                onClick={() => window.print()}
              >
                چاپکردن
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard.writeText(token);
                }}
              >
                کۆپیکردن
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            دوای دروستکردن QR لێرە دەردەکەوێت
          </p>
        )}
      </div>
    </div>
  );
}
