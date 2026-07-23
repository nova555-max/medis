import { createClient } from "@/lib/supabase/server";

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
};

/**
 * Send Expo push notification(s). Never throws — failures are swallowed
 * so the main business action is not blocked.
 */
export async function sendExpoPush(
  messages: PushMessage | PushMessage[],
): Promise<void> {
  try {
    const list = (Array.isArray(messages) ? messages : [messages]).filter(
      (m) => m.to && typeof m.to === "string" && m.to.startsWith("ExponentPushToken"),
    );
    if (list.length === 0) return;

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        list.map((m) => ({
          to: m.to,
          title: m.title,
          body: m.body,
          data: m.data || {},
          sound: m.sound === null ? undefined : m.sound ?? "default",
        })),
      ),
    });
  } catch {
    // ignore push failures
  }
}

/** Look up expo_push_token for a profile user id and send. */
export async function pushToUser(
  userId: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!userId) return;
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("expo_push_token")
      .eq("id", userId)
      .maybeSingle();

    const token = (profile as { expo_push_token?: string | null } | null)
      ?.expo_push_token;
    if (!token) return;

    await sendExpoPush({ to: token, title, body, data });
  } catch {
    // ignore
  }
}
