import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { ManagerForm } from "@/components/settings/manager-form";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let company = null;
  let adminEmail = user?.email || "";
  let managers: { id: string; full_name: string; email: string | null }[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.email) adminEmail = profile.email;
    else if (user.email) adminEmail = user.email;

    if (profile?.company_id) {
      const [{ data }, { data: mgrs }] = await Promise.all([
        supabase
          .from("companies")
          .select(
            "name, logo_url, late_fine_enabled, late_fine_amount, late_fine_after_minutes, qr_required, selfie_required, weekly_off_dows, overtime_rate_per_hour, absence_fine_enabled, absence_fine_amount, absence_fine_mode",
          )
          .eq("id", profile.company_id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("company_id", profile.company_id)
          .eq("role", "manager")
          .order("full_name"),
      ]);
      company = data;
      managers = mgrs ?? [];
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{ckb.settings}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          کۆمپانیا، پشوو، غەرامە، کاتی زیادە، و یاریدەدەر
        </p>
      </div>

      {company ? (
        <>
          <CompanySettingsForm
            company={{
              name: company.name,
              logo_url: company.logo_url,
              late_fine_enabled: company.late_fine_enabled ?? false,
              late_fine_amount: Number(company.late_fine_amount || 0),
              late_fine_after_minutes: company.late_fine_after_minutes ?? 15,
              qr_required: company.qr_required ?? false,
              selfie_required: company.selfie_required ?? false,
              weekly_off_dows: (company.weekly_off_dows as number[]) || [5],
              overtime_rate_per_hour: Number(
                company.overtime_rate_per_hour || 0,
              ),
              absence_fine_enabled: company.absence_fine_enabled ?? false,
              absence_fine_amount: Number(company.absence_fine_amount || 0),
              absence_fine_mode:
                company.absence_fine_mode === "daily_wage"
                  ? "daily_wage"
                  : "fixed",
            }}
            adminEmail={adminEmail}
          />
          <ManagerForm />
          {managers.length > 0 ? (
            <div className="panel p-5">
              <h2 className="font-semibold">یاریدەدەرەکان</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {managers.map((m) => (
                  <li key={m.id} className="flex justify-between gap-2">
                    <span>{m.full_name}</span>
                    <span className="text-ink-muted" dir="ltr">
                      {m.email}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <div className="panel p-6 text-sm text-ink-muted">
          نەتوانرا ڕێکخستنەکان ببارگیرێن. پەیوەندی Supabase بپشکنە.
        </div>
      )}
    </div>
  );
}
