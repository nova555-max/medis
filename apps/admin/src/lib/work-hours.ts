/** Normalize "9:00", "09:00:00", Arabic digits → "HH:MM" (24h). */
export function normalizeTime24h(raw: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  const m = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function timeLabel24(start: string, end: string) {
  return `${start}–${end}`;
}

/** Find or create a company shift for these exact hours (used for per-employee times). */
export async function ensureShiftForHours(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  companyId: string,
  startRaw: string,
  endRaw: string,
  graceMinutes = 15,
): Promise<{ id: string; start: string; end: string } | { error: string }> {
  const start = normalizeTime24h(startRaw);
  const end = normalizeTime24h(endRaw);
  if (!start || !end) {
    return {
      error:
        "کاتی دەستپێک و کۆتایی بە شێوەی ٢٤ کاتژمێری بنووسە (بۆ نموونە 09:00).",
    };
  }

  const { data: existing } = await supabase
    .from("shifts")
    .select("id, start_time, end_time")
    .eq("company_id", companyId);

  const match = ((existing || []) as {
    id: string;
    start_time: string;
    end_time: string;
  }[]).find((s) => {
    const sStart = normalizeTime24h(String(s.start_time));
    const sEnd = normalizeTime24h(String(s.end_time));
    return sStart === start && sEnd === end;
  });
  if (match) return { id: match.id, start, end };

  const { data, error } = await supabase
    .from("shifts")
    .insert({
      company_id: companyId,
      name: timeLabel24(start, end),
      start_time: start,
      end_time: end,
      late_grace_minutes: graceMinutes,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return { error: "پاشەکەوتکردنی کاتی دەوام سەرنەکەوت." };
  }
  return { id: data.id as string, start, end };
}
