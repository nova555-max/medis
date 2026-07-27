import { ContractStudio } from "@/components/contracts/contract-studio";
import { type ContractScoreCriterion } from "@/components/contracts/contract-types";
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

async function loadStudioData() {
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const companyRes = ctx?.companyId
    ? await supabase
        .from("companies")
        .select("name, logo_url")
        .eq("id", ctx.companyId)
        .maybeSingle()
    : { data: null };

  const [{ data: employees }, criteriaRes] = await Promise.all([
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
  ]);

  const tablesReady =
    !criteriaRes.error || !isMissingTable(criteriaRes.error.message);

  return {
    organization: companyRes.data?.name || ctx?.companyName || "میدیا ئۆفیس",
    logoUrl: companyRes.data?.logo_url ?? null,
    employees: employees ?? [],
    criteria: (tablesReady
      ? criteriaRes.data ?? []
      : []) as ContractScoreCriterion[],
    tablesReady,
  };
}

export default async function NewContractPage() {
  const data = await loadStudioData();
  return (
    <ContractStudio
      organization={data.organization}
      logoUrl={data.logoUrl}
      employees={data.employees}
      criteria={data.criteria}
      tablesReady={data.tablesReady}
    />
  );
}
