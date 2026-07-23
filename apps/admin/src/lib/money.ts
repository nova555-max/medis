export function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined = "IQD",
) {
  const n = Number(amount || 0);
  const cur = currency === "USD" ? "USD" : "IQD";
  const formatted = n.toLocaleString("en-US", {
    minimumFractionDigits: cur === "USD" ? 2 : 0,
    maximumFractionDigits: cur === "USD" ? 2 : 0,
  });
  return cur === "USD" ? `$${formatted}` : `${formatted} دینار`;
}

export function currencyLabel(currency: string | null | undefined) {
  return currency === "USD" ? "دۆلار ($)" : "دینار (IQD)";
}
