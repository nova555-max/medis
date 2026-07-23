import { ckb } from "@/lib/ckb";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink md:text-3xl">{title}</h1>
      <div className="panel p-6">
        <p className="text-sm text-ink-muted">{ckb.comingSoon}</p>
      </div>
    </div>
  );
}
