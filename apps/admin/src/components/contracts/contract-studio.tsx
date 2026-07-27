"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  saveContractScoreCriterionAction,
  deactivateContractCriterionAction,
  saveEmployeeContractAction,
  type ActionResult,
} from "@/lib/actions/contracts";
import {
  CONTRACT_DESIGNS,
  DEFAULT_CONTRACT_BODY,
  type ContractDesignId,
  type ContractScoreCriterion,
  type ContractScoreLine,
  type EmployeeContractRecord,
} from "@/components/contracts/contract-types";
import { ContractPreview } from "@/components/contracts/contract-preview";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ckb } from "@/lib/ckb";
import { cn } from "@/lib/cn";

const initial: ActionResult = {};

type EmpOpt = { id: string; full_name: string; employee_code: string; phone: string | null };

export function ContractStudio({
  organization,
  logoUrl,
  criteria,
  employees,
  initialContract,
  tablesReady,
}: {
  organization: string;
  logoUrl?: string | null;
  criteria: ContractScoreCriterion[];
  employees: EmpOpt[];
  initialContract?: EmployeeContractRecord | null;
  tablesReady: boolean;
}) {
  const [designId, setDesignId] = useState<ContractDesignId>(
    initialContract?.design_id || "classic_legal",
  );
  const [holderName, setHolderName] = useState(initialContract?.holder_name || "");
  const [profession, setProfession] = useState(initialContract?.profession || "");
  const [phone, setPhone] = useState(initialContract?.phone || "");
  const [age, setAge] = useState(
    initialContract?.age != null ? String(initialContract.age) : "",
  );
  const [address, setAddress] = useState(initialContract?.address || "");
  const [contractNumber, setContractNumber] = useState(
    initialContract?.contract_number ||
      `CTR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
  );
  const [startDate, setStartDate] = useState(initialContract?.start_date || "");
  const [endDate, setEndDate] = useState(initialContract?.end_date || "");
  const [salaryNote, setSalaryNote] = useState(initialContract?.salary_note || "");
  const [bodyCkb, setBodyCkb] = useState(
    initialContract?.body_ckb || DEFAULT_CONTRACT_BODY,
  );
  const [employeeId, setEmployeeId] = useState(initialContract?.employee_id || "");
  const [status, setStatus] = useState(initialContract?.status || "draft");
  const [scores, setScores] = useState<ContractScoreLine[]>(() => {
    if (initialContract?.scores?.length) return initialContract.scores;
    return criteria
      .filter((c) => c.is_active)
      .map((c) => ({
        criteriaId: c.id,
        label: c.label,
        points: 0,
        maxPoints: Number(c.max_points),
      }));
  });

  const [saveState, saveAction, savePending] = useActionState(
    saveEmployeeContractAction,
    initial,
  );
  const [critState, critAction, critPending] = useActionState(
    saveContractScoreCriterionAction,
    initial,
  );
  const [deactState, deactAction, deactPending] = useActionState(
    deactivateContractCriterionAction,
    initial,
  );

  const preview = useMemo(
    () => ({
      designId,
      organization,
      logoUrl,
      contractNumber,
      holderName,
      profession,
      phone,
      age,
      address,
      startDate,
      endDate,
      salaryNote,
      bodyCkb,
      scores,
    }),
    [
      designId,
      organization,
      logoUrl,
      contractNumber,
      holderName,
      profession,
      phone,
      age,
      address,
      startDate,
      endDate,
      salaryNote,
      bodyCkb,
      scores,
    ],
  );

  function onPickEmployee(id: string) {
    setEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    setHolderName(emp.full_name || "");
    if (emp.phone) setPhone(emp.phone);
  }

  function syncScoresFromCriteria() {
    setScores((prev) => {
      const map = new Map(prev.map((s) => [s.criteriaId, s]));
      return criteria
        .filter((c) => c.is_active)
        .map((c) => {
          const existing = map.get(c.id);
          return {
            criteriaId: c.id,
            label: c.label,
            points: existing?.points ?? 0,
            maxPoints: Number(c.max_points),
          };
        });
    });
  }

  const pdfHref = initialContract?.id
    ? `/api/contracts/${initialContract.id}/pdf`
    : saveState.id
      ? `/api/contracts/${saveState.id}/pdf`
      : null;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/contracts" className="text-sm text-brand-700">
              ← گەڕانەوە بۆ گرێبەستەکان
            </Link>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              {initialContract ? "دەستکاری گرێبەست" : "گرێبەستی نوێ"}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              ٤ دیزاین · خاڵبەندی هەمیشەیی · چاپ و PDF
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              چاپکردن
            </Button>
            {pdfHref ? (
              <a
                href={pdfHref}
                className="inline-flex items-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white"
              >
                داگرتنی PDF
              </a>
            ) : (
              <span className="rounded-xl border border-line px-4 py-2.5 text-sm text-ink-muted">
                سەرەتا پاشەکەوت بکە بۆ PDF
              </span>
            )}
          </div>
        </div>
        {!tablesReady ? (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            خشتەی داتابەیس ئامادە نییە. فایلەکەی{" "}
            <code dir="ltr">FIX_employee_contracts.sql</code> لە Supabase SQL
            Editor جێبەجێ بکە تا خاڵبەندی دوای نوێبوونەوەی سیستەم نەسڕێتەوە.
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            خاڵبەندیەکان لە داتابەیس پاشەکەوت دەبن — دوای نوێکردنەوەی سیستەم
            نامرن.
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="space-y-5 print:hidden">
          <section className="panel space-y-3 p-4">
            <h2 className="font-semibold">١) دیزاینی گرێبەست</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {CONTRACT_DESIGNS.map((d) => {
                const active = designId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDesignId(d.id)}
                    className={cn(
                      "rounded-xl border p-3 text-right transition",
                      active
                        ? "border-brand-600 ring-2 ring-brand-600/30"
                        : "border-line hover:border-brand-300",
                    )}
                  >
                    <div className="mb-2 flex h-8 overflow-hidden rounded">
                      <div className="w-2/3" style={{ background: d.ink }} />
                      <div className="w-1/3" style={{ background: d.accent }} />
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

          <form action={saveAction} className="panel space-y-4 p-4">
            <input type="hidden" name="id" value={initialContract?.id || saveState.id || ""} />
            <input type="hidden" name="designId" value={designId} />
            <input type="hidden" name="scoresJson" value={JSON.stringify(scores)} />
            <h2 className="font-semibold">٢) زانیاری کارمەند</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>هەڵبژاردنی کارمەند (ئارەزوومەندانە)</Label>
                <select
                  name="employeeId"
                  value={employeeId}
                  onChange={(e) => onPickEmployee(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
                >
                  <option value="">— دەستی بنووسە —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.employee_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="holderName">ناو</Label>
                <Input
                  id="holderName"
                  name="holderName"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="profession">پیشە</Label>
                <Input
                  id="profession"
                  name="profession"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  required
                  placeholder="ڕۆژنامەنووس / وێنەگر / ..."
                />
              </div>
              <div>
                <Label htmlFor="phone">ژمارەی تەلەفۆن</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div>
                <Label htmlFor="age">تەمەن</Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  min={14}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">ناونیشان / ئادی</Label>
                <Input
                  id="address"
                  name="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contractNumber">ژمارەی گرێبەست</Label>
                <Input
                  id="contractNumber"
                  name="contractNumber"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div>
                <Label htmlFor="status">دۆخ</Label>
                <select
                  id="status"
                  name="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm"
                >
                  <option value="draft">ڕەشنووس</option>
                  <option value="active">چالاک</option>
                  <option value="ended">کۆتایی هاتوو</option>
                  <option value="cancelled">هەڵوەشاوە</option>
                </select>
              </div>
              <div>
                <Label htmlFor="startDate">بەرواری دەستپێک</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="endDate">بەرواری کۆتایی</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="salaryNote">تێبینی مووچە</Label>
                <Input
                  id="salaryNote"
                  name="salaryNote"
                  value={salaryNote}
                  onChange={(e) => setSalaryNote(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="bodyCkb">دەقی گرێبەست</Label>
                <textarea
                  id="bodyCkb"
                  name="bodyCkb"
                  rows={8}
                  value={bodyCkb}
                  onChange={(e) => setBodyCkb(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-surface-elevated px-3.5 py-2.5 text-sm leading-7"
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-line pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">٣) خاڵبەندی ئەم گرێبەستە</h3>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={syncScoresFromCriteria}
                >
                  هاودەنگکردن لەگەڵ پێوەرەکان
                </Button>
              </div>
              {scores.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  سەرەتا خاڵبەندی لە خوارەوە زیاد بکە، پاشان هاودەنگ بکە.
                </p>
              ) : (
                <div className="space-y-2">
                  {scores.map((s, idx) => (
                    <div
                      key={s.criteriaId}
                      className="grid grid-cols-[1fr_100px] items-center gap-2 rounded-xl border border-line px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{s.label}</p>
                        <p className="text-[11px] text-ink-muted" dir="ltr">
                          max {s.maxPoints}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={s.maxPoints}
                        step="0.5"
                        value={s.points}
                        onChange={(e) => {
                          const v = Number(e.target.value || 0);
                          setScores((prev) =>
                            prev.map((row, i) =>
                              i === idx
                                ? {
                                    ...row,
                                    points: Math.min(
                                      Math.max(v, 0),
                                      row.maxPoints,
                                    ),
                                  }
                                : row,
                            ),
                          );
                        }}
                        dir="ltr"
                        className="text-left"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {saveState.error ? (
              <p className="text-sm text-red-600">{saveState.error}</p>
            ) : null}
            {saveState.success ? (
              <p className="text-sm text-brand-700">{saveState.success}</p>
            ) : null}
            <Button type="submit" disabled={savePending || !tablesReady}>
              {savePending ? ckb.loading : "پاشەکەوتکردنی گرێبەست"}
            </Button>
          </form>

          <section className="panel space-y-4 p-4">
            <h2 className="font-semibold">٤) خاڵبەندی هەمیشەیی (سیستەم)</h2>
            <p className="text-sm text-ink-muted">
              ئەم پێوەرانە لە داتابەیس دەمێننەوە — دوای نوێبوونەوەی سیستەم
              ناسڕێنەوە.
            </p>
            <form action={critAction} className="grid gap-3 sm:grid-cols-[1fr_100px_auto]">
              <div>
                <Label>ناوی پێوەر</Label>
                <Input name="label" required placeholder="ئامادەبوون / کوالیتی / ..." />
              </div>
              <div>
                <Label>زۆرینە</Label>
                <Input
                  name="maxPoints"
                  type="number"
                  min={1}
                  step="1"
                  defaultValue={10}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={critPending || !tablesReady}>
                  {critPending ? "..." : "زیادکردن"}
                </Button>
              </div>
            </form>
            {critState.error ? (
              <p className="text-sm text-red-600">{critState.error}</p>
            ) : null}
            {critState.success ? (
              <p className="text-sm text-brand-700">{critState.success}</p>
            ) : null}
            {deactState.error ? (
              <p className="text-sm text-red-600">{deactState.error}</p>
            ) : null}

            <div className="space-y-2">
              {criteria.filter((c) => c.is_active).length === 0 ? (
                <p className="text-sm text-ink-muted">هیچ پێوەرێک نییە</p>
              ) : (
                criteria
                  .filter((c) => c.is_active)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{c.label}</p>
                        <p className="text-[11px] text-ink-muted" dir="ltr">
                          max {c.max_points}
                        </p>
                      </div>
                      <form action={deactAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          disabled={deactPending}
                          className="text-xs text-red-600"
                        >
                          ناچالاککردن
                        </Button>
                      </form>
                    </div>
                  ))
              )}
            </div>
          </section>
        </div>

        <div className="xl:sticky xl:top-20 xl:self-start">
          <div className="print:hidden mb-3 text-center text-xs text-ink-muted">
            پێشبینین
          </div>
          <ContractPreview data={preview} />
        </div>
      </div>
    </div>
  );
}
