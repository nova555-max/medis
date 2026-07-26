import { PressBadgeStudio } from "@/components/press-badge/press-badge-studio";
import { getAdminContext } from "@/lib/auth/session-context";
import { createClient } from "@/lib/supabase/server";

export default async function PressBadgesPage() {
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const { data: company } = ctx?.companyId
    ? await supabase
        .from("companies")
        .select("name, logo_url")
        .eq("id", ctx.companyId)
        .maybeSingle()
    : { data: null };

  return (
    <PressBadgeStudio
      defaultOrganization={company?.name || ctx?.companyName || "میدیا ئۆفیس"}
      defaultLogoUrl={company?.logo_url ?? null}
    />
  );
}
