import dynamic from "next/dynamic";
import { getAdminContext } from "@/lib/auth/session-context";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

const QrCreateForm = dynamic(
  () =>
    import("@/components/qr/qr-create-form").then((m) => m.QrCreateForm),
  {
    loading: () => (
      <div className="panel h-48 animate-pulse bg-surface-muted p-5" />
    ),
  },
);

export default async function QrPage() {
  const supabase = await createClient();
  const ctx = await getAdminContext();

  const [{ data: company }, { data: tokens }] = await Promise.all([
    ctx?.companyId
      ? supabase
          .from("companies")
          .select("name, logo_url")
          .eq("id", ctx.companyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("qr_tokens")
      .select("id, label, is_active, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const companyName = company?.name || ctx?.companyName || "Media Office";
  const logoUrl = company?.logo_url ?? null;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold md:text-3xl">{ckb.qr}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          بەڕێوەبردنی کۆدی QR بۆ ئامادەبوون
        </p>
      </div>

      <QrCreateForm companyName={companyName} logoUrl={logoUrl} />

      <div className="panel overflow-x-auto print:hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-muted/60">
            <tr>
              <th className="px-4 py-3 text-right">ناو</th>
              <th className="px-4 py-3 text-right">دۆخ</th>
              <th className="px-4 py-3 text-right">بەسەردەچێت</th>
              <th className="px-4 py-3 text-right">دروستکراو</th>
            </tr>
          </thead>
          <tbody>
            {(tokens ?? []).length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-ink-muted"
                >
                  {ckb.noData}
                </td>
              </tr>
            ) : (
              tokens!.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">{t.label}</td>
                  <td className="px-4 py-3">
                    {t.is_active ? "چالاک" : "ناکارا"}
                  </td>
                  <td className="px-4 py-3" dir="ltr">
                    {t.expires_at
                      ? new Date(t.expires_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3" dir="ltr">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
