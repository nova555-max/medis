"use client";

import type { PressBadgeData, PressBadgeDesign } from "./press-badge-designs";
import { getPressDesign } from "./press-badge-designs";
import { cn } from "@/lib/cn";

/** Standard hanging press pass proportions (~ISO ID tall) */
const SHELL =
  "press-badge relative flex aspect-[54/86] w-full max-w-[260px] flex-col overflow-hidden border border-black/15 bg-white shadow-[0_12px_28px_-14px_rgba(0,0,0,0.4)]";

function useTheme(data: PressBadgeData): PressBadgeDesign {
  const base = getPressDesign(data.designId);
  return {
    ...base,
    primary: data.primaryOverride || base.primary,
    accent: data.accentOverride || base.accent,
  };
}

function Logo({
  src,
  size = "md",
  onDark,
}: {
  src: string | null;
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
}) {
  const box =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={cn(
          box,
          "shrink-0 rounded object-contain p-0.5",
          onDark ? "bg-white" : "bg-white ring-1 ring-black/10",
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        box,
        "flex shrink-0 items-center justify-center rounded text-xs font-bold",
        onDark ? "bg-white/95 text-black" : "bg-neutral-200 text-neutral-700",
      )}
    >
      LOGO
    </div>
  );
}

function Face({
  src,
  className,
}: {
  src: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden bg-neutral-200 ring-1 ring-black/15",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[9px] text-neutral-500">
          <span className="text-lg opacity-40">▣</span>
          PHOTO
        </div>
      )}
    </div>
  );
}

/** Bold institutional PRESS bar — standard on real passes */
function PressBar({
  word,
  bg,
  fg,
  className,
}: {
  word: string;
  bg: string;
  fg: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center px-2 py-1.5 text-center text-[1.05rem] font-black tracking-[0.42em]",
        className,
      )}
      style={{ background: bg, color: fg }}
      dir="ltr"
    >
      {(word || "PRESS").toUpperCase()}
    </div>
  );
}

function MetaRow({
  left,
  right,
  muted,
}: {
  left: string;
  right: string;
  muted: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 text-[9px] font-medium"
      style={{ color: muted }}
    >
      <span dir="ltr">{left}</span>
      <span dir="ltr">{right}</span>
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
  const d = useTheme(data);
  if (side === "back") {
    return <StandardBack data={data} d={d} className={className} />;
  }
  switch (d.layout) {
    case "broadcast":
      return <BroadcastFront data={data} d={d} className={className} />;
    case "ifj":
      return <IfjFront data={data} d={d} className={className} />;
    case "event":
      return <EventFront data={data} d={d} className={className} />;
    case "photo":
      return <PhotoFront data={data} d={d} className={className} />;
    case "foreign":
      return <ForeignFront data={data} d={d} className={className} />;
    case "security":
      return <SecurityFront data={data} d={d} className={className} />;
    case "editorial":
      return <EditorialFront data={data} d={d} className={className} />;
    case "field":
      return <FieldFront data={data} d={d} className={className} />;
    case "network":
      return <NetworkFront data={data} d={d} className={className} />;
    case "wire":
    default:
      return <WireFront data={data} d={d} className={className} />;
  }
}

/** Shared reverse — accreditation terms (standard on press cards) */
function StandardBack({
  data,
  d,
  className,
}: {
  data: PressBadgeData;
  d: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(SHELL, "rounded-md", className)}
      style={{ background: d.surface, color: d.ink }}
      dir="rtl"
    >
      <div
        className="flex items-center gap-2 px-3 py-2.5 text-white"
        style={{ background: d.primary }}
      >
        <Logo src={data.logoDataUrl} size="sm" onDark />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold">
            {data.organization || "Media Organization"}
          </p>
          <p className="text-[9px] opacity-80">Press Credential · Reverse</p>
        </div>
      </div>
      <PressBar word={data.pressWord} bg={d.accent} fg={d.primary === d.accent ? "#fff" : contrastText(d.accent)} />
      <div className="flex flex-1 flex-col gap-2 px-3 py-3 text-[10px]">
        <p className="font-bold">زانیاری پەیوەندی / Contact</p>
        <div className="space-y-1.5 rounded border border-black/10 bg-black/[0.02] p-2">
          <Line label="ID" value={data.badgeId || "—"} />
          <Line label="Issued" value={data.issuedAt || "—"} />
          <Line label="Expires" value={data.expiresAt || "—"} />
          <Line label="Phone" value={data.phone || "—"} />
          <Line label="Email" value={data.email || "—"} />
          <Line label="Blood" value={data.bloodType || "—"} />
        </div>
        <div
          className="mt-auto rounded border border-black/10 p-2 text-[9px] leading-relaxed"
          style={{ color: d.muted }}
        >
          {data.notes ||
            "Bearer is an accredited journalist. Present with government photo ID upon request."}
        </div>
        <p className="text-center text-[8px] uppercase tracking-wider" style={{ color: d.muted }}>
          Not transferable · Property of issuer
        </p>
      </div>
    </article>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2" dir="ltr">
      <span className="text-neutral-500">{label}</span>
      <span className="max-w-[60%] truncate font-semibold text-end">{value}</span>
    </div>
  );
}

function contrastText(bg: string) {
  const hex = bg.replace("#", "");
  if (hex.length < 6) return "#111";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#111111" : "#FFFFFF";
}

/** AP/Reuters-like: white body, black header, red PRESS */
function WireFront({
  data,
  d,
  className,
}: {
  data: PressBadgeData;
  d: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article className={cn(SHELL, "rounded-md", className)} dir="rtl">
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 text-white"
        style={{ background: d.primary }}
      >
        <Logo src={data.logoDataUrl} size="sm" onDark />
        <p className="truncate text-[10px] font-semibold tracking-wide">
          {data.organization || "NEWS AGENCY"}
        </p>
      </div>
      <PressBar word={data.pressWord} bg={d.accent} fg="#FFFFFF" />
      <div className="flex flex-1 flex-col items-center px-3 py-3">
        <Face src={data.photoDataUrl} className="h-[7.5rem] w-[5.75rem]" />
        <p className="mt-3 text-center text-[1.05rem] font-bold leading-tight">
          {data.fullName || "FULL NAME"}
        </p>
        <p className="mt-1 text-center text-[11px] font-medium" style={{ color: d.muted }}>
          {data.title || "Correspondent"}
        </p>
        <div className="mt-auto w-full space-y-1 border-t border-black/10 pt-2">
          <MetaRow
            left={`ID ${data.badgeId || "—"}`}
            right={data.issuedAt || "—"}
            muted={d.muted}
          />
          {data.expiresAt ? (
            <p className="text-center text-[9px]" style={{ color: d.muted }} dir="ltr">
              Valid until {data.expiresAt}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** TV/radio network: blue header, orange accent, clear hierarchy */
function BroadcastFront({
  data,
  d,
  className,
}: {
  data: PressBadgeData;
  d: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article className={cn(SHELL, "rounded-md", className)} dir="rtl">
      <div className="px-3 py-2.5 text-white" style={{ background: d.primary }}>
        <div className="flex items-center gap-2">
          <Logo src={data.logoDataUrl} size="md" onDark />
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-80">
              Broadcast Media
            </p>
            <p className="truncate text-sm font-bold">
              {data.organization || "NETWORK"}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-1 gap-2.5 px-3 py-3">
        <Face src={data.photoDataUrl} className="h-[8.2rem] w-[5.5rem] shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <PressBar
            word={data.pressWord}
            bg={d.accent}
            fg="#FFFFFF"
            className="rounded-sm tracking-[0.28em] text-[0.85rem]"
          />
          <p className="mt-2 text-[15px] font-bold leading-snug">
            {data.fullName || "FULL NAME"}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: d.muted }}>
            {data.title || "Reporter / Camera"}
          </p>
          <div className="mt-auto space-y-0.5 text-[9px]" style={{ color: d.muted }}>
            <p dir="ltr">No. {data.badgeId || "—"}</p>
            <p dir="ltr">
              {data.issuedAt || "—"}
              {data.expiresAt ? ` – ${data.expiresAt}` : ""}
            </p>
          </div>
        </div>
      </div>
      <div
        className="px-3 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-white"
        style={{ background: d.secondary || d.primary }}
      >
        Accredited Journalist
      </div>
    </article>
  );
}

/** IFJ / international press card inspired: blue + gold band */
function IfjFront({
  data,
  d,
  className,
}: {
  data: PressBadgeData;
  d: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article className={cn(SHELL, "rounded-sm", className)} dir="rtl">
      <div
        className="h-2 w-full"
        style={{ background: `linear-gradient(90deg, ${d.primary}, ${d.accent}, ${d.primary})` }}
      />
      <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2">
        <Logo src={data.logoDataUrl} size="md" />
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: d.primary }}>
            International Press Card
          </p>
          <p className="truncate text-[11px] font-bold">
            {data.organization || "Media Organization"}
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center px-3 py-3">
        <Face
          src={data.photoDataUrl}
          className="h-[7.2rem] w-[5.6rem] rounded-sm"
        />
        <PressBar
          word={data.pressWord}
          bg={d.primary}
          fg="#FFFFFF"
          className="mt-3 w-full text-[0.95rem]"
        />
        <p className="mt-2 text-center text-[1.05rem] font-bold">
          {data.fullName || "FULL NAME"}
        </p>
        <p className="text-[11px]" style={{ color: d.muted }}>
          {data.title || "Journalist"}
        </p>
        <p className="mt-auto pt-2 text-[9px]" style={{ color: d.muted }} dir="ltr">
          Card No. {data.badgeId || "—"} · Exp. {data.expiresAt || "—"}
        </p>
      </div>
    </article>
  );
}

/** Conference / summit media badge */
function EventFront({
  data,
  d,
  className,
}: {
  data: PressBadgeData;
  d: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article className={cn(SHELL, "rounded-lg", className)} dir="rtl">
      <div className="px-3 py-2 text-center text-white" style={{ background: d.primary }}>
        <p className="text-[9px] uppercase tracking-[0.25em] opacity-90">
          Media Accreditation
        </p>
        <p className="mt-0.5 truncate text-sm font-bold">
          {data.organization || "EVENT MEDIA"}
        </p>
      </div>
      <PressBar word={data.pressWord} bg={d.accent} fg="#FFFFFF" />
      <div className="flex flex-1 flex-col items-center px-3 py-3">
        <div className="mb-2 flex w-full justify-center">
          <Logo src={data.logoDataUrl} size="sm" />
        </div>
        <Face src={data.photoDataUrl} className="h-32 w-32 rounded-md" />
        <p className="mt-3 text-center text-base font-bold leading-tight">
          {data.fullName || "FULL NAME"}
        </p>
        <p className="mt-1 rounded bg-black/5 px-2 py-0.5 text-[10px] font-semibold">
          {data.title || "Media Representative"}
        </p>
        <div className="mt-auto w-full border-t border-dashed border-black/15 pt-2 text-center text-[9px]" style={{ color: d.muted }}>
          <p dir="ltr">Badge {data.badgeId || "—"}</p>
          <p>
            {data.issuedAt || "—"}
            {data.expiresAt ? ` → ${data.expiresAt}` : ""}
          </p>
        </div>
      </div>
    </article>
  );
}

/** Photojournalist: large photo, minimal chrome */
function PhotoFront({
  data,
  d,
  className,
}: {
  data: PressBadgeData;
  d: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(SHELL, "rounded-md", className)}
      style={{ background: d.surface }}
      dir="rtl"
    >
      <div className="relative flex-1">
        <Face src={data.photoDataUrl} className="absolute inset-0 h-full w-full rounded-none ring-0" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-2.5 py-2">
          <Logo src={data.logoDataUrl} size="sm" onDark />
          <span className="text-[9px] font-bold tracking-widest text-white">
            PHOTO
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/60 to-transparent px-3 pb-3 pt-10 text-white">
          <PressBar
            word={data.pressWord}
            bg={d.accent}
            fg="#111111"
            className="mb-2 py-1 text-[0.9rem]"
          />
          <p className="text-[15px] font-bold leading-tight">
            {data.fullName || "FULL NAME"}
          </p>
          <p className="text-[10px] opacity-90">
            {data.title || "Photojournalist"} · {data.organization || "Desk"}
          </p>
          <p className="mt-1 text-[9px] opacity-70" dir="ltr">
            {data.badgeId || "—"}
          </p>
        </div>
      </div>
    </article>
  );
}

/** Foreign correspondent — bilingual formal */
function ForeignFront({
  data,
  d,
  className,
}: {
  data: PressBadgeData;
  d: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(SHELL, "rounded-md", className)}
      style={{ background: d.surface, color: d.ink }}
      dir="rtl"
    >
      <div
        className="flex items-center gap-2 px-3 py-2 text-white"
        style={{ background: d.primary }}
      >
        <Logo src={data.logoDataUrl} size="sm" onDark />
        <div className="min-w-0 flex-1">
          <p className="text-[8px] uppercase tracking-[0.2em] opacity-80">
            Foreign Correspondent
          </p>
          <p className="truncate text-[12px] font-bold">
            {data.organization || "Bureau"}
          </p>
        </div>
      </div>
      <div
        className="h-1.5 w-full"
        style={{ background: d.accent }}
      />
      <div className="flex flex-1 flex-col px-3 py-3">
        <div className="flex gap-2.5">
          <Face src={data.photoDataUrl} className="h-[6.8rem] w-[5.2rem] shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
            <div>
              <p className="text-[13px] font-bold leading-snug">
                {data.fullName || "FULL NAME"}
              </p>
              <p className="mt-1 text-[10px]" style={{ color: d.muted }}>
                {data.title || "Correspondent"}
              </p>
              <p className="mt-1 text-[10px] font-medium">ڕۆژنامەنووس</p>
            </div>
            <p className="text-[9px]" style={{ color: d.muted }} dir="ltr">
              ID {data.badgeId || "—"}
            </p>
          </div>
        </div>
        <PressBar
          word={data.pressWord}
          bg={d.primary}
          fg="#FFFFFF"
          className="mt-3 rounded-sm text-[0.95rem]"
        />
        <p className="mt-auto pt-2 text-center text-[9px]" style={{ color: d.muted }}>
          Issued {data.issuedAt || "—"}
          {data.expiresAt ? ` · Expires ${data.expiresAt}` : ""}
        </p>
      </div>
    </article>
  );
}

/** Venue security media credential */
function SecurityFront({
  data,
  d,
  className,
}: {
  data: PressBadgeData;
  d: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(SHELL, "rounded-sm", className)}
      style={{ background: d.surface, color: d.ink }}
      dir="rtl"
    >
      <div
        className="flex items-center justify-between px-3 py-2 text-white"
        style={{ background: d.primary }}
      >
        <span className="text-[9px] font-bold tracking-[0.15em]">MEDIA ACCESS</span>
        <Logo src={data.logoDataUrl} size="sm" onDark />
      </div>
      <div className="flex flex-1 flex-col px-3 py-3">
        <div className="flex gap-2">
          <Face src={data.photoDataUrl} className="h-28 w-[5.25rem] shrink-0" />
          <div className="flex flex-1 flex-col">
            <PressBar
              word={data.pressWord}
              bg={d.accent}
              fg="#062027"
              className="py-1 text-[0.8rem] tracking-[0.3em]"
            />
            <p className="mt-2 text-[13px] font-bold leading-snug">
              {data.fullName || "FULL NAME"}
            </p>
            <p className="text-[10px]" style={{ color: d.muted }}>
              {data.title || "Media Staff"}
            </p>
            <p className="mt-1 text-[10px] font-semibold">
              {data.organization || "Outlet"}
            </p>
          </div>
        </div>
        <div
          className="mt-3 rounded border border-dashed px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider"
          style={{ borderColor: d.primary, color: d.primary }}
        >
          Present on demand · Not transferable
        </div>
        <div className="mt-auto flex items-end justify-between pt-2 text-[9px]" style={{ color: d.muted }}>
          <span dir="ltr">{data.badgeId || "—"}</span>
          <span dir="ltr">{data.expiresAt || data.issuedAt || "—"}</span>
        </div>
        {/* faux magstripe */}
        <div
          className="mt-2 h-5 w-full rounded-sm opacity-80"
          style={{
            background: `repeating-linear-gradient(90deg, ${d.primary} 0 2px, ${d.secondary || "#455A64"} 2px 4px)`,
          }}
        />
      </div>
    </article>
  );
}

/** Newspaper editorial board card */
function EditorialFront({
  data,
  d,
  className,
}: {
  data: PressBadgeData;
  d: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(SHELL, "rounded-sm", className)}
      style={{ background: d.surface, color: d.ink }}
      dir="rtl"
    >
      <div className="border-b-2 px-3 py-2.5 text-center" style={{ borderColor: d.primary }}>
        <Logo src={data.logoDataUrl} size="md" />
        <p className="mt-1.5 font-serif text-sm font-bold tracking-wide">
          {data.organization || "THE DAILY"}
        </p>
        <p className="text-[8px] uppercase tracking-[0.3em]" style={{ color: d.muted }}>
          Editorial Identification
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center px-3 py-3">
        <Face src={data.photoDataUrl} className="h-[7rem] w-[5.5rem]" />
        <p className="mt-3 font-serif text-[1.1rem] font-bold">
          {data.fullName || "FULL NAME"}
        </p>
        <p className="mt-0.5 text-[11px] italic" style={{ color: d.accent }}>
          {data.title || "Editor / Reporter"}
        </p>
        <PressBar
          word={data.pressWord}
          bg={d.primary}
          fg="#FFFFFF"
          className="mt-3 w-full text-[0.9rem]"
        />
        <p className="mt-auto pt-2 text-[9px]" style={{ color: d.muted }} dir="ltr">
          Staff ID {data.badgeId || "—"} · {data.issuedAt || "—"}
        </p>
      </div>
    </article>
  );
}

/** Field reporter — high-visibility red PRESS */
function FieldFront({
  data,
  d,
  className,
}: {
  data: PressBadgeData;
  d: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article className={cn(SHELL, "rounded-md", className)} dir="rtl">
      <PressBar
        word={data.pressWord}
        bg={d.primary}
        fg={d.accent}
        className="py-2.5 text-[1.35rem] tracking-[0.5em]"
      />
      <div
        className="flex items-center justify-center gap-2 border-b border-black/10 py-1.5"
        style={{ background: d.secondary || "#FFEBEE" }}
      >
        <Logo src={data.logoDataUrl} size="sm" />
        <p className="truncate text-[11px] font-bold">
          {data.organization || "NEWSROOM"}
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center px-3 py-3">
        <Face src={data.photoDataUrl} className="h-[7.5rem] w-[5.75rem]" />
        <p className="mt-3 text-center text-[1.05rem] font-black leading-tight">
          {data.fullName || "FULL NAME"}
        </p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: d.primary }}>
          {data.title || "Field Reporter"}
        </p>
        <div className="mt-auto w-full space-y-1 border-t-2 border-black pt-2 text-[9px] font-medium">
          <MetaRow
            left={`NO. ${data.badgeId || "—"}`}
            right={data.issuedAt || "—"}
            muted={d.muted}
          />
        </div>
      </div>
    </article>
  );
}

/** Corporate media network credential */
function NetworkFront({
  data,
  d,
  className,
}: {
  data: PressBadgeData;
  d: PressBadgeDesign;
  className?: string;
}) {
  return (
    <article
      className={cn(SHELL, "rounded-lg", className)}
      style={{ background: d.surface, color: d.ink }}
      dir="rtl"
    >
      <div
        className="relative overflow-hidden px-3 pb-8 pt-3 text-white"
        style={{
          background: `linear-gradient(160deg, ${d.primary} 0%, ${d.secondary || d.primary} 100%)`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <Logo src={data.logoDataUrl} size="md" onDark />
          <p className="text-[9px] font-semibold tracking-[0.2em] opacity-80">
            CREDENTIAL
          </p>
        </div>
        <p className="mt-2 truncate text-sm font-bold">
          {data.organization || "Media Network"}
        </p>
      </div>
      <div className="relative -mt-6 flex flex-1 flex-col px-3 pb-3">
        <Face
          src={data.photoDataUrl}
          className="mx-auto h-[6.5rem] w-[5.2rem] rounded-md shadow-md ring-2 ring-white"
        />
        <PressBar
          word={data.pressWord}
          bg={d.primary}
          fg={d.accent}
          className="mt-3 rounded-md text-[0.95rem]"
        />
        <p className="mt-2 text-center text-[15px] font-bold">
          {data.fullName || "FULL NAME"}
        </p>
        <p className="text-center text-[11px]" style={{ color: d.muted }}>
          {data.title || "Network Journalist"}
        </p>
        <p className="mt-auto pt-2 text-center text-[9px]" style={{ color: d.muted }} dir="ltr">
          {data.badgeId || "—"} · Exp {data.expiresAt || "—"}
        </p>
      </div>
    </article>
  );
}
