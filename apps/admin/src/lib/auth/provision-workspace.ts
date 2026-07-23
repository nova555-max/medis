import { createServiceClient } from "@/lib/supabase/service";
import { MAX_ADMIN_ACCOUNTS } from "@/lib/auth/admin-slots";

/** Creates company + admin profile when RPC cannot run (no session / confirm-email). */
export async function provisionWorkspaceWithServiceRole(input: {
  userId: string;
  companyName: string;
  slug: string;
  fullName: string;
  email: string;
  phone?: string | null;
}): Promise<{ companyId?: string; error?: string }> {
  let service;
  try {
    service = createServiceClient();
  } catch {
    return { error: "SERVICE_ROLE" };
  }

  const { count } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if ((count ?? 0) >= MAX_ADMIN_ACCOUNTS) {
    return { error: "CLOSED" };
  }

  const { data: existing } = await service
    .from("profiles")
    .select("id, company_id")
    .eq("id", input.userId)
    .maybeSingle();
  if (existing?.company_id) {
    return { companyId: existing.company_id as string };
  }

  const { data: company, error: companyError } = await service
    .from("companies")
    .insert({ name: input.companyName, slug: input.slug })
    .select("id")
    .single();
  if (companyError || !company) {
    return { error: companyError?.message || "COMPANY" };
  }

  const { error: profileError } = await service.from("profiles").insert({
    id: input.userId,
    company_id: company.id,
    role: "admin",
    full_name: input.fullName,
    phone: input.phone ?? null,
    email: input.email,
  });
  if (profileError) {
    await service.from("companies").delete().eq("id", company.id);
    return { error: profileError.message };
  }

  await service.from("leave_types").insert([
    {
      company_id: company.id,
      code: "annual",
      name_ckb: "مۆڵەتی ساڵانە",
      is_paid: true,
      annual_allowance_days: 21,
    },
    {
      company_id: company.id,
      code: "sick",
      name_ckb: "مۆڵەتی نەخۆشی",
      is_paid: true,
      annual_allowance_days: 14,
    },
    {
      company_id: company.id,
      code: "unpaid",
      name_ckb: "مۆڵەتی بێ مووچە",
      is_paid: false,
      annual_allowance_days: 0,
    },
  ]);

  await service.from("activity_logs").insert({
    company_id: company.id,
    actor_id: input.userId,
    action: "company.registered",
    entity_type: "company",
    entity_id: company.id,
    metadata: { name: input.companyName },
  });

  return { companyId: company.id as string };
}

export function slugifyCompany(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "")
    .slice(0, 48);
  return `${base || "company"}-${Math.random().toString(36).slice(2, 8)}`;
}
