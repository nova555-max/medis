"use client";

import {
  resolvePressBadgeColors,
  type PressBadgeData,
  type PressBadgeDesign,
} from "@/components/press-badge/press-badge-designs";
import { cn } from "@/lib/cn";

function Field({
  label,
  value,
  muted,
  text,
}: {
  label: string;
  value: string;
  muted: string;
  text: string;
}) {
  return (
    <div className="min-w-0">
      <div
        className="text-[6px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: muted }}
      >
        {label}
      </div>
      <div
        className="truncate text-[9px] font-semibold leading-tight"
        style={{ color: text }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function PressMark({
  bg,
  fg,
  size = "sm",
}: {
  bg: string;
  fg: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "shrink-0 font-bold tracking-[0.18em]",
        size === "sm" ? "px-1.5 py-0.5 text-[7px]" : "px-2 py-1 text-[9px]",
      )}
      style={{ background: bg, color: fg }}
    >
      PRESS
    </div>
  );
}

function LogoBox({
  src,
  ink,
  size = "sm",
}: {
  src: string | null;
  ink: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border bg-white",
        size === "sm" ? "h-7 w-7" : "h-9 w-9",
      )}
      style={{ borderColor: ink }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-contain p-0.5" />
      ) : (
        <span className="text-[6px] font-semibold" style={{ color: ink }}>
          LOGO
        </span>
      )}
    </div>
  );
}

function PhotoBox({
  src,
  rule,
  className,
}: {
  src: string | null;
  rule: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden border bg-[#e5e7eb]",
        className,
      )}
      style={{ borderColor: rule }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[7px] font-medium text-slate-500">
          PHOTO
        </div>
      )}
    </div>
  );
}

function MicroStrip({ text, muted }: { text: string; muted: string }) {
  return (
    <div
      className="overflow-hidden whitespace-nowrap text-[4.5px] tracking-[0.2em]"
      style={{ color: muted }}
    >
      {text} · {text} · {text}
    </div>
  );
}

function ClassicFront({
  design,
  data,
}: {
  design: PressBadgeDesign;
  data: PressBadgeData;
}) {
  const org = data.organization || "Media Organization";
  return (
    <div className="flex h-full flex-col" style={{ background: design.paper }}>
      <div
        className="flex items-center gap-2 px-2.5 py-2"
        style={{ background: design.ink }}
      >
        <LogoBox src={data.logoDataUrl} ink="#ffffff" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[8px] font-bold leading-tight text-white">
            {org}
          </div>
          <div className="text-[5.5px] uppercase tracking-[0.16em] text-white/75">
            Press identification card
          </div>
        </div>
        <PressMark bg={design.pressMark} fg={design.pressMarkText} />
      </div>

      <div className="flex flex-1 gap-2.5 p-2.5">
        <PhotoBox
          src={data.photoDataUrl}
          rule={design.rule}
          className="h-[4.6rem] w-[3.4rem] shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
          <Field
            label="Full name"
            value={data.holderName || "Holder name"}
            muted={design.muted}
            text={design.text}
          />
          <Field
            label="Title / function"
            value={data.title}
            muted={design.muted}
            text={design.text}
          />
          <Field
            label="Media outlet"
            value={data.mediaOutlet || org}
            muted={design.muted}
            text={design.text}
          />
          <div className="grid grid-cols-2 gap-1.5">
            <Field
              label="Valid from"
              value={data.validFrom || "—"}
              muted={design.muted}
              text={design.text}
            />
            <Field
              label="Valid to"
              value={data.validTo || "—"}
              muted={design.muted}
              text={design.text}
            />
          </div>
          <Field
            label="Card no."
            value={data.badgeId || "PR-000000"}
            muted={design.muted}
            text={design.text}
          />
        </div>
      </div>

      <div
        className="border-t px-2.5 py-1.5"
        style={{ borderColor: design.rule }}
      >
        <div
          className="text-[7px] font-medium leading-snug"
          style={{ color: design.text }}
        >
          {data.frontNote || "Accredited working journalist"}
        </div>
        <MicroStrip
          text={`${org} · PRESS CREDENTIAL · ${data.badgeId || "ID"}`}
          muted={design.muted}
        />
      </div>
    </div>
  );
}

function AgencyFront({
  design,
  data,
}: {
  design: PressBadgeDesign;
  data: PressBadgeData;
}) {
  const org = data.organization || "Media Organization";
  return (
    <div
      className="flex h-full flex-col border"
      style={{ background: design.paper, borderColor: design.ink }}
    >
      <div className="flex items-start justify-between gap-2 px-2.5 pt-2.5">
        <div className="min-w-0">
          <div
            className="text-[5.5px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: design.muted }}
          >
            Staff identification
          </div>
          <div
            className="truncate text-[10px] font-bold leading-tight"
            style={{ color: design.ink }}
          >
            {org}
          </div>
        </div>
        <LogoBox src={data.logoDataUrl} ink={design.ink} size="md" />
      </div>

      <div className="mx-2.5 mt-2 h-px" style={{ background: design.ink }} />

      <div className="flex flex-1 flex-col items-center px-2.5 pt-3">
        <PhotoBox
          src={data.photoDataUrl}
          rule={design.rule}
          className="h-[5.2rem] w-[4rem]"
        />
        <div
          className="mt-2 w-full text-center text-[11px] font-bold leading-tight"
          style={{ color: design.text }}
        >
          {data.holderName || "Holder name"}
        </div>
        <div
          className="mt-0.5 text-center text-[8px]"
          style={{ color: design.muted }}
        >
          {data.title || "Journalist"}
        </div>
        <div className="mt-2">
          <PressMark bg={design.pressMark} fg={design.pressMarkText} size="md" />
        </div>
      </div>

      <div
        className="mx-2.5 mb-2.5 grid grid-cols-2 gap-x-2 gap-y-1 border-t pt-2"
        style={{ borderColor: design.rule }}
      >
        <Field
          label="Outlet"
          value={data.mediaOutlet || org}
          muted={design.muted}
          text={design.text}
        />
        <Field
          label="Card no."
          value={data.badgeId || "PR-000000"}
          muted={design.muted}
          text={design.text}
        />
        <Field
          label="Valid from"
          value={data.validFrom || "—"}
          muted={design.muted}
          text={design.text}
        />
        <Field
          label="Valid to"
          value={data.validTo || "—"}
          muted={design.muted}
          text={design.text}
        />
      </div>
    </div>
  );
}

function AccreditationFront({
  design,
  data,
}: {
  design: PressBadgeDesign;
  data: PressBadgeData;
}) {
  const org = data.organization || "Media Organization";
  return (
    <div className="flex h-full flex-col" style={{ background: design.paper }}>
      <div
        className="px-2.5 py-1.5 text-center text-[6px] font-bold uppercase tracking-[0.28em] text-white"
        style={{ background: design.ink }}
      >
        Media accreditation
      </div>
      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <LogoBox src={data.logoDataUrl} ink={design.ink} />
        <div className="min-w-0 flex-1 text-center">
          <div
            className="truncate text-[9px] font-bold"
            style={{ color: design.ink }}
          >
            {org}
          </div>
        </div>
        <PressMark bg={design.pressMark} fg={design.pressMarkText} />
      </div>

      <div className="flex flex-1 gap-2 px-2.5 pb-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Field
            label="Name"
            value={data.holderName || "Holder name"}
            muted={design.muted}
            text={design.text}
          />
          <Field
            label="Function"
            value={data.title}
            muted={design.muted}
            text={design.text}
          />
          <Field
            label="Organisation"
            value={data.mediaOutlet || org}
            muted={design.muted}
            text={design.text}
          />
          <Field
            label="Access"
            value="PRESS / MEDIA ZONE"
            muted={design.muted}
            text={design.text}
          />
          <div className="grid grid-cols-2 gap-1">
            <Field
              label="From"
              value={data.validFrom || "—"}
              muted={design.muted}
              text={design.text}
            />
            <Field
              label="To"
              value={data.validTo || "—"}
              muted={design.muted}
              text={design.text}
            />
          </div>
          <Field
            label="Badge ID"
            value={data.badgeId || "PR-000000"}
            muted={design.muted}
            text={design.text}
          />
        </div>
        <PhotoBox
          src={data.photoDataUrl}
          rule={design.rule}
          className="h-[5.8rem] w-[4.2rem] shrink-0"
        />
      </div>

      <div
        className="px-2.5 py-1 text-center text-[6px] font-semibold uppercase tracking-[0.12em] text-white"
        style={{ background: design.pressMark }}
      >
        {data.frontNote || "Working journalist — media access only"}
      </div>
    </div>
  );
}

function GalleryFront({
  design,
  data,
}: {
  design: PressBadgeDesign;
  data: PressBadgeData;
}) {
  const org = data.organization || "Media Organization";
  return (
    <div
      className="flex h-full flex-col border-2"
      style={{ background: design.paper, borderColor: design.ink }}
    >
      <div className="flex items-center gap-2 border-b px-2.5 py-2" style={{ borderColor: design.ink }}>
        <LogoBox src={data.logoDataUrl} ink={design.ink} />
        <div className="min-w-0 flex-1">
          <div
            className="text-[5px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: design.muted }}
          >
            Official press gallery
          </div>
          <div
            className="truncate text-[9px] font-bold"
            style={{ color: design.ink }}
          >
            {org}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-2.5 py-2.5">
        <div className="flex gap-2">
          <PhotoBox
            src={data.photoDataUrl}
            rule={design.rule}
            className="h-[4.8rem] w-[3.5rem] shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div
              className="text-[11px] font-bold leading-tight"
              style={{ color: design.text }}
            >
              {data.holderName || "Holder name"}
            </div>
            <Field
              label="Designation"
              value={data.title}
              muted={design.muted}
              text={design.text}
            />
            <Field
              label="Representing"
              value={data.mediaOutlet || org}
              muted={design.muted}
              text={design.text}
            />
          </div>
        </div>

        <div
          className="mt-3 flex items-center justify-between border px-2 py-1.5"
          style={{ borderColor: design.ink }}
        >
          <PressMark bg={design.pressMark} fg={design.pressMarkText} />
          <div className="text-right">
            <div
              className="text-[5px] uppercase tracking-[0.14em]"
              style={{ color: design.muted }}
            >
              Credential no.
            </div>
            <div
              className="text-[9px] font-bold tabular-nums"
              style={{ color: design.text }}
            >
              {data.badgeId || "PR-000000"}
            </div>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
          <Field
            label="Issued"
            value={data.validFrom || "—"}
            muted={design.muted}
            text={design.text}
          />
          <Field
            label="Expires"
            value={data.validTo || "—"}
            muted={design.muted}
            text={design.text}
          />
        </div>
      </div>
    </div>
  );
}

function CheckpointFront({
  design,
  data,
}: {
  design: PressBadgeDesign;
  data: PressBadgeData;
}) {
  const org = data.organization || "Media Organization";
  return (
    <div className="flex h-full flex-col" style={{ background: design.paper }}>
      <div className="flex" style={{ background: design.ink }}>
        <div className="flex flex-1 items-center gap-2 px-2.5 py-2">
          <LogoBox src={data.logoDataUrl} ink="#ffffff" />
          <div className="min-w-0">
            <div className="truncate text-[8px] font-bold text-white">{org}</div>
            <div className="text-[5px] uppercase tracking-[0.18em] text-white/70">
              Security / media checkpoint
            </div>
          </div>
        </div>
        <div
          className="flex w-8 items-center justify-center text-[8px] font-bold tracking-[0.2em] text-white"
          style={{
            background: design.pressMark,
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
          }}
        >
          PRESS
        </div>
      </div>

      <div className="flex flex-1 gap-2 p-2.5">
        <PhotoBox
          src={data.photoDataUrl}
          rule={design.rule}
          className="h-full max-h-[7.5rem] w-[3.6rem] shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Field
            label="Bearer"
            value={data.holderName || "Holder name"}
            muted={design.muted}
            text={design.text}
          />
          <Field
            label="Role"
            value={data.title}
            muted={design.muted}
            text={design.text}
          />
          <Field
            label="Outlet"
            value={data.mediaOutlet || org}
            muted={design.muted}
            text={design.text}
          />
          <Field
            label="ID"
            value={data.badgeId || "PR-000000"}
            muted={design.muted}
            text={design.text}
          />
          <div className="mt-auto grid grid-cols-2 gap-1 border-t pt-1.5" style={{ borderColor: design.rule }}>
            <Field
              label="From"
              value={data.validFrom || "—"}
              muted={design.muted}
              text={design.text}
            />
            <Field
              label="To"
              value={data.validTo || "—"}
              muted={design.muted}
              text={design.text}
            />
          </div>
        </div>
      </div>

      <div
        className="border-t px-2.5 py-1"
        style={{ borderColor: design.rule, background: "#f8fafc" }}
      >
        <MicroStrip
          text={`MEDIA ACCESS · ${data.badgeId || "ID"} · DO NOT DUPLICATE`}
          muted={design.muted}
        />
      </div>
    </div>
  );
}

function BadgeBack({
  design,
  data,
}: {
  design: PressBadgeDesign;
  data: PressBadgeData;
}) {
  const org = data.organization || "Media Organization";
  return (
    <div
      className="flex h-full flex-col border"
      style={{ background: design.paper, borderColor: design.rule }}
    >
      <div
        className="px-2.5 py-2"
        style={{ background: design.ink }}
      >
        <div className="text-[7px] font-bold uppercase tracking-[0.16em] text-white">
          Conditions of use
        </div>
        <div className="mt-0.5 truncate text-[6px] text-white/75">{org}</div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <p
          className="text-[7px] leading-relaxed"
          style={{ color: design.text }}
        >
          {data.backNote}
        </p>

        <div className="space-y-1.5 border-t pt-2" style={{ borderColor: design.rule }}>
          <Field
            label="Issuing body"
            value={org}
            muted={design.muted}
            text={design.text}
          />
          <Field
            label="Card number"
            value={data.badgeId || "PR-000000"}
            muted={design.muted}
            text={design.text}
          />
          {data.website ? (
            <Field
              label="Verification / website"
              value={data.website}
              muted={design.muted}
              text={design.text}
            />
          ) : null}
          {data.emergencyPhone ? (
            <Field
              label="Contact"
              value={data.emergencyPhone}
              muted={design.muted}
              text={design.text}
            />
          ) : null}
        </div>

        <div className="mt-auto space-y-2">
          <div>
            <div
              className="text-[5.5px] uppercase tracking-[0.14em]"
              style={{ color: design.muted }}
            >
              Authorised signature
            </div>
            <div
              className="mt-4 border-b"
              style={{ borderColor: design.rule }}
            />
          </div>
          <div className="flex items-center justify-between">
            <PressMark bg={design.pressMark} fg={design.pressMarkText} />
            <div
              className="text-[5px] uppercase tracking-[0.12em]"
              style={{ color: design.muted }}
            >
              Return if found
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PressBadgeCard({
  design,
  data,
  side,
  className,
}: {
  design: PressBadgeDesign;
  data: PressBadgeData;
  side: "front" | "back";
  className?: string;
}) {
  const colors = resolvePressBadgeColors(design, data);

  return (
    <div
      className={cn(
        "press-badge-face relative aspect-[54/86] w-full overflow-hidden shadow-sm",
        className,
      )}
      style={{
        background: colors.paper,
        color: colors.text,
        fontFamily:
          '"IBM Plex Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      }}
      dir="ltr"
    >
      {side === "back" ? (
        <BadgeBack design={colors} data={data} />
      ) : colors.layout === "agency_id" ? (
        <AgencyFront design={colors} data={data} />
      ) : colors.layout === "accreditation" ? (
        <AccreditationFront design={colors} data={data} />
      ) : colors.layout === "gallery" ? (
        <GalleryFront design={colors} data={data} />
      ) : colors.layout === "checkpoint" ? (
        <CheckpointFront design={colors} data={data} />
      ) : (
        <ClassicFront design={colors} data={data} />
      )}
    </div>
  );
}
