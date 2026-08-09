/**
 * Decimal-as-string money helpers — no IEEE float (Money §11 · 오차0).
 * Internal scale = 18 (matches ledger_accounts.balance_usdt numeric(36,18)).
 */

const AMOUNT_RE = /^-?[0-9]+(\.[0-9]+)?$/;
const SCALE = 18;

export function assertAmountUsdt(raw: string, field = "amountUsdt"): string {
  if (typeof raw !== "string" || !AMOUNT_RE.test(raw)) {
    throw new Error(`${field} must be decimal string`);
  }
  const n = parseAmount(raw);
  if (n <= 0n) throw new Error(`${field} must be > 0`);
  return formatAmount(n);
}

export function parseAmount(raw: string): bigint {
  if (!AMOUNT_RE.test(raw)) throw new Error(`invalid amount: ${raw}`);
  const neg = raw.startsWith("-");
  const body = neg ? raw.slice(1) : raw;
  const [wholePart, fracPart = ""] = body.split(".");
  if (fracPart.length > SCALE) throw new Error(`amount scale > ${SCALE}`);
  const padded = (fracPart + "0".repeat(SCALE)).slice(0, SCALE);
  const scaled = BigInt(wholePart + padded);
  return neg ? -scaled : scaled;
}

export function formatAmount(n: bigint): string {
  const neg = n < 0n;
  const abs = neg ? -n : n;
  const s = abs.toString().padStart(SCALE + 1, "0");
  const whole = s.slice(0, -SCALE) || "0";
  let frac = s.slice(-SCALE).replace(/0+$/, "");
  const body = frac.length ? `${whole}.${frac}` : whole;
  return neg ? `-${body}` : body;
}

export function addAmount(a: string, b: string): string {
  return formatAmount(parseAmount(a) + parseAmount(b));
}

export function subAmount(a: string, b: string): string {
  return formatAmount(parseAmount(a) - parseAmount(b));
}

export function cmpAmount(a: string, b: string): number {
  const d = parseAmount(a) - parseAmount(b);
  if (d < 0n) return -1;
  if (d > 0n) return 1;
  return 0;
}

export function isPositiveAmount(raw: string): boolean {
  return AMOUNT_RE.test(raw) && parseAmount(raw) > 0n;
}

/** High-value admin adjust threshold (§9.8.3) */
export const ADMIN_ADJUST_DUAL_CONFIRM_USDT = "1000";
