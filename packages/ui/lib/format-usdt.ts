/**
 * formatUsdt — Money 표시 포맷 단일 SSOT (HomePrincipalRail/HomeRightRail 공유)
 * UI 가격/환율 재계산 금지 — 문자열 숫자를 로케일 표기로만 변환한다.
 */
export function formatUsdt(raw: string): string {
  const t = (raw || "0").trim() || "0";
  const n = Number(t);
  if (!Number.isFinite(n)) return t;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}
