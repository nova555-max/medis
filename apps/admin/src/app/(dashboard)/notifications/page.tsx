import Link from "next/link";
import { AnnouncementForm } from "@/components/notifications/announcement-form";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";
import { cn } from "@/lib/cn";

function typeLabel(type: string) {
  switch (type) {
    case "salary":
      return "مووچە";
    case "reward":
    case "fine":
      return "پاداشت/غەرامە";
    case "leave":
      return "مۆڵەت";
    case "employee_password_reset":
      return "وشەی نهێنی";
    case "device":
    case "employee_device":
      return "مۆبایل";
    default:
      return "گشتی";
  }
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: announcements }, { data: inbox }] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    user
      ? supabase
          .from("notifications")
          .select("id, title, body, type, is_read, created_at, data")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const unreadIds = (inbox ?? [])
    .filter((n) => !n.is_read)
    .map((n) => n.id);

  if (unreadIds.length > 0) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{ckb.notifications}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          سندوقی ئاگاداری + ناردنی ڕاگەیاندن بۆ کارمەندان
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">سندوقی من</h2>
          {unreadIds.length > 0 ? (
            <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
              {unreadIds.length} نوێ
            </span>
          ) : null}
        </div>
        {(inbox ?? []).length === 0 ? (
          <div className="panel p-6 text-sm text-ink-muted">{ckb.noData}</div>
        ) : (
          <div className="space-y-3">
            {(inbox ?? []).map((n) => {
              const data = (n.data || {}) as Record<string, unknown>;
              const employeeId = data.employeeId
                ? String(data.employeeId)
                : null;
              const wasUnread = unreadIds.includes(n.id);
              return (
                <div
                  key={n.id}
                  className={cn(
                    "panel p-4",
                    wasUnread && "border-brand-400 ring-1 ring-brand-600/20",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{n.title}</p>
                        {wasUnread ? (
                          <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            نوێ
                          </span>
                        ) : null}
                        <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px]">
                          {typeLabel(n.type)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink-muted">{n.body}</p>
                    </div>
                    <p className="text-xs text-ink-muted" dir="ltr">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {employeeId ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/employees/${employeeId}`}
                        className="text-sm font-medium text-brand-700 hover:underline"
                      >
                        پرۆفایلی کارمەند →
                      </Link>
                      {n.type === "employee_password_reset" ? (
                        <Link
                          href="/password-requests"
                          className="text-sm font-medium text-brand-700 hover:underline"
                        >
                          داواکاری وشەی نهێنی →
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

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
