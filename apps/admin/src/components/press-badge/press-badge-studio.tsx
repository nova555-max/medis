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

const STORAGE_KEY = "mo_press_badge_draft_v4";

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
      const parsed = JSON.parse(raw) as Partial<PressBadgeData>;
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
    () =>
      PRESS_BADGE_DESIGNS.find((d) => d.id === data.designId) ||
      PRESS_BADGE_DESIGNS[0],
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
          ١٠ کارتی فەرمی دامەزراوەیی · فۆتۆ + خانەی زانیاری · نیشانی PRESS ·
          پێشەوە/پشتەوە
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5 print:hidden">
          <section className="panel space-y-3 p-4">
            <h2 className="font-semibold">
              ١) جۆری ناسنامە ({PRESS_BADGE_DESIGNS.length})
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRESS_BADGE_DESIGNS.map((d) => {
                const active = data.designId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      patch({
                        designId: d.id as PressBadgeDesignId,
                        useCustomColors: false,
                      })
                    }
                    className={cn(
                      "rounded-xl border p-3 text-right transition",
                      active
                        ? "border-brand-600 ring-2 ring-brand-600/30"
                        : "border-line hover:border-brand-300",
                    )}
                  >
                    <div className="mb-2 flex h-8 overflow-hidden rounded">
                      <div className="w-2/3" style={{ background: d.ink }} />
                      <div
                        className="w-1/3"
                        style={{ background: d.pressMark }}
                      />
                    </div>
                    <p className="text-sm font-semibold">{d.nameKu}</p>
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
                  value={data.holderName}
                  onChange={(e) => patch({ holderName: e.target.value })}
                  placeholder="ناوی ڕۆژنامەنووس"
                />
              </Field>
              <Field label="پۆست / فەنکشن">
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
              <Field label="دەرچوون / ئۆتڵێت">
                <Input
                  value={data.mediaOutlet}
                  onChange={(e) => patch({ mediaOutlet: e.target.value })}
                  placeholder="ناوی کەناڵ / ڕۆژنامە"
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
              <Field label="ماڵپەڕ / پشتڕاستکردنەوە">
                <Input
                  value={data.website}
                  onChange={(e) => patch({ website: e.target.value })}
                  dir="ltr"
                  placeholder="https://"
                />
              </Field>
              <Field label="بەرواری دەرکردن">
                <Input
                  type="date"
                  value={data.validFrom}
                  onChange={(e) => patch({ validFrom: e.target.value })}
                  dir="ltr"
                />
              </Field>
              <Field label="بەسەردەچێت">
                <Input
                  type="date"
                  value={data.validTo}
                  onChange={(e) => patch({ validTo: e.target.value })}
                  dir="ltr"
                />
              </Field>
              <Field label="تەلەفۆنی پەیوەندی">
                <Input
                  value={data.emergencyPhone}
                  onChange={(e) => patch({ emergencyPhone: e.target.value })}
                  dir="ltr"
                />
              </Field>
              <Field label="تێبینی پێشەوە (ئینگلیزی)">
                <Input
                  value={data.frontNote}
                  onChange={(e) => patch({ frontNote: e.target.value })}
                  dir="ltr"
                  placeholder="Accredited working journalist"
                />
              </Field>
            </div>

            <div>
              <Label htmlFor="backNote">مەرجەکانی پشتەوە</Label>
              <textarea
                id="backNote"
                value={data.backNote}
                onChange={(e) => patch({ backNote: e.target.value })}
                rows={3}
                dir="ltr"
                className="mt-1.5 w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="customColors"
                type="checkbox"
                checked={data.useCustomColors}
                onChange={(e) => patch({ useCustomColors: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="customColors">ڕەنگی تایبەت (لە جیاتی دیزاین)</Label>
            </div>

            {data.useCustomColors ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="ڕەنگی سەرپەڕە / دەزگا">
                  <input
                    type="color"
                    value={data.customPrimary}
                    onChange={(e) => patch({ customPrimary: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded border border-line bg-transparent"
                  />
                </Field>
                <Field label="ڕەنگی نیشانی PRESS">
                  <input
                    type="color"
                    value={data.customAccent}
                    onChange={(e) => patch({ customAccent: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded border border-line bg-transparent"
                  />
                </Field>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="لۆگۆی دەزگا">
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
          <div className="flex flex-wrap items-center gap-2 print:hidden">
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
            <p className="text-sm text-emerald-700 print:hidden">{savedHint}</p>
          ) : null}

          <div className="flex justify-center rounded-2xl border border-line bg-surface-muted/40 p-5 print:hidden">
            <div className="w-[220px]">
              <PressBadgeCard
                design={activeDesign}
                data={data}
                side={side}
              />
            </div>
          </div>

          <div className="press-badge-print-sheet hidden print:block">
            <div className="press-badge-print-page">
              <p className="mb-2 text-center text-xs text-black/60">پێشەوە</p>
              <PressBadgeCard
                design={activeDesign}
                data={data}
                side="front"
                className="mx-auto max-w-[54mm]"
              />
            </div>
            <div className="press-badge-print-page">
              <p className="mb-2 text-center text-xs text-black/60">پشتەوە</p>
              <PressBadgeCard
                design={activeDesign}
                data={data}
                side="back"
                className="mx-auto max-w-[54mm]"
              />
            </div>
          </div>

          <p className="text-center text-xs text-ink-muted print:hidden" dir="ltr">
            {activeDesign.nameEn}
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

export type { PressBadgeDesignId };
