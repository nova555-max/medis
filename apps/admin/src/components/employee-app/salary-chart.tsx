"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { label: string; net: number };

export function SalaryChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-line bg-surface-muted/40 p-8 text-center text-sm text-ink-muted">
        هێشتا مووچە تۆمار نەکراوە
      </div>
    );
  }

  return (
    <div className="h-64 w-full rounded-2xl border border-line bg-surface-elevated p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={50} />
          <Tooltip />
          <Bar dataKey="net" fill="#2a5a8f" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
