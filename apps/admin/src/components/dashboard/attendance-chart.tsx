"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DayPoint = {
  label: string;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
};

export function AttendanceChart({ data }: { data: DayPoint[] }) {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-line bg-surface-muted/40 p-8 text-center text-sm text-ink-muted">
        داتای ئامادەبوون بۆ ئەم ماوەیە نییە
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Legend />
          <Bar dataKey="present" name="ئامادە" stackId="a" fill="#2a5a8f" radius={[0, 0, 0, 0]} />
          <Bar dataKey="late" name="دواکەوتن" stackId="a" fill="#c47a2c" />
          <Bar dataKey="onLeave" name="مۆڵەت" stackId="a" fill="#5b8f6b" />
          <Bar dataKey="absent" name="غائیب" stackId="a" fill="#a34b4b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
