/**
 * REL-508 — USDT → KRW display. missing/invalid → null. "0" 위조 금지.
 */

export type KrwDisplaySnapshot = {
  usdtKrw: string;
};

export function approxKrwOrNull(
  amountUsdt: unknown,
  snapshot: KrwDisplaySnapshot | null,
  approx: (amountUsdt: string, snapshot: KrwDisplaySnapshot) => string,
): string | null {
  if (!snapshot) return null;
  if (typeof amountUsdt !== "string" || !amountUsdt.trim()) return null;
  try {
    return approx(amountUsdt, { usdtKrw: snapshot.usdtKrw });
  } catch {
    return null;
  }
}
