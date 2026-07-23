import { WorkplaceMap } from "@/components/employee-app/workplace-map";
import { createClient } from "@/lib/supabase/server";
import { ckb } from "@/lib/ckb";

export default async function EmployeeMapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: emp } = await supabase
    .from("employees")
    .select("gps_enabled, gps_lat, gps_lng, gps_radius_meters, full_name")
    .eq("user_id", user!.id)
    .maybeSingle();

  const hasGps =
    Boolean(emp?.gps_enabled) && emp?.gps_lat != null && emp?.gps_lng != null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-brand-700">کارمەندی ناوخۆ</p>
        <h1 className="text-2xl font-bold">{ckb.workplaceMap}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          شوێنی کارەکەت بە زیندوویی — بۆ چک-ئین دەبێت لەناو بازنەکەدا بیت
        </p>
      </div>

      {hasGps ? (
        <>
          <WorkplaceMap
            enabled
            tall
            lat={emp!.gps_lat}
            lng={emp!.gps_lng}
            radius={emp!.gps_radius_meters ?? 150}
          />

          <div className="panel space-y-3 p-5">
            <h2 className="font-semibold">چۆن کار دەکات؟</h2>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>• خاڵی سەوز = شوێنی کار کە ئەدمین دیاری کردووە</li>
              <li>• خاڵی شین = شوێنی ئێستای تۆ (زیندوو)</li>
              <li>• بازنەکە = ناوچەی ڕێگەپێدراو بۆ چک-ئین</li>
              <li>• ئەگەر لە دەرەوە بیت، چک-ئین ڕەت دەکرێتەوە</li>
            </ul>
            <p className="text-sm">
              <span className="text-ink-muted">کارمەند: </span>
              {emp!.full_name}
            </p>
          </div>
        </>
      ) : (
        <WorkplaceMap enabled={false} lat={null} lng={null} radius={150} />
      )}
    </div>
  );
}
