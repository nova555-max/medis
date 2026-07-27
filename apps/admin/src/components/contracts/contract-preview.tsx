"use client";

import {
  getContractDesign,
  type ContractDesignId,
  type ContractScoreLine,
} from "@/components/contracts/contract-types";
import { cn } from "@/lib/cn";

export type ContractPreviewData = {
  designId: ContractDesignId;
  organization: string;
  logoUrl?: string | null;
  contractNumber: string;
  holderName: string;
  profession: string;
  phone: string;
  age: string;
  address: string;
  startDate: string;
  endDate: string;
  salaryNote: string;
  bodyCkb: string;
  scores: ContractScoreLine[];
};

function Field({
  label,
  value,
  muted,
  ink,
}: {
  label: string;
  value: string;
  muted: string;
  ink: string;
}) {
  return (
    <div className="min-w-0">
      <div
        className="text-[9px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: muted }}
      >
        {label}
      </div>
      <div className="mt-0.5 text-[12px] font-semibold" style={{ color: ink }}>
        {value || "—"}
      </div>
    </div>
  );
}

export function ContractPreview({
  data,
  className,
}: {
  data: ContractPreviewData;
  className?: string;
}) {
  const design = getContractDesign(data.designId);
  const totalPoints = data.scores.reduce((s, x) => s + Number(x.points || 0), 0);
  const totalMax = data.scores.reduce(
    (s, x) => s + Number(x.maxPoints || 0),
    0,
  );

  return (
    <article
      className={cn(
        "contract-print-sheet relative mx-auto w-full max-w-[210mm] overflow-hidden border shadow-sm",
        className,
      )}
      style={{
        background: design.paper,
        color: design.ink,
        borderColor: design.rule,
        fontFamily:
          '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif',
      }}
      dir="rtl"
    >
      {/* Header band */}
      <div
        className="flex items-center justify-between gap-3 px-6 py-4"
        style={{
          background:
            data.designId === "media_editorial" ? design.paper : design.ink,
          color:
            data.designId === "media_editorial" ? design.ink : "#ffffff",
          borderBottom:
            data.designId === "media_editorial"
              ? `3px solid ${design.accent}`
              : undefined,
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border bg-white"
            style={{ borderColor: design.rule }}
          >
            {data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.logoUrl}
                alt=""
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <span className="text-[10px] font-bold" style={{ color: design.ink }}>
                LOGO
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold leading-tight">
              {data.organization || "دەزگای میدیا"}
            </p>
            <p className="text-[11px] opacity-80">گرێبەستی کارکردن / Employment Contract</p>
          </div>
        </div>
        <div className="text-left text-[11px]" dir="ltr">
          <div className="font-semibold">
            {data.contractNumber || "CTR-0000"}
          </div>
          <div className="opacity-75">
            {data.startDate || "—"} → {data.endDate || "—"}
          </div>
        </div>
      </div>

      <div className="space-y-5 px-6 py-5">
        <div
          className="inline-block px-3 py-1 text-[11px] font-bold tracking-[0.16em] text-white"
          style={{ background: design.accent }}
        >
          گرێبەستی کارمەند
        </div>

        <section
          className="grid gap-3 border p-4 sm:grid-cols-2"
          style={{ borderColor: design.rule }}
        >
          <Field
            label="ناو"
            value={data.holderName}
            muted={design.muted}
            ink={design.ink}
          />
          <Field
            label="پیشە"
            value={data.profession}
            muted={design.muted}
            ink={design.ink}
          />
          <Field
            label="ژمارەی تەلەفۆن"
            value={data.phone}
            muted={design.muted}
            ink={design.ink}
          />
          <Field
            label="تەمەن"
            value={data.age}
            muted={design.muted}
            ink={design.ink}
          />
          <div className="sm:col-span-2">
            <Field
              label="ناونیشان / ئادی"
              value={data.address}
              muted={design.muted}
              ink={design.ink}
            />
          </div>
          {data.salaryNote ? (
            <div className="sm:col-span-2">
              <Field
                label="تێبینی مووچە"
                value={data.salaryNote}
                muted={design.muted}
                ink={design.ink}
              />
            </div>
          ) : null}
        </section>

        <section>
          <h3
            className="mb-2 border-b pb-1 text-sm font-bold"
            style={{ borderColor: design.accent, color: design.ink }}
          >
            مەرجەکانی گرێبەست
          </h3>
          <div
            className="whitespace-pre-wrap text-[12px] leading-7"
            style={{ color: design.ink }}
          >
            {data.bodyCkb || "—"}
          </div>
        </section>

        {data.scores.length > 0 ? (
          <section>
            <h3
              className="mb-2 border-b pb-1 text-sm font-bold"
              style={{ borderColor: design.accent, color: design.ink }}
            >
              خاڵبەندی هەڵسەنگاندن
            </h3>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr style={{ background: `${design.ink}10` }}>
                  <th
                    className="border px-2 py-1.5 text-right font-semibold"
                    style={{ borderColor: design.rule }}
                  >
                    پێوەر
                  </th>
                  <th
                    className="border px-2 py-1.5 text-center font-semibold"
                    style={{ borderColor: design.rule }}
                  >
                    خاڵ
                  </th>
                  <th
                    className="border px-2 py-1.5 text-center font-semibold"
                    style={{ borderColor: design.rule }}
                  >
                    زۆرینە
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.scores.map((s) => (
                  <tr key={s.criteriaId}>
                    <td
                      className="border px-2 py-1.5"
                      style={{ borderColor: design.rule }}
                    >
                      {s.label}
                    </td>
                    <td
                      className="border px-2 py-1.5 text-center font-semibold tabular-nums"
                      style={{ borderColor: design.rule }}
                      dir="ltr"
                    >
                      {s.points}
                    </td>
                    <td
                      className="border px-2 py-1.5 text-center tabular-nums"
                      style={{ borderColor: design.rule }}
                      dir="ltr"
                    >
                      {s.maxPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: `${design.accent}15` }}>
                  <td
                    className="border px-2 py-1.5 font-bold"
                    style={{ borderColor: design.rule }}
                  >
                    کۆی خاڵ
                  </td>
                  <td
                    className="border px-2 py-1.5 text-center font-bold tabular-nums"
                    style={{ borderColor: design.rule, color: design.accent }}
                    dir="ltr"
                  >
                    {totalPoints}
                  </td>
                  <td
                    className="border px-2 py-1.5 text-center font-bold tabular-nums"
                    style={{ borderColor: design.rule }}
                    dir="ltr"
                  >
                    {totalMax}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        ) : null}

        <section className="grid gap-8 pt-6 sm:grid-cols-2">
          <div>
            <div
              className="mb-8 border-b"
              style={{ borderColor: design.rule }}
            />
            <p className="text-[11px] font-semibold">واژووی دەزگا</p>
          </div>
          <div>
            <div
              className="mb-8 border-b"
              style={{ borderColor: design.rule }}
            />
            <p className="text-[11px] font-semibold">واژووی کارمەند</p>
          </div>
        </section>
      </div>
    </article>
  );
}
