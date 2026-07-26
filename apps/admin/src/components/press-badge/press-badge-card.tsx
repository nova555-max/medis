"use client";

import type { PressBadgeData, PressBadgeDesign } from "./press-badge-designs";
import { getPressDesign } from "./press-badge-designs";
import { cn } from "@/lib/cn";

/** Tall press pass — portrait credential */
const BADGE_SHELL =
  "press-badge relative flex aspect-[63/100] w-full max-w-[280px] flex-col overflow-hidden shadow-[0_18px_40px_-20px_rgba(0,0,0,0.45)]";

function PressWord({
  word,
  accent,
  primary,
  variant,
}: {
  word: string;
  accent: string;
  primary: string;
  variant: "solid" | "outline" | "neon" | "stamp" | "serif";
}) {
  const text = (word || "PRESS").toUpperCase();

  if (variant === "outline") {
    return (
      <p
        className="text-center text-[2.1rem] font-black tracking-[0.32em]"
        style={{ color: "transparent", WebkitTextStroke: `2.5px ${accent}` }}
      >
        {text}
      </p>
    );
  }
  if (variant === "neon") {
    return (
      <p
        className="text-center text-[1.85rem] font-black tracking-[0.38em]"
        style={{
          color: accent,
          textShadow: `0 0 8px ${accent}, 0 0 18px ${accent}88`,
        }}
      >
        {text}
      </p>
    );
  }
  if (variant === "stamp") {
    return (
      <div
        className="mx-auto inline-flex rotate-[-7deg] items-center justify-center border-[3px] px-4 py-1.5 text-[1.4rem] font-black tracking-[0.28em]"
        style={{ borderColor: accent, color: accent }}
      >
        {text}
      </div>
    );
  }
  if (variant === "serif") {
    return (
      <p
        className="text-center font-serif text-[2.4rem] font-black tracking-[0.12em]"
        style={{ color: primary }}
      >
        {text}
      </p>
    );
  }
  return (
    <div
      className="mx-auto inline-flex items-center gap-2 rounded-full px-5 py-1.5 text-sm font-black tracking-[0.42em] text-white"
      style={{ background: `linear-gradient(90deg, ${primary}, ${accent})` }}
    >
      {text}
    </div>
  );
}

function LogoBlock({
  src,
  primary,
  accent,
  light,
}: {
  src: string | null;
  primary: string;
  accent: string;
  light?: boolean;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={cn(
          "h-11 w-11 rounded-xl object-contain p-1",
          light ? "bg-white/95" : "bg-white",
        )}
      />
    );
  }
  return (
    <div
      className="flex h-11 w-11 items-center justify-center rounded-xl text-base font-black"
      style={{ background: accent, color: primary }}
    >
      م
    </div>
  );
}

function Photo({
  src,
  className,
  muted,
}: {
  src: string | null;
  className?: string;
  muted: string;
}) {
  return (
    <div className={cn("overflow-hidden bg-black/5", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-xs"
          style={{ color: muted }}
        >
          وێنە
        </div>
      )}
    </div>
  );
}

function useTheme(data: PressBadgeData) {
  const base = getPressDesign(data.designId);
  return {
    ...base,
    primary: data.primaryOverride || base.primary,
    accent: data.accentOverride || base.accent,
  };
}

function BackCommon({
  data,
  design,
  className,
  children,
}: {
  data: PressBadgeData;
  design: PressBadgeDesign;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <article
      className={cn(BADGE_SHELL, "rounded-[1.35rem]", className)}
      style={{ background: design.surface, color: design.ink }}
      dir="rtl"
    >
      {children}
      <div
        className="relative flex items-center gap-3 px-4 py-3 text-white"
        style={{ background: design.primary }}
      >
        <LogoBlock
          src={data.logoDataUrl}
          primary={design.primary}
          accent={design.accent}
          light
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            {data.organization || "میدیا ئۆفیس"}
          </p>
          <p className="text-[10px] opacity-80">ناسنامەی ڕۆژنامەنووسی · پشتەوە</p>
        </div>
      </div>
      <div className="relative flex flex-1 flex-col gap-2.5 px-4 py-4 text-[11px]">
        <PressWord
          word={data.pressWord}
          accent={design.accent}
          primary={design.primary}
          variant="outline"
        />
        <div className="mt-1 grid grid-cols-2 gap-2.5">
          <Info label="ئایدی" value={data.badgeId || "—"} dir="ltr" />
          <Info label="دەرکردن" value={data.issuedAt || "—"} dir="ltr" />
          <Info label="بەسەردەچێت" value={data.expiresAt || "—"} dir="ltr" />
          <Info label="خوێن" value={data.bloodType || "—"} dir="ltr" />
          <Info label="مۆبایل" value={data.phone || "—"} dir="ltr" />
          <Info label="ئیمەیڵ" value={data.email || "—"} dir="ltr" />
        </div>
        <div
          className="mt-auto rounded-2xl border px-3 py-2.5 text-[10px] leading-relaxed"
          style={{ borderColor: `${design.primary}28`, color: design.muted }}
        >
          {data.notes || "ئەم ناسنامەیە تەنها بۆ مەبەستی ڕۆژنامەنووسی بەکاردێت."}
        </div>
      </div>
    </article>
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
  const design = useTheme(data);

  if (side === "back") {
    return <BackCommon data={data} design={design} className={className} />;
  }

  switch (design.layout) {
    case "cinema":
      return <LayoutCinema data={data} design={design} className={className} />;
    case "masthead":
      return <LayoutMasthead data={data} design={design} className={className} />;
    case "lanyard":
      return <LayoutLanyard data={data} design={design} className={className} />;
    case "diagonal":
      return <LayoutDiagonal data={data} design={design} className={className} />;
    case "gallery":
      return <LayoutGallery data={data} design={design} className={className} />;
    case "neon":
      return <LayoutNeon data={data} design={design} className={className} />;
    case "field":
      return <LayoutField data={data} design={design} className={className} />;
    case "archive":
      return <LayoutArchive data={data} design={design} className={className} />;
    case "lens":
      return <LayoutLens data={data} design={design} className={className} />;
    case "hero":
    default:
      return <LayoutHero data={data} design={design} className={className} />;
  }
}

function LayoutHero({
  data,
  design,
  className,
}: {
  data: PressBadgeData;
  design: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(BADGE_SHELL, "rounded-[1.4rem]", className)}
      style={{ background: design.surface, color: design.ink }}
      dir="rtl"
    >
      <div
        className="relative px-4 pb-5 pt-4 text-white"
        style={{
          background: `linear-gradient(165deg, ${design.primary} 0%, ${design.secondary || design.primary} 100%)`,
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <LogoBlock
            src={data.logoDataUrl}
            primary={design.primary}
            accent={design.accent}
            light
          />
          <p className="text-[10px] font-semibold tracking-wide opacity-80">
            MEDIA CREDENTIAL
          </p>
        </div>
        <Photo
          src={data.photoDataUrl}
          muted={design.muted}
          className="mx-auto h-36 w-28 rounded-2xl border-2 border-white/30 shadow-lg"
        />
        <div
          className="absolute inset-x-6 -bottom-3 rounded-full py-1.5 text-center text-xs font-black tracking-[0.45em]"
          style={{ background: design.accent, color: design.primary }}
        >
          {(data.pressWord || "PRESS").toUpperCase()}
        </div>
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-6 text-center">
        <p className="text-xl font-black leading-tight">
          {data.fullName || "ناوی ڕۆژنامەنووس"}
        </p>
        <p className="mt-1 text-sm font-semibold" style={{ color: design.primary }}>
          {data.title || "ڕۆژنامەنووس"}
        </p>
        <p className="mt-2 text-xs" style={{ color: design.muted }}>
          {data.organization || "میدیا ئۆفیس"}
        </p>
        <div className="mt-auto space-y-1 border-t pt-3 text-[10px]" style={{ borderColor: `${design.primary}18`, color: design.muted }}>
          <p dir="ltr">ID {data.badgeId || "—"}</p>
          <p>
            {data.issuedAt || "—"}
            {data.expiresAt ? ` → ${data.expiresAt}` : ""}
          </p>
        </div>
      </div>
    </article>
  );
}

function LayoutCinema({
  data,
  design,
  className,
}: {
  data: PressBadgeData;
  design: PressBadgeDesign;
  className?: string;
}) {
  const holes = Array.from({ length: 10 });
  return (
    <article
      className={cn(BADGE_SHELL, "rounded-xl", className)}
      style={{ background: design.surface, color: design.ink }}
      dir="rtl"
    >
      <div className="flex flex-1">
        <div
          className="flex w-5 flex-col justify-between py-2"
          style={{ background: design.primary }}
        >
          {holes.map((_, i) => (
            <span key={i} className="mx-auto h-2.5 w-2.5 rounded-sm bg-black/50" />
          ))}
        </div>
        <div className="flex flex-1 flex-col px-3 py-3">
          <div className="mb-3 flex items-center justify-between">
            <LogoBlock
              src={data.logoDataUrl}
              primary={design.primary}
              accent={design.accent}
            />
            <span
              className="text-[10px] font-bold tracking-[0.3em]"
              style={{ color: design.accent }}
            >
              TAKE
            </span>
          </div>
          <Photo
            src={data.photoDataUrl}
            muted={design.muted}
            className="h-40 w-full rounded-md border border-white/10"
          />
          <PressWord
            word={data.pressWord}
            accent={design.accent}
            primary={design.primary}
            variant="solid"
          />
          <div className="mt-3 text-center">
            <p className="text-lg font-black">
              {data.fullName || "ناوی ڕۆژنامەنووس"}
            </p>
            <p className="mt-1 text-xs" style={{ color: design.muted }}>
              {data.title || "ڕۆژنامەنووس"} · {data.organization || "میدیا ئۆفیس"}
            </p>
            <p className="mt-2 text-[10px]" style={{ color: design.accent }} dir="ltr">
              #{data.badgeId || "——"}
            </p>
          </div>
        </div>
        <div
          className="flex w-5 flex-col justify-between py-2"
          style={{ background: design.primary }}
        >
          {holes.map((_, i) => (
            <span key={i} className="mx-auto h-2.5 w-2.5 rounded-sm bg-black/50" />
          ))}
        </div>
      </div>
    </article>
  );
}

function LayoutMasthead({
  data,
  design,
  className,
}: {
  data: PressBadgeData;
  design: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(BADGE_SHELL, "rounded-md border border-black/15", className)}
      style={{ background: design.surface, color: design.ink }}
      dir="rtl"
    >
      <div className="border-b-4 px-3 pb-2 pt-3" style={{ borderColor: design.accent }}>
        <PressWord
          word={data.pressWord}
          accent={design.accent}
          primary={design.primary}
          variant="serif"
        />
        <p className="mt-1 text-center text-[10px] uppercase tracking-[0.35em]" style={{ color: design.muted }}>
          Official Correspondent Pass
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center gap-3 px-4 py-4">
        <LogoBlock
          src={data.logoDataUrl}
          primary={design.primary}
          accent={design.accent}
        />
        <Photo
          src={data.photoDataUrl}
          muted={design.muted}
          className="h-36 w-28 border border-black/20"
        />
        <div className="w-full text-center">
          <p className="font-serif text-xl font-black leading-tight">
            {data.fullName || "ناوی ڕۆژنامەنووس"}
          </p>
          <p className="mt-1 text-sm italic" style={{ color: design.accent }}>
            {data.title || "ڕۆژنامەنووس"}
          </p>
          <p className="mt-2 border-y border-black/10 py-2 text-xs font-semibold">
            {data.organization || "میدیا ئۆفیس"}
          </p>
          <p className="mt-2 text-[10px]" style={{ color: design.muted }} dir="ltr">
            No. {data.badgeId || "—"} · {data.issuedAt || "—"}
          </p>
        </div>
      </div>
    </article>
  );
}

function LayoutLanyard({
  data,
  design,
  className,
}: {
  data: PressBadgeData;
  design: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(BADGE_SHELL, "rounded-[1.6rem] border border-black/5", className)}
      style={{ background: design.surface, color: design.ink }}
      dir="rtl"
    >
      <div className="flex justify-center pt-3">
        <span
          className="h-3 w-10 rounded-full border-2"
          style={{ borderColor: design.secondary || design.accent }}
        />
      </div>
      <div className="mt-3 flex justify-center">
        <LogoBlock
          src={data.logoDataUrl}
          primary={design.primary}
          accent={design.accent}
        />
      </div>
      <div className="mt-4 flex justify-center">
        <div
          className="rounded-full p-1"
          style={{ boxShadow: `0 0 0 4px ${design.accent}` }}
        >
          <Photo
            src={data.photoDataUrl}
            muted={design.muted}
            className="h-36 w-36 rounded-full"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-1 flex-col px-4 pb-4 text-center">
        <PressWord
          word={data.pressWord}
          accent={design.accent}
          primary={design.primary}
          variant="solid"
        />
        <p className="mt-3 text-xl font-black">
          {data.fullName || "ناوی ڕۆژنامەنووس"}
        </p>
        <p className="mt-1 text-sm" style={{ color: design.primary }}>
          {data.title || "ڕۆژنامەنووس"}
        </p>
        <p className="mt-auto pt-3 text-xs" style={{ color: design.muted }}>
          {data.organization || "میدیا ئۆفیس"} · {data.badgeId || "—"}
        </p>
      </div>
    </article>
  );
}

function LayoutDiagonal({
  data,
  design,
  className,
}: {
  data: PressBadgeData;
  design: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(BADGE_SHELL, "rounded-2xl", className)}
      style={{ background: design.surface, color: design.ink }}
      dir="rtl"
    >
      <div className="relative h-[42%] overflow-hidden" style={{ background: design.primary }}>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${design.primary} 45%, ${design.secondary || design.accent} 45%)`,
          }}
        />
        <div className="relative z-[1] flex h-full flex-col items-center justify-center gap-2 p-4 text-white">
          <LogoBlock
            src={data.logoDataUrl}
            primary={design.primary}
            accent={design.accent}
            light
          />
          <PressWord
            word={data.pressWord}
            accent={design.accent}
            primary={design.primary}
            variant="stamp"
          />
        </div>
      </div>
      <div className="-mt-8 flex flex-1 flex-col items-center px-4 pb-4">
        <Photo
          src={data.photoDataUrl}
          muted={design.muted}
          className="h-32 w-28 rounded-xl border-4 border-white shadow-md"
        />
        <p className="mt-3 text-center text-lg font-black">
          {data.fullName || "ناوی ڕۆژنامەنووس"}
        </p>
        <p className="text-sm font-semibold" style={{ color: design.secondary || design.primary }}>
          {data.title || "ڕۆژنامەنووس"}
        </p>
        <p className="mt-auto text-center text-[11px]" style={{ color: design.muted }}>
          {data.organization || "میدیا ئۆفیس"}
          <br />
          <span dir="ltr">{data.badgeId || "—"}</span>
        </p>
      </div>
    </article>
  );
}

function LayoutGallery({
  data,
  design,
  className,
}: {
  data: PressBadgeData;
  design: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(BADGE_SHELL, "rounded-sm p-3", className)}
      style={{ background: design.secondary || "#E7E5E4", color: design.ink }}
      dir="rtl"
    >
      <div
        className="flex h-full flex-col border-[6px] bg-white p-3"
        style={{ borderColor: design.primary }}
      >
        <div className="mb-2 flex items-center justify-between">
          <LogoBlock
            src={data.logoDataUrl}
            primary={design.primary}
            accent={design.accent}
          />
          <span className="text-[10px] font-bold tracking-[0.25em]" style={{ color: design.muted }}>
            PASS
          </span>
        </div>
        <Photo
          src={data.photoDataUrl}
          muted={design.muted}
          className="h-40 w-full border border-black/10"
        />
        <div className="mt-3 text-center">
          <PressWord
            word={data.pressWord}
            accent={design.accent}
            primary={design.primary}
            variant="outline"
          />
          <p className="mt-2 text-lg font-black">
            {data.fullName || "ناوی ڕۆژنامەنووس"}
          </p>
          <p className="text-xs" style={{ color: design.muted }}>
            {data.title || "ڕۆژنامەنووس"}
          </p>
        </div>
        <div
          className="mt-auto border-t pt-2 text-center text-[10px]"
          style={{ borderColor: `${design.primary}22`, color: design.muted }}
        >
          {data.organization || "میدیا ئۆفیس"} · {data.badgeId || "—"}
        </div>
      </div>
    </article>
  );
}

function LayoutNeon({
  data,
  design,
  className,
}: {
  data: PressBadgeData;
  design: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(BADGE_SHELL, "rounded-2xl border", className)}
      style={{
        background: design.surface,
        color: design.ink,
        borderColor: `${design.accent}55`,
        boxShadow: `0 0 0 1px ${design.accent}33, 0 20px 50px -24px ${design.accent}`,
      }}
      dir="rtl"
    >
      <div className="px-4 pt-4 text-center">
        <PressWord
          word={data.pressWord}
          accent={design.accent}
          primary={design.primary}
          variant="neon"
        />
        <p
          className="mt-1 text-[10px] tracking-[0.4em]"
          style={{ color: design.secondary || design.muted }}
        >
          ACCESS ALL AREAS
        </p>
      </div>
      <div className="mx-4 mt-3 overflow-hidden rounded-2xl border" style={{ borderColor: `${design.accent}66` }}>
        <Photo
          src={data.photoDataUrl}
          muted={design.muted}
          className="h-40 w-full"
        />
      </div>
      <div className="flex flex-1 flex-col items-center px-4 py-4 text-center">
        <LogoBlock
          src={data.logoDataUrl}
          primary={design.primary}
          accent={design.accent}
          light
        />
        <p className="mt-3 text-lg font-black">
          {data.fullName || "ناوی ڕۆژنامەنووس"}
        </p>
        <p className="text-sm" style={{ color: design.accent }}>
          {data.title || "ڕۆژنامەنووس"}
        </p>
        <p className="mt-auto text-[11px]" style={{ color: design.muted }}>
          {data.organization || "میدیا ئۆفیس"}
          <br />
          <span dir="ltr">{data.badgeId || "—"}</span>
        </p>
      </div>
    </article>
  );
}

function LayoutField({
  data,
  design,
  className,
}: {
  data: PressBadgeData;
  design: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(BADGE_SHELL, "rounded-2xl", className)}
      style={{ background: design.surface, color: design.ink }}
      dir="rtl"
    >
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ background: design.primary }}
      >
        <LogoBlock
          src={data.logoDataUrl}
          primary={design.primary}
          accent={design.accent}
          light
        />
        <div className="text-left" dir="ltr">
          <p className="text-[10px] opacity-80">FIELD</p>
          <p className="text-sm font-black tracking-widest">
            {(data.pressWord || "PRESS").toUpperCase()}
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center px-4 py-4">
        <Photo
          src={data.photoDataUrl}
          muted={design.muted}
          className="h-40 w-full rounded-xl border-2"
        />
        <p className="mt-3 text-center text-xl font-black">
          {data.fullName || "ناوی ڕۆژنامەنووس"}
        </p>
        <p className="text-sm font-semibold" style={{ color: design.secondary || design.primary }}>
          {data.title || "ڕۆژنامەنووس"}
        </p>
        <p className="mt-1 text-xs" style={{ color: design.muted }}>
          {data.organization || "میدیا ئۆفیس"}
        </p>
      </div>
      <div
        className="px-4 py-2.5 text-center text-xs font-black tracking-[0.25em]"
        style={{ background: design.accent, color: design.primary }}
      >
        {data.badgeId ? `#${data.badgeId}` : "AUTHORIZED"}
      </div>
    </article>
  );
}

function LayoutArchive({
  data,
  design,
  className,
}: {
  data: PressBadgeData;
  design: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(BADGE_SHELL, "rounded-md", className)}
      style={{
        background: design.surface,
        color: design.ink,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 27px, ${design.secondary}55 28px)`,
      }}
      dir="rtl"
    >
      <div className="relative flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-start justify-between">
          <LogoBlock
            src={data.logoDataUrl}
            primary={design.primary}
            accent={design.accent}
          />
          <PressWord
            word={data.pressWord}
            accent={design.accent}
            primary={design.primary}
            variant="stamp"
          />
        </div>
        <Photo
          src={data.photoDataUrl}
          muted={design.muted}
          className="mx-auto h-36 w-28 rotate-[-2deg] border border-black/20 shadow-sm"
        />
        <div className="mt-4 text-center">
          <p className="font-serif text-xl font-bold">
            {data.fullName || "ناوی ڕۆژنامەنووس"}
          </p>
          <p className="mt-1 text-sm" style={{ color: design.accent }}>
            {data.title || "ڕۆژنامەنووس"}
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.2em]" style={{ color: design.muted }}>
            {data.organization || "میدیا ئۆفیس"}
          </p>
          <p className="mt-auto pt-4 text-[10px]" style={{ color: design.muted }} dir="ltr">
            ARCHIVE · {data.badgeId || "—"} · {data.issuedAt || "—"}
          </p>
        </div>
      </div>
    </article>
  );
}

function LayoutLens({
  data,
  design,
  className,
}: {
  data: PressBadgeData;
  design: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(BADGE_SHELL, "rounded-[1.5rem]", className)}
      style={{ background: design.surface, color: design.ink }}
      dir="rtl"
    >
      <div
        className="relative flex flex-col items-center px-4 pb-6 pt-5 text-white"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${design.secondary || design.primary}, ${design.primary})`,
        }}
      >
        <LogoBlock
          src={data.logoDataUrl}
          primary={design.primary}
          accent={design.accent}
          light
        />
        <div
          className="mt-4 rounded-full p-1.5"
          style={{ boxShadow: `0 0 0 3px ${design.accent}, 0 0 0 8px ${design.accent}33` }}
        >
          <Photo
            src={data.photoDataUrl}
            muted={design.muted}
            className="h-32 w-32 rounded-full"
          />
        </div>
        <div
          className="mt-4 rounded-full px-4 py-1 text-xs font-black tracking-[0.4em]"
          style={{ background: design.accent, color: design.primary }}
        >
          {(data.pressWord || "PRESS").toUpperCase()}
        </div>
      </div>
      <div className="flex flex-1 flex-col px-4 py-4 text-center">
        <p className="text-xl font-black">
          {data.fullName || "ناوی ڕۆژنامەنووس"}
        </p>
        <p className="mt-1 text-sm" style={{ color: design.secondary || design.primary }}>
          {data.title || "ڕۆژنامەنووس"}
        </p>
        <p className="mt-auto text-xs" style={{ color: design.muted }}>
          {data.organization || "میدیا ئۆفیس"}
          <br />
          <span dir="ltr">{data.badgeId || "—"}</span>
        </p>
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
    <div className="rounded-xl bg-black/[0.03] px-2.5 py-2">
      <p className="text-[9px] opacity-55">{label}</p>
      <p className="truncate text-[11px] font-semibold" dir={dir}>
        {value}
      </p>
    </div>
  );
}
