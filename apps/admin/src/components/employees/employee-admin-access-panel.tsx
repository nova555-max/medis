"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  blacklistEmployeeAction,
  removeEmployeeFromSystemAction,
  restoreEmployeeAction,
  setEmployeePasswordAction,
  type ActionResult,
  type PasswordActionResult,
} from "@/lib/actions/employee-admin";
import { archiveEmployeeAction } from "@/lib/actions/org";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const pwdInitial: PasswordActionResult = {};
const actInitial: ActionResult = {};

export function EmployeeAdminAccessPanel({
  employee,
}: {
  employee: {
    id: string;
    full_name: string;
    employee_code: string;
    status: string;
  };
}) {
  const router = useRouter();
  const [pwdState, pwdAction, pwdPending] = useActionState(
    setEmployeePasswordAction,
    pwdInitial,
  );
  const [blacklistState, blacklistAction, blacklistPending] = useActionState(
    blacklistEmployeeAction,
    actInitial,
  );
  const [restoreState, restoreAction, restorePending] = useActionState(
    restoreEmployeeAction,
    actInitial,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeEmployeeFromSystemAction,
    actInitial,
  );
  const [shownPassword, setShownPassword] = useState<string | null>(null);
  const [archiveMsg, setArchiveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (pwdState.password) setShownPassword(pwdState.password);
  }, [pwdState.password]);

  useEffect(() => {
    if (removeState.success) {
      router.push("/employees");
      router.refresh();
    }
  }, [removeState.success, router]);

  const isActive = employee.status === "active";
  const isBlacklisted = employee.status === "blacklisted";
  const isArchived = employee.status === "archived";

  return (
    <div className="space-y-4">
      <div className="panel space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">وشەی نهێنی و چوونەژوورەوە</h2>
          <p className="mt-1 text-sm text-ink-muted">
            وشەی نهێنی کۆن لە سیستەم نەبینرێتەوە (بۆ پاراستن). دەتوانیت وشەی نهێنی
            نوێ دابنێیت و ئێرە بیبینیت و بیدەیت بە کارمەند.
          </p>
          <p className="mt-2 text-sm">
            ئایدی چوونەژوورەوە:{" "}
            <span className="font-semibold" dir="ltr">
              {employee.employee_code}
            </span>
          </p>
        </div>

        {shownPassword ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="font-medium text-emerald-800 dark:text-emerald-200">
              وشەی نهێنی نوێ (تەنها ئێستا پیشان دەدرێت):
            </p>
            <p className="mt-2 text-xl font-bold tracking-wider" dir="ltr">
              {shownPassword}
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => {
                void navigator.clipboard?.writeText(shownPassword);
              }}
            >
              کۆپیکردن
            </Button>
          </div>
        ) : null}

        {pwdState.error ? (
          <p className="text-sm text-red-600">{pwdState.error}</p>
        ) : null}
        {pwdState.success && !pwdState.password ? (
          <p className="text-sm text-emerald-700">{pwdState.success}</p>
        ) : null}

        <form action={pwdAction} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <input type="hidden" name="employeeId" value={employee.id} />
          <div>
            <Label htmlFor="empPassword">وشەی نهێنی نوێ (ئارەزوومەندانە)</Label>
            <Input
              id="empPassword"
              name="password"
              dir="ltr"
              placeholder="بەتاڵ = خۆکار دروست دەبێت"
              minLength={8}
              maxLength={32}
              pattern="[A-Za-z0-9]*"
              disabled={isBlacklisted}
            />
          </div>
          <Button type="submit" disabled={pwdPending || isBlacklisted}>
            {pwdPending ? "..." : "دانان / پیشاندانی وشەی نهێنی"}
          </Button>
        </form>
      </div>

      <div className="panel space-y-4 border-red-200/80 p-5 dark:border-red-900/50">
        <div>
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">
            دۆخ و دەرکردن
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            دۆخی ئێستا:{" "}
            <span className="font-medium text-ink">
              {isActive
                ? "چالاک"
                : isBlacklisted
                  ? "ڕەشکراو"
                  : isArchived
                    ? "ئەرشیفکراو"
                    : employee.status}
            </span>
          </p>
        </div>

        {blacklistState.error || restoreState.error || removeState.error || archiveMsg ? (
          <p className="text-sm text-red-600">
            {blacklistState.error ||
              restoreState.error ||
              removeState.error ||
              archiveMsg}
          </p>
        ) : null}
        {blacklistState.success || restoreState.success ? (
          <p className="text-sm text-emerald-700">
            {blacklistState.success || restoreState.success}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {isActive ? (
            <>
              <form action={blacklistAction}>
                <input type="hidden" name="employeeId" value={employee.id} />
                <Button
                  type="submit"
                  variant="secondary"
                  className="border-amber-300 text-amber-800"
                  disabled={blacklistPending}
                  onClick={(e) => {
                    if (
                      !confirm(
                        `ڕەشکردنەوەی ${employee.full_name}؟ ناتوانێت بچێتە ژوورەوە.`,
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                >
                  {blacklistPending ? "..." : "ڕەشکردنەوە"}
                </Button>
              </form>
              <Button
                type="button"
                variant="ghost"
                className="text-ink-muted"
                onClick={async () => {
                  if (!confirm(`ئەرشیفکردنی ${employee.full_name}؟`)) return;
                  const res = await archiveEmployeeAction(employee.id);
                  if (res.error) setArchiveMsg(res.error);
                  else {
                    setArchiveMsg(null);
                    router.refresh();
                  }
                }}
              >
                ئەرشیف
              </Button>
            </>
          ) : null}

          {(isBlacklisted || isArchived) && (
            <form action={restoreAction}>
              <input type="hidden" name="employeeId" value={employee.id} />
              <Button type="submit" disabled={restorePending}>
                {restorePending ? "..." : "گەڕاندنەوە بۆ چالاک"}
              </Button>
            </form>
          )}
        </div>

        <form action={removeAction} className="space-y-3 border-t border-line pt-4">
          <input type="hidden" name="employeeId" value={employee.id} />
          <p className="text-sm text-ink-muted">
            دەرکردن لە سیستەم: هەژمار، زانیاری، و مێژووی پەیوەندیدار دەسڕدرێتەوە.
            بۆ دڵنیابوونەوە <span dir="ltr">DELETE</span> بنووسە.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[10rem] flex-1">
              <Label htmlFor="confirmDelete">دڵنیابوونەوە</Label>
              <Input
                id="confirmDelete"
                name="confirm"
                dir="ltr"
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <Button
              type="submit"
              variant="ghost"
              className="text-red-600"
              disabled={removePending}
              onClick={(e) => {
                if (
                  !confirm(
                    `دەرکردنی تەواوی ${employee.full_name} لە سیستەم؟ ئەم کارە ناگەڕێتەوە.`,
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              {removePending ? "..." : "دەرکردن لە سیستەم"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
