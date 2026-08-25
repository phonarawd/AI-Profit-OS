/**
 * Shared consumer money formatting. No FX multiply. Decimal strings only.
 */

const DEC = /^-?[0-9]+(\.[0-9]+)?$/;

export function isDecimalString(raw: string | null | undefined): boolean {
  return typeof raw === "string" && DEC.test(raw);
}

export function formatUsdtBody(raw: string | null | undefined): string | null {
  if (!isDecimalString(raw)) return null;
  const neg = raw!.startsWith("-");
  const abs = neg ? raw!.slice(1) : raw!;
  const [w, f = ""] = abs.split(".");
  const whole = w.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = f.padEnd(2, "0").slice(0, 2);
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

export function formatUsdtLine(
  raw: string | null | undefined,
  signed = false,
): string | null {
  const body = formatUsdtBody(raw);
  if (body == null) return null;
  if (!signed) return `${body} USDT`;
  if (body.startsWith("-")) return `${body} USDT`;
  return `+${body} USDT`;
}

/** Integer KRW display from a server-rounded decimal/integer string. */
export function formatKrwInteger(raw: string | null | undefined): string | null {
  if (!isDecimalString(raw)) return null;
  const neg = raw!.startsWith("-");
  const abs = neg ? raw!.slice(1) : raw!;
  const [w, f = ""] = abs.split(".");
  const carry = f.charAt(0) >= "5" ? 1 : 0;
  let whole = w.replace(/^0+(?=\d)/, "");
  if (!whole) whole = "0";
  if (carry) {
    const next = String(BigInt(whole) + 1n);
    whole = next;
  }
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${grouped}`;
}

export function formatKrwApproxLine(
  raw: string | null | undefined,
  signed = false,
  template = "약 \u20a9{amount}",
): string | null {
  const body = formatKrwInteger(raw);
  if (body == null) return null;
  if (signed && !body.startsWith("-")) {
    return template.replace("{amount}", `+${body}`);
  }
  if (signed && body.startsWith("-")) {
    return template.replace("{amount}", body);
  }
  return template.replace("{amount}", body);
}

export function moneyAriaLabel(input: {
  usdtLine: string | null;
  krwLine: string | null;
}): string {
  if (input.usdtLine && input.krwLine) return `${input.usdtLine}, ${input.krwLine}`;
  return input.usdtLine ?? input.krwLine ?? "";
}
