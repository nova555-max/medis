import { DashboardShell } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let companyName: string | undefined;
  let adminName: string | undefined;
  let role: string | undefined;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, company_id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    adminName = profile?.full_name ?? undefined;
    role = profile?.role ?? undefined;

    if (
      !profile ||
      !profile.is_active ||
      (profile.role !== "admin" && profile.role !== "manager")
    ) {
      redirect("/login?error=admin_only");
    }

    if (profile?.company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", profile.company_id)
        .maybeSingle();
      companyName = company?.name ?? undefined;
    }
  }

  return (
    <DashboardShell companyName={companyName} adminName={adminName} role={role}>
      {children}
    </DashboardShell>
  );
}
