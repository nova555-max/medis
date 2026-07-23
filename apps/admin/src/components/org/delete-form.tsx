"use client";

import { Button } from "@/components/ui/button";

export function DeleteForm({
  label,
  action,
}: {
  label: string;
  action: () => Promise<void>;
}) {
  return (
    <form action={action}>
      <Button type="submit" variant="ghost" className="text-red-600">
        {label}
      </Button>
    </form>
  );
}
