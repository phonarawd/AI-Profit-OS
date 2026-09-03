/**
 * 이메일 형식 — 길이 상한 + 선형 스캔. 호출자 주장을 권위로 쓰지 않는다.
 */

/** RFC 5321 경로 상한. 다항 정규식 금지. */
export const EMAIL_MAX_LEN = 254;

export function isValidEmail(raw: string): boolean {
  if (typeof raw !== "string") return false;
  const n = raw.length;
  if (n < 5 || n > EMAIL_MAX_LEN) return false;
  let at = -1;
  for (let i = 0; i < n; i += 1) {
    const ch = raw[i]!;
    if (ch === "@") {
      if (at !== -1) return false;
      at = i;
      continue;
    }
    if (/\s/.test(ch)) return false;
  }
  if (at <= 0 || at >= n - 3) return false;
  const domain = raw.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  if (dot <= 0 || dot === domain.length - 1) return false;
  return true;
}
