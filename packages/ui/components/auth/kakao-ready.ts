/**
 * Kakao OAuth readiness — Infra `auth-kakao-oauth-runtime` owns callback.
 * Founder may set server `OAUTH_KAKAO_*` in `.env`; UI stays disabled until
 * Infra ships callback and flips `NEXT_PUBLIC_OAUTH_KAKAO_ENABLED=1`.
 * Client id alone must NOT enable (broken redirect · 랜딩 직행 0 유지).
 */
export function isKakaoOAuthReady(): boolean {
  if (typeof process === "undefined") return false;
  const enabled = process.env.NEXT_PUBLIC_OAUTH_KAKAO_ENABLED;
  return enabled === "1" || enabled === "true";
}

/** Next thin start route — Infra wires Nest authorizeUrl behind this path */
export function kakaoStartHref(): string {
  return "/auth/oauth/kakao";
}
