/** Authorization Bearer 추출 — 정규식 없이 길이 제한 선형 스캔. */

export const BEARER_HEADER_MAX = 8192;
const PREFIX = "bearer ";

function foldAscii(code: number): number {
  return code >= 65 && code <= 90 ? code + 32 : code;
}

export function extractBearerToken(headerValue: unknown): string | null {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (typeof raw !== "string") return null;
  if (raw.length > BEARER_HEADER_MAX) return null;
  const text = raw.trim();
  if (text.length < PREFIX.length || text.length > BEARER_HEADER_MAX) {
    return null;
  }
  for (let i = 0; i < PREFIX.length; i += 1) {
    if (foldAscii(text.charCodeAt(i)) !== PREFIX.charCodeAt(i)) return null;
  }
  let i = PREFIX.length;
  while (i < text.length) {
    const code = text.charCodeAt(i);
    if (code !== 32 && code !== 9) break;
    i += 1;
  }
  if (i >= text.length) return null;
  const token = text.slice(i).trim();
  return token || null;
}
