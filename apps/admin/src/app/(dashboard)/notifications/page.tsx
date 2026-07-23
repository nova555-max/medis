import { AnnouncementForm } from "@/components/notifications/announcement-form";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{ckb.notifications}</h1>
        <p className="mt-1 text-sm text-ink-muted">ئاگاداری و ڕاگەیاندن بۆ کارمەندان</p>
      </div>

      <AnnouncementForm />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">دوایین ڕاگەیاندنەکان</h2>
        {(announcements ?? []).length === 0 ? (
          <div className="panel p-6 text-sm text-ink-muted">{ckb.noData}</div>
        ) : (
          announcements!.map((a) => (
            <div key={a.id} className="panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{a.title}</p>
                <p className="text-xs text-ink-muted" dir="ltr">
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
              <p className="mt-2 text-sm text-ink-muted">{a.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
