export type MoneyCurrency = "IQD" | "USD";

export function asMoneyCurrency(
  value: string | null | undefined,
): MoneyCurrency {
  return value === "USD" ? "USD" : "IQD";
}
