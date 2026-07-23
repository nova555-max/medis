import { DashboardShell } from "@/components/dashboard/shell";
import { getAdminContext } from "@/lib/auth/session-context";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAdminContext();
  if (!ctx) {
    redirect("/login?error=admin_only");
  }

  return (
    <DashboardShell
      companyName={ctx.companyName}
      adminName={ctx.profile.full_name ?? undefined}
      role={ctx.profile.role}
    >
      {children}
    </DashboardShell>
  );
}
