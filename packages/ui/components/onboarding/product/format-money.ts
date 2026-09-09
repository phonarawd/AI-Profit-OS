/**
 * 문자열 decimal만 그룹한다. 부동소수점 재계산 금지.
 */

const DEC = /^(-?)(\d+)(?:\.(\d+))?$/;

export function formatDecimalGroup(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const m = DEC.exec(raw);
  if (!m) return null;
  const sign = m[1];
  const whole = m[2].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (m[3] ?? "00").padEnd(2, "0").slice(0, 2);
  return `${sign}${whole}.${frac}`;
}

export function formatKrwGroup(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  if (!/^\d+$/.test(raw)) return null;
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatUsdtLine(raw: string | null | undefined, signed = false): {
  state: "ready" | "UNAVAILABLE";
  text: string;
} {
  const grouped = formatDecimalGroup(raw);
  if (!grouped) return { state: "UNAVAILABLE", text: "" };
  const neg = grouped.startsWith("-");
  const prefix = signed && !neg ? "+" : "";
  return { state: "ready", text: `${prefix}${grouped}` };
}
