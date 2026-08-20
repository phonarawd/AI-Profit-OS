/**
 * 소비자 금액 표시. missing/null → UNAVAILABLE. 실제 0은 0으로 둔다.
 */
const USDT_DEC = /^-?[0-9]+(\.[0-9]+)?$/;

export function moneyDisplayState(
  raw: string | null | undefined,
): { state: "ready" | "UNAVAILABLE"; display: string | null } {
  if (raw == null || raw === "" || !USDT_DEC.test(raw)) {
    return { state: "UNAVAILABLE", display: null };
  }
  return { state: "ready", display: raw };
}

export function formatUsdtOrUnavailable(
  raw: string | null | undefined,
  signed = false,
): { state: "ready" | "UNAVAILABLE"; text: string } {
  const { state, display } = moneyDisplayState(raw);
  if (state === "UNAVAILABLE" || display == null) {
    return { state: "UNAVAILABLE", text: "확인할 수 없음" };
  }
  if (signed) {
    const neg = display.startsWith("-");
    return {
      state: "ready",
      text: `${neg ? "" : "+"}${display} USDT`,
    };
  }
  return { state: "ready", text: `${display} USDT` };
}
