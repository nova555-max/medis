import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session-context";
import { ckb } from "@/lib/ckb";
import { getContractDesign } from "@/components/contracts/contract-types";
import { DeleteContractButton } from "@/components/contracts/delete-contract-button";

function isMissingTable(msg?: string) {
  const m = (msg || "").toLowerCase();
  return (
    m.includes("employee_contracts") ||
    m.includes("schema cache") ||
    m.includes("pgrst205") ||
    m.includes("does not exist")
  );
}

export default async function ContractsPage() {
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("employee_contracts")
    .select(
      "id, design_id, contract_number, holder_name, profession, phone, status, updated_at, scores",
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  const tablesReady = !error || !isMissingTable(error.message);
  const list = tablesReady ? rows ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{ckb.contracts}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            گرێبەستی کارمەند · ٤ دیزاین · خاڵبەندی هەمیشەیی · چاپ/PDF
          </p>
        </div>
        <Link
          href="/contracts/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          گرێبەستی نوێ
        </Link>
      </div>

      {!tablesReady ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          خشتەی گرێبەست لە داتابەیس نییە. فایلەکەی{" "}
          <code dir="ltr">FIX_employee_contracts.sql</code> لە Supabase SQL
          Editor جێبەجێ بکە
          {ctx?.companyName ? ` (${ctx.companyName})` : ""}.
        </div>
      ) : null}

      {list.length === 0 ? (
        <div className="panel p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-ink-muted" />
          <p className="mt-3 text-sm text-ink-muted">{ckb.noData}</p>
          <Link
            href="/contracts/new"
            className="mt-4 inline-flex text-sm font-medium text-brand-700 hover:underline"
          >
            یەکەم گرێبەست دروست بکە →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((r) => {
            const design = getContractDesign(String(r.design_id));
            const scores = Array.isArray(r.scores) ? r.scores : [];
            return (
              <div key={r.id} className="panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.holder_name}</p>
                    <p className="text-sm text-ink-muted">
                      {r.profession || "—"} · {design.nameKu}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted" dir="ltr">
                      {r.contract_number || r.id.slice(0, 8)} ·{" "}
                      {new Date(r.updated_at).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      خاڵبەندی: {scores.length} پێوەر
                    </p>
                  </div>
                  <span className="rounded-md bg-surface-muted px-2 py-1 text-[10px]">
                    {r.status === "active"
                      ? "چالاک"
                      : r.status === "ended"
                        ? "کۆتایی"
                        : r.status === "cancelled"
                          ? "هەڵوەشاوە"
                          : "ڕەشنووس"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/contracts/${r.id}`}
                    className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-medium text-white"
                  >
                    دەستکاری / چاپ
                  </Link>
                  <a
                    href={`/api/contracts/${r.id}/pdf`}
                    className="rounded-xl border border-line bg-surface-elevated px-3 py-2 text-xs font-medium"
                  >
                    PDF
                  </a>
                  <DeleteContractButton id={r.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
