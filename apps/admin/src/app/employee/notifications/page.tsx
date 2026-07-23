import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

export default async function EmployeeNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("notifications")
    .select("id, title, body, type, is_read, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // mark unread as read
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user!.id)
    .eq("is_read", false);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{ckb.notifications}</h1>
        <p className="text-sm text-ink-muted">
          مووچە، پاداشت، مۆڵەت و ئاگاداری گشتی لەلایەن ئەدمین
        </p>
      </div>

      <div className="space-y-3">
        {(rows ?? []).length === 0 ? (
          <div className="panel p-6 text-center text-sm text-ink-muted">{ckb.noData}</div>
        ) : (
          rows!.map((r) => (
            <div
              key={r.id}
              className={`panel p-4 ${!r.is_read ? "border-brand-400 shadow-soft" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{r.title}</p>
                <span className="rounded-lg bg-surface-muted px-2 py-0.5 text-[10px]">
                  {r.type === "salary"
                    ? "مووچە"
                    : r.type === "reward"
                      ? "پاداشت"
                      : r.type === "leave"
                        ? "مۆڵەت"
                        : "گشتی"}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-muted">{r.body}</p>
              <p className="mt-2 text-xs text-ink-muted" dir="ltr">
                {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
