"use client";

import { ckb } from "@/lib/ckb";
import { Button } from "@/components/ui/button";

export function PrintReportButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      {ckb.print}
    </Button>
  );
}
