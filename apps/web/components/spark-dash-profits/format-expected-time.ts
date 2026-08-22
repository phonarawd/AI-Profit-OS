/**
 * Opportunity 전용 예상 시간 표시.
 * Home `formatDurationMinutesFromSec`를 바꾸지 않는다.
 * 없음/모름 → null(화면 —). 0분·일 단위 금지.
 *
 * 45m → 45분
 * 60m → 1시간
 * 90m → 1시간 30분
 * 120m → 2시간
 */
export function formatOpportunityExpectedTime(
  sec: number | null | undefined,
): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const minutes = Math.max(1, Math.round(sec / 60));
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}
