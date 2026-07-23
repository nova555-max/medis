import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type StaffProfile = {
  full_name: string | null;
  email: string | null;
  company_id: string;
  role: "admin" | "manager" | string;
  is_active: boolean;
};

export type AdminContext = {
  userId: string;
  email: string | undefined;
  profile: StaffProfile;
  companyName: string | undefined;
  companyId: string;
};

/**
 * Request-scoped staff session. Dedupes getUser + profile + company
 * across layout and pages in the same RSC render.
 */
export const getAdminContext = cache(async (): Promise<AdminContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, company_id, role, is_active, companies(name)")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    !profile.is_active ||
    (profile.role !== "admin" && profile.role !== "manager") ||
    !profile.company_id
  ) {
    return null;
  }

  const companyJoin = profile.companies as
    | { name?: string }
    | { name?: string }[]
    | null;
  const companyName = Array.isArray(companyJoin)
    ? companyJoin[0]?.name
    : companyJoin?.name;

  return {
    userId: user.id,
    email: profile.email ?? user.email,
    profile: {
      full_name: profile.full_name,
      email: profile.email,
      company_id: profile.company_id,
      role: profile.role,
      is_active: profile.is_active,
    },
    companyName: companyName ?? undefined,
    companyId: profile.company_id,
  };
});

export type EmployeeContext = {
  userId: string;
  profile: {
    full_name: string | null;
    company_id: string;
    role: string;
    is_active: boolean;
  };
};

export const getEmployeeContext = cache(
  async (): Promise<EmployeeContext | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, company_id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !profile ||
      profile.role !== "employee" ||
      !profile.is_active ||
      !profile.company_id
    ) {
      return null;
    }

    return {
      userId: user.id,
      profile: {
        full_name: profile.full_name,
        company_id: profile.company_id,
        role: profile.role,
        is_active: profile.is_active,
      },
    };
  },
);
