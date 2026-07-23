import { createClient } from "@/lib/supabase/server";
import type { CompanyBrand } from "@/lib/reports/types";
import { makeReportNumber } from "@/lib/reports/types";

export async function loadCompanyBrand(): Promise<{
  brand: CompanyBrand | null;
  generatedBy: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { brand: null, generatedBy: "", error: "unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.company_id || profile.role !== "admin" || !profile.is_active) {
    return { brand: null, generatedBy: "", error: "forbidden" };
  }

  const { data: company } = await supabase
    .from("companies")
    .select(
      "id, name, address, phone, email, logo_url, report_watermark, stamp_text",
    )
    .eq("id", profile.company_id)
    .maybeSingle();

  if (!company) return { brand: null, generatedBy: "", error: "no_company" };

  return {
    brand: company as CompanyBrand,
    generatedBy: profile.full_name || "Admin",
  };
}

export function buildMeta(
  title: string,
  prefix: string,
  generatedBy: string,
  range?: { from?: string; to?: string },
) {
  const now = new Date();
  return {
    title,
    reportNumber: makeReportNumber(prefix),
    reportDate: now.toISOString().slice(0, 10),
    generatedBy,
    generatedAt: now.toLocaleString("en-GB"),
    from: range?.from,
    to: range?.to,
  };
}
