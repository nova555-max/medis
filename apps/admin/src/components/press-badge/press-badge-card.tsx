"use client";

import type { PressBadgeData, PressBadgeDesign } from "./press-badge-designs";
import { getPressDesign } from "./press-badge-designs";
import { cn } from "@/lib/cn";

function patternStyle(kind: PressBadgeDesign["frontPattern"], ink: string) {
  if (kind === "none") return undefined;
  if (kind === "dots") {
    return {
      backgroundImage: `radial-gradient(${ink}22 1px, transparent 1px)`,
      backgroundSize: "10px 10px",
    } as const;
  }
  if (kind === "lines") {
    return {
      backgroundImage: `repeating-linear-gradient(-12deg, ${ink}10 0 1px, transparent 1px 9px)`,
    } as const;
  }
  if (kind === "grid") {
    return {
      backgroundImage: `linear-gradient(${ink}12 1px, transparent 1px), linear-gradient(90deg, ${ink}12 1px, transparent 1px)`,
      backgroundSize: "14px 14px",
    } as const;
  }
  return {
    backgroundImage: `repeating-linear-gradient(45deg, ${ink}0D 0 8px, transparent 8px 16px)`,
  } as const;
}

function radiusClass(r: PressBadgeDesign["radius"]) {
  if (r === "sharp") return "rounded-md";
  if (r === "pill") return "rounded-[1.35rem]";
  return "rounded-2xl";
}

function PressMark({
  word,
  design,
  accent,
  primary,
}: {
  word: string;
  design: PressBadgeDesign;
  accent: string;
  primary: string;
}) {
  const text = (word || "PRESS").toUpperCase();

  if (design.pressStyle === "stamp") {
    return (
      <div
        className="inline-flex rotate-[-8deg] items-center justify-center border-[3px] px-3 py-1 text-[1.35rem] font-black tracking-[0.35em]"
        style={{ borderColor: accent, color: accent }}
      >
        {text}
      </div>
    );
  }

  if (design.pressStyle === "outline") {
    return (
      <p
        className="text-[2rem] font-black uppercase tracking-[0.28em]"
        style={{
          color: "transparent",
          WebkitTextStroke: `2px ${accent}`,
        }}
      >
        {text}
      </p>
    );
  }

  if (design.pressStyle === "ribbon") {
    return (
      <div
        className="relative inline-flex items-center px-5 py-1.5 text-sm font-black tracking-[0.4em] text-white"
        style={{ background: accent, color: primary }}
      >
        <span
          className="absolute -left-2 top-0 h-full w-2"
          style={{
            background: accent,
            clipPath: "polygon(100% 0, 0 50%, 100% 100%)",
          }}
        />
        {text}
        <span
          className="absolute -right-2 top-0 h-full w-2"
          style={{
            background: accent,
            clipPath: "polygon(0 0, 100% 50%, 0 100%)",
          }}
        />
      </div>
    );
  }

  if (design.pressStyle === "vertical") {
    return (
      <p
        className="text-[0.7rem] font-black uppercase tracking-[0.55em]"
        style={{
          color: accent,
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
        }}
      >
        {text}
      </p>
    );
  }

  // banner
  return (
    <div
      className="inline-flex items-center gap-2 rounded-sm px-3 py-1 text-[0.95rem] font-black tracking-[0.42em] text-white shadow-sm"
      style={{ background: `linear-gradient(90deg, ${accent}, ${primary})` }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
      {text}
    </div>
  );
}

export function PressBadgeCard({
  data,
  side,
  className,
}: {
  data: PressBadgeData;
  side: "front" | "back";
  className?: string;
}) {
  const base = getPressDesign(data.designId);
  const primary = data.primaryOverride || base.primary;
  const accent = data.accentOverride || base.accent;
  const design = { ...base, primary, accent };

  if (side === "back") {
    return (
      <article
        className={cn(
          "press-badge relative flex aspect-[85.6/54] w-full max-w-[420px] flex-col overflow-hidden border border-black/10 shadow-lg",
          radiusClass(design.radius),
          className,
        )}
        style={{ background: design.surface, color: design.ink }}
        dir="rtl"
      >
        <div
          className="absolute inset-0 opacity-80"
          style={patternStyle(design.backPattern, design.ink)}
        />
        <div
          className="relative flex items-center justify-between px-4 py-2.5 text-white"
          style={{ background: primary }}
        >
          <div className="flex items-center gap-2">
            {data.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.logoDataUrl}
                alt=""
                className="h-8 w-8 rounded-md object-contain bg-white/95 p-0.5"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold"
                style={{ background: accent, color: primary }}
              >
                م
              </div>
            )}
            <div>
              <p className="text-[11px] font-semibold leading-tight">
                {data.organization || "میدیا ئۆفیس"}
              </p>
              <p className="text-[9px] opacity-80">ناسنامەی ڕۆژنامەنووسی · پشتەوە</p>
            </div>
          </div>
          <PressMark
            word={data.pressWord}
            design={design}
            accent={accent}
            primary={primary}
          />
        </div>

        <div className="relative flex flex-1 flex-col gap-2 px-4 py-3 text-[11px]">
          <div className="grid grid-cols-2 gap-2">
            <Info label="ئایدی" value={data.badgeId || "—"} dir="ltr" />
            <Info label="دەرکردن" value={data.issuedAt || "—"} dir="ltr" />
            <Info label="بەسەردەچێت" value={data.expiresAt || "—"} dir="ltr" />
            <Info label="خوێن" value={data.bloodType || "—"} dir="ltr" />
            <Info label="مۆبایل" value={data.phone || "—"} dir="ltr" />
            <Info label="ئیمەیڵ" value={data.email || "—"} dir="ltr" />
          </div>
          <div
            className="mt-auto rounded-xl border px-3 py-2 text-[10px] leading-relaxed"
            style={{ borderColor: `${primary}33`, color: design.muted }}
          >
            {data.notes || "ئەم ناسنامەیە تەنها بۆ مەبەستی ڕۆژنامەنووسی بەکاردێت."}
          </div>
        </div>
      </article>
    );
  }

  const verticalPress = design.pressStyle === "vertical";

  return (
    <article
      className={cn(
        "press-badge relative flex aspect-[85.6/54] w-full max-w-[420px] overflow-hidden border border-black/10 shadow-lg",
        radiusClass(design.radius),
        className,
      )}
      style={{ background: design.surface, color: design.ink }}
      dir="rtl"
    >
      <div
        className="absolute inset-0"
        style={patternStyle(design.frontPattern, design.ink)}
      />

      {/* Left accent rail (visual right in RTL) */}
      <div className="relative z-[1] flex w-[34%] flex-col" style={{ background: primary }}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-3 text-center text-white">
          {data.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.logoDataUrl}
              alt=""
              className="h-12 w-12 rounded-xl object-contain bg-white p-1 shadow-sm"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-black"
              style={{ background: accent, color: primary }}
            >
              م
            </div>
          )}
          <div>
            <p className="text-[10px] font-medium opacity-80">MEDIA PASS</p>
            <p className="mt-0.5 text-xs font-bold leading-snug">
              {data.organization || "میدیا ئۆفیس"}
            </p>
          </div>
          {verticalPress ? (
            <div className="mt-1 flex flex-1 items-center">
              <PressMark
                word={data.pressWord}
                design={design}
                accent={accent}
                primary={primary}
              />
            </div>
          ) : null}
        </div>
        <div
          className="px-2 py-2 text-center text-[9px] font-semibold tracking-wide"
          style={{ background: accent, color: primary }}
        >
          {data.badgeId ? `#${data.badgeId}` : "PRESS ID"}
        </div>
      </div>

      <div className="relative z-[1] flex flex-1 flex-col p-3.5">
        <div className="mb-2 flex items-start justify-between gap-2">
          {!verticalPress ? (
            <PressMark
              word={data.pressWord}
              design={design}
              accent={accent}
              primary={primary}
            />
          ) : (
            <span className="text-[10px] font-semibold" style={{ color: design.muted }}>
              ناسنامەی ڕۆژنامەنووسی
            </span>
          )}
        </div>

        <div className="flex flex-1 items-center gap-3">
          <div
            className="h-[4.6rem] w-[3.6rem] shrink-0 overflow-hidden border-2 bg-white/80"
            style={{ borderColor: accent }}
          >
            {data.photoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.photoDataUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-[10px]"
                style={{ color: design.muted }}
              >
                وێنە
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black leading-tight">
              {data.fullName || "ناوی ڕۆژنامەنووس"}
            </p>
            <p
              className="mt-1 text-xs font-semibold"
              style={{ color: primary }}
            >
              {data.title || "ڕۆژنامەنووس"}
            </p>
            <p className="mt-2 text-[10px]" style={{ color: design.muted }}>
              دەرکردن: {data.issuedAt || "—"}
              {data.expiresAt ? ` · تا ${data.expiresAt}` : ""}
            </p>
          </div>
        </div>

        <div
          className="mt-2 flex items-center justify-between border-t pt-2 text-[9px] font-medium"
          style={{ borderColor: `${primary}22`, color: design.muted }}
        >
          <span>Official Press Credential</span>
          <span style={{ color: accent }} className="font-bold tracking-widest">
            {(data.pressWord || "PRESS").toUpperCase()}
          </span>
        </div>
      </div>
    </article>
  );
}

function Info({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div>
      <p className="text-[9px] opacity-60">{label}</p>
      <p className="truncate font-semibold" dir={dir}>
        {value}
      </p>
    </div>
  );
}
