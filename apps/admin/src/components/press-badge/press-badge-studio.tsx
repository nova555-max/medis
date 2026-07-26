"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PRESS_BADGE,
  PRESS_BADGE_DESIGNS,
  type PressBadgeData,
  type PressBadgeDesignId,
} from "@/components/press-badge/press-badge-designs";
import { PressBadgeCard } from "@/components/press-badge/press-badge-card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "mo_press_badge_draft_v1";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function randomBadgeId() {
  return `PR-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function PressBadgeStudio({
  defaultOrganization,
  defaultLogoUrl,
}: {
  defaultOrganization?: string;
  defaultLogoUrl?: string | null;
}) {
  const [data, setData] = useState<PressBadgeData>(() => ({
    ...DEFAULT_PRESS_BADGE,
    organization: defaultOrganization || "",
    badgeId: randomBadgeId(),
  }));
  const [side, setSide] = useState<"front" | "back">("front");
  const [savedHint, setSavedHint] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PressBadgeData;
      setData((prev) => ({
        ...prev,
        ...parsed,
        organization:
          parsed.organization || defaultOrganization || prev.organization,
      }));
    } catch {
      /* ignore */
    }
  }, [defaultOrganization]);

  useEffect(() => {
    if (!defaultLogoUrl) return;
    setData((prev) =>
      prev.logoDataUrl ? prev : { ...prev, logoDataUrl: defaultLogoUrl },
    );
  }, [defaultLogoUrl]);

  const activeDesign = useMemo(
    () => PRESS_BADGE_DESIGNS.find((d) => d.id === data.designId),
    [data.designId],
  );

  function patch(partial: Partial<PressBadgeData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSavedHint("ڕەشنووس پاشەکەوتکرا لەم ئامێرە");
    window.setTimeout(() => setSavedHint(null), 2500);
  }

  async function onLogo(file: File | null) {
    if (!file) return;
    const url = await readFileAsDataUrl(file);
    patch({ logoDataUrl: url });
  }

  async function onPhoto(file: File | null) {
    if (!file) return;
    const url = await readFileAsDataUrl(file);
    patch({ photoDataUrl: url });
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold md:text-3xl">ناسنامەی ڕۆژنامەنووسی</h1>
        <p className="mt-1 text-sm text-ink-muted">
          ١٠ دیزاین · دوو لایە (پێشەوە / پشتەوە) · لۆگۆ و ڕەنگی خۆت · وشەی PRESS بە
          شێوازی جوان
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5 print:hidden">
          <section className="panel space-y-3 p-4">
            <h2 className="font-semibold">١) هەڵبژاردنی دیزاین ({PRESS_BADGE_DESIGNS.length})</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRESS_BADGE_DESIGNS.map((d) => {
                const active = data.designId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      patch({
                        designId: d.id,
                        primaryOverride: "",
                        accentOverride: "",
                      })
                    }
                    className={cn(
                      "rounded-xl border p-3 text-right transition",
                      active
                        ? "border-brand-600 ring-2 ring-brand-600/30"
                        : "border-line hover:border-brand-300",
                    )}
                  >
                    <div className="mb-2 flex h-10 overflow-hidden rounded-lg">
                      <div className="w-1/2" style={{ background: d.primary }} />
                      <div className="w-1/2" style={{ background: d.accent }} />
                    </div>
                    <p className="text-sm font-semibold">{d.nameCkb}</p>
                    <p className="text-[11px] text-ink-muted" dir="ltr">
                      {d.nameEn}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel space-y-4 p-4">
            <h2 className="font-semibold">٢) زانیاری و ڕەنگ</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="ناوی تەواو">
                <Input
                  value={data.fullName}
                  onChange={(e) => patch({ fullName: e.target.value })}
                  placeholder="ناوی ڕۆژنامەنووس"
                />
              </Field>
              <Field label="پۆست / ناونیشان">
                <Input
                  value={data.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="ڕۆژنامەنووس"
                />
              </Field>
              <Field label="ناوی دەزگا / میدیا">
                <Input
                  value={data.organization}
                  onChange={(e) => patch({ organization: e.target.value })}
                  placeholder={defaultOrganization || "میدیا ئۆفیس"}
                />
              </Field>
              <Field label="ژمارەی ناسنامە">
                <div className="flex gap-2">
                  <Input
                    value={data.badgeId}
                    onChange={(e) => patch({ badgeId: e.target.value })}
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => patch({ badgeId: randomBadgeId() })}
                  >
                    نوێ
                  </Button>
                </div>
              </Field>
              <Field label="بەرواری دەرکردن">
                <Input
                  type="date"
                  value={data.issuedAt}
                  onChange={(e) => patch({ issuedAt: e.target.value })}
                  dir="ltr"
                />
              </Field>
              <Field label="بەسەردەچێت">
                <Input
                  type="date"
                  value={data.expiresAt}
                  onChange={(e) => patch({ expiresAt: e.target.value })}
                  dir="ltr"
                />
              </Field>
              <Field label="مۆبایل">
                <Input
                  value={data.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  dir="ltr"
                />
              </Field>
              <Field label="ئیمەیڵ">
                <Input
                  value={data.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  dir="ltr"
                  type="email"
                />
              </Field>
              <Field label="جۆری خوێن (پشتەوە)">
                <Input
                  value={data.bloodType}
                  onChange={(e) => patch({ bloodType: e.target.value })}
                  dir="ltr"
                  placeholder="O+"
                />
              </Field>
              <Field label="وشەی PRESS لەسەر باجەکە">
                <Input
                  value={data.pressWord}
                  onChange={(e) => patch({ pressWord: e.target.value })}
                  dir="ltr"
                  placeholder="PRESS"
                />
              </Field>
            </div>

            <div>
              <Label htmlFor="notes">تێبینی پشتەوە</Label>
              <textarea
                id="notes"
                value={data.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`ڕەنگی سەرەکی${activeDesign ? ` (${activeDesign.nameCkb})` : ""}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={data.primaryOverride || activeDesign?.primary || "#1B3A5F"}
                    onChange={(e) => patch({ primaryOverride: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded border border-line bg-transparent"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => patch({ primaryOverride: "" })}
                  >
                    گەڕانەوە بۆ دیزاین
                  </Button>
                </div>
              </Field>
              <Field label="ڕەنگی accent / PRESS">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={data.accentOverride || activeDesign?.accent || "#C9A227"}
                    onChange={(e) => patch({ accentOverride: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded border border-line bg-transparent"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => patch({ accentOverride: "" })}
                  >
                    گەڕانەوە بۆ دیزاین
                  </Button>
                </div>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="لۆگۆی ئەدمین (لەسەر باجەکە)">
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm"
                  onChange={(e) => void onLogo(e.target.files?.[0] ?? null)}
                />
                {data.logoDataUrl ? (
                  <button
                    type="button"
                    className="mt-1 text-xs text-red-600"
                    onClick={() => patch({ logoDataUrl: null })}
                  >
                    لابردنی لۆگۆ
                  </button>
                ) : null}
              </Field>
              <Field label="وێنەی ڕۆژنامەنووس">
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm"
                  onChange={(e) => void onPhoto(e.target.files?.[0] ?? null)}
                />
                {data.photoDataUrl ? (
                  <button
                    type="button"
                    className="mt-1 text-xs text-red-600"
                    onClick={() => patch({ photoDataUrl: null })}
                  >
                    لابردنی وێنە
                  </button>
                ) : null}
              </Field>
            </div>
          </section>
        </div>

        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <div className="print:hidden flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={side === "front" ? "primary" : "secondary"}
              onClick={() => setSide("front")}
            >
              پێشەوە
            </Button>
            <Button
              type="button"
              variant={side === "back" ? "primary" : "secondary"}
              onClick={() => setSide("back")}
            >
              پشتەوە
            </Button>
            <Button type="button" variant="secondary" onClick={saveDraft}>
              پاشەکەوتکردنی ڕەشنووس
            </Button>
            <Button type="button" onClick={() => window.print()}>
              چاپکردنی هەردوو لایە
            </Button>
          </div>
          {savedHint ? (
            <p className="print:hidden text-sm text-emerald-700">{savedHint}</p>
          ) : null}

          <div className="print:hidden flex justify-center rounded-2xl border border-line bg-surface-muted/40 p-4">
            <PressBadgeCard data={data} side={side} />
          </div>

          {/* Print sheet: both sides — always in DOM for print CSS visibility */}
          <div className="press-badge-print-sheet hidden print:block">
            <div className="press-badge-print-page">
              <p className="mb-2 text-center text-xs text-black/60">پێشەوە</p>
              <PressBadgeCard data={data} side="front" className="mx-auto" />
            </div>
            <div className="press-badge-print-page">
              <p className="mb-2 text-center text-xs text-black/60">پشتەوە</p>
              <PressBadgeCard data={data} side="back" className="mx-auto" />
            </div>
          </div>

          <p className="print:hidden text-center text-xs text-ink-muted">
            دیزاینی ئێستا: {activeDesign?.nameCkb} · وشەی{" "}
            <span dir="ltr" className="font-semibold">
              {(data.pressWord || "PRESS").toUpperCase()}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

// keep type import used for design id casting if needed later
export type { PressBadgeDesignId };
