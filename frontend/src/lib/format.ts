export function formatCompactPtBR(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  const format = (n: number) =>
    n.toLocaleString("pt-BR", {
      maximumFractionDigits: n >= 10 ? 1 : 2,
      minimumFractionDigits: 0,
    });

  if (abs >= 1_000_000_000) return `${sign}${format(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${format(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${format(abs / 1_000)}m`;
  return value.toLocaleString("pt-BR");
}

export function formatSignedCompactPtBR(value: number): string {
  return `${value >= 0 ? "+" : ""}${formatCompactPtBR(value)}`;
}
