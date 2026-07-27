import { notFound } from "next/navigation";
import { ContractStudio } from "@/components/contracts/contract-studio";
import {
  type ContractDesignId,
  type ContractScoreCriterion,
  type ContractScoreLine,
  type EmployeeContractRecord,
} from "@/components/contracts/contract-types";
import { getAdminContext } from "@/lib/auth/session-context";
import { createClient } from "@/lib/supabase/server";

function isMissingTable(msg?: string) {
  const m = (msg || "").toLowerCase();
  return (
    m.includes("employee_contracts") ||
    m.includes("contract_score_criteria") ||
    m.includes("schema cache") ||
    m.includes("pgrst205") ||
    m.includes("does not exist")
  );
}

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const companyRes = ctx?.companyId
    ? await supabase
        .from("companies")
        .select("name, logo_url")
        .eq("id", ctx.companyId)
        .maybeSingle()
    : { data: null };

  const [{ data: employees }, criteriaRes, contractRes] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name, employee_code, phone")
      .eq("status", "active")
      .order("full_name"),
    supabase
      .from("contract_score_criteria")
      .select("id, label, max_points, sort_order, is_active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("employee_contracts").select("*").eq("id", id).maybeSingle(),
  ]);

  if (!contractRes.data) notFound();

  const tablesReady =
    !criteriaRes.error || !isMissingTable(criteriaRes.error.message);

  const data = contractRes.data;
  const scores = Array.isArray(data.scores)
    ? (data.scores as ContractScoreLine[])
    : [];

  const contract: EmployeeContractRecord = {
    id: data.id,
    design_id: data.design_id as ContractDesignId,
    contract_number: data.contract_number,
    holder_name: data.holder_name,
    profession: data.profession,
    phone: data.phone,
    age: data.age,
    address: data.address,
    start_date: data.start_date,
    end_date: data.end_date,
    salary_note: data.salary_note,
    body_ckb: data.body_ckb,
    scores,
    status: data.status,
    employee_id: data.employee_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };

  return (
    <ContractStudio
      organization={companyRes.data?.name || ctx?.companyName || "میدیا ئۆفیس"}
      logoUrl={companyRes.data?.logo_url ?? null}
      employees={employees ?? []}
      criteria={
        (tablesReady
          ? criteriaRes.data ?? []
          : []) as ContractScoreCriterion[]
      }
      tablesReady={tablesReady}
      initialContract={contract}
    />
  );
}
