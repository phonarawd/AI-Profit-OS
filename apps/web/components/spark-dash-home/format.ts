/**
 * 표시 전용. 환율 곱셈·원금 재계산 금지.
 * KRW는 fixture 문자열 또는 current-fx owner 결과만 받는다.
 */

const USDT_DEC = /^-?[0-9]+(\.[0-9]+)?$/;

export function formatUsdtDisplay(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  if (!USDT_DEC.test(raw)) return null;
  const neg = raw.startsWith("-");
  const abs = neg ? raw.slice(1) : raw;
  const [w, f = ""] = abs.split(".");
  const whole = w.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = f.padEnd(2, "0").slice(0, 2);
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

export function formatSignedUsdt(raw: string | null | undefined): string | null {
  const body = formatUsdtDisplay(raw);
  if (body == null) return null;
  if (body.startsWith("-")) return `${body} USDT`;
  return `+${body} USDT`;
}

export function formatKrwApprox(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  if (!USDT_DEC.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return `≈ ₩${Math.round(n).toLocaleString("ko-KR")}`;
}

/** estimatedDurationSec → 분. day×1440 경로 없음. owner 없으면 null(—). */
export function formatDurationMinutesFromSec(
  sec: number | null | undefined,
): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const min = Math.max(1, Math.round(sec / 60));
  return `${min.toLocaleString("en-US")}분`;
}

export function formatRatePct(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return `${n.toFixed(1)}%`;
}

export function moneyOrDash(value: string | null): string {
  return value ?? "—";
}

/** missing/null → UNAVAILABLE. 화면 기하 변경 없음. */
export function moneyState(
  raw: string | null | undefined,
): "ready" | "UNAVAILABLE" {
  if (raw == null || raw === "") return "UNAVAILABLE";
  return USDT_DEC.test(raw) ? "ready" : "UNAVAILABLE";
}

/** 숫자와 USDT 단위를 한 줄에서 다른 크기로 그리기 위한 표시 분리. 값 재계산 없음. */
export function splitUsdtParts(value: string | null): {
  amount: string;
  unit: string | null;
} {
  if (value == null || value === "") return { amount: "—", unit: null };
  const trimmed = value.trim();
  const matched = trimmed.match(/^(.*?)(?:\s+USDT)$/i);
  if (matched?.[1]) return { amount: matched[1].trim(), unit: "USDT" };
  return { amount: trimmed, unit: null };
}
