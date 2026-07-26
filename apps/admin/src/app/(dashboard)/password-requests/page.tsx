import { ResolvePasswordRequestForm } from "@/components/employees/resolve-password-request-form";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/service";
import { ckb } from "@/lib/ckb";
import Link from "next/link";

type PendingRow = {
  id: string;
  employeeId: string;
  requestedAt: string;
  fullName: string;
  employeeCode: string;
  source: "table" | "notification";
};

function isMissingRelationError(message: string | undefined) {
  const m = (message || "").toLowerCase();
  return (
    m.includes("employee_password_reset_requests") ||
    m.includes("schema cache") ||
    m.includes("does not exist") ||
    m.includes("pgrst205") ||
    m.includes("42p01")
  );
}

async function loadPendingRequests(): Promise<{
  rows: PendingRow[];
  warning?: string;
}> {
  const supabase = await createClient();

  const { data: tableRows, error: tableErr } = await supabase
    .from("employee_password_reset_requests")
    .select(
      "id, status, requested_at, employees(full_name, employee_code, id)",
    )
    .eq("status", "pending")
    .order("requested_at", { ascending: false });

  if (!tableErr && (tableRows?.length ?? 0) > 0) {
    return {
      rows: (tableRows ?? []).map((r) => {
        const emp = r.employees as {
          full_name?: string;
          employee_code?: string;
          id?: string;
        } | null;
        return {
          id: r.id,
          employeeId: emp?.id || "",
          requestedAt: r.requested_at,
          fullName: emp?.full_name || "کارمەند",
          employeeCode: emp?.employee_code || "",
          source: "table" as const,
        };
      }),
    };
  }

  // Fallback: pending notifications (works even when requests table is missing)
  let service: ReturnType<typeof createServiceClient> | null = null;
  if (hasServiceRoleKey()) {
    try {
      service = createServiceClient();
    } catch {
      service = null;
    }
  }

  const client = service || supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let notifQuery = client
    .from("notifications")
    .select("id, created_at, data, title, body")
    .eq("type", "employee_password_reset")
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!service && user) {
    notifQuery = notifQuery.eq("user_id", user.id);
  }

  const { data: notifs } = await notifQuery;

  const byEmployee = new Map<string, PendingRow>();
  for (const n of notifs ?? []) {
    const data = (n.data || {}) as Record<string, unknown>;
    if (data.status && data.status !== "pending") continue;
    const employeeId = String(data.employeeId || "");
    if (!employeeId || byEmployee.has(employeeId)) continue;
    byEmployee.set(employeeId, {
      id: String(data.requestId || n.id),
      employeeId,
      requestedAt: n.created_at,
      fullName: String(data.employeeCode || "کارمەند"),
      employeeCode: String(data.employeeCode || ""),
      source: "notification",
    });
  }

  // Enrich names from employees table
  const ids = Array.from(byEmployee.keys());
  if (ids.length > 0) {
    const { data: emps } = await client
      .from("employees")
      .select("id, full_name, employee_code")
      .in("id", ids);
    for (const e of emps ?? []) {
      const row = byEmployee.get(e.id);
      if (!row) continue;
      row.fullName = e.full_name || row.fullName;
      row.employeeCode = e.employee_code || row.employeeCode;
    }
  }

  const warning =
    tableErr && isMissingRelationError(tableErr.message)
      ? "خشتەی داواکاری وشەی نهێنی لە داتابەیس نییە — ئێستا لە ئاگادارییەکان نیشان دەدرێت. تکایە فایلەکەی FIX_employee_password_reset_requests.sql لە Supabase SQL Editor جێبەجێ بکە."
      : undefined;

  return { rows: Array.from(byEmployee.values()), warning };
}

export default async function PasswordRequestsPage() {
  const { rows, warning } = await loadPendingRequests();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">داواکاری وشەی نهێنی</h1>
        <p className="mt-1 text-sm text-ink-muted">
          کارمەند داوای گۆڕینی وشەی نهێنی دەکات — تۆ وشەی نوێی دادەنێیت و پێی دەڵێیت
        </p>
      </div>

      {warning ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {warning}
        </div>
      ) : null}

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-ink-muted">
            {ckb.noData}
          </div>
        ) : (
          rows.map((r) => {
            const label = `${r.fullName} · ${r.employeeCode}`;
            return (
              <div key={`${r.source}-${r.id}-${r.employeeId}`} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{label}</p>
                    <p className="text-xs text-ink-muted" dir="ltr">
                      {new Date(r.requestedAt).toLocaleString()}
                      {r.source === "notification" ? " · لە ئاگاداری" : ""}
                    </p>
                  </div>
                  {r.employeeId ? (
                    <Link
                      href={`/employees/${r.employeeId}`}
                      className="text-sm text-brand-600 hover:underline"
                    >
                      پرۆفایل
                    </Link>
                  ) : null}
                </div>
                <ResolvePasswordRequestForm
                  requestId={r.source === "table" ? r.id : ""}
                  employeeId={r.employeeId}
                  employeeLabel={label}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
