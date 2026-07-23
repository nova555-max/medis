"use client";

import Link from "next/link";
import { AttendanceChart, type DayPoint } from "@/components/dashboard/attendance-chart";

export function DashboardAttendanceSection({
  weekData,
  monthData,
  range,
}: {
  weekData: DayPoint[];
  monthData: DayPoint[];
  range: "week" | "month";
}) {
  const data = range === "month" ? monthData : weekData;
  const title = range === "month" ? "ئامادەبوونی مانگ" : "ئامادەبوونی ٧ ڕۆژ";

  return (
    <div className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex gap-2 text-sm">
          <Link
            href="/?range=week"
            className={
              range === "week"
                ? "rounded-lg bg-brand-600 px-3 py-1.5 text-white"
                : "rounded-lg border border-line px-3 py-1.5"
            }
          >
            هەفتە
          </Link>
          <Link
            href="/?range=month"
            className={
              range === "month"
                ? "rounded-lg bg-brand-600 px-3 py-1.5 text-white"
                : "rounded-lg border border-line px-3 py-1.5"
            }
          >
            مانگ
          </Link>
        </div>
      </div>
      <AttendanceChart data={data} />
    </div>
  );
}
