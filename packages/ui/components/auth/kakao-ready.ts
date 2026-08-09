/**
 * Kakao OAuth readiness — Infra `auth-kakao-oauth-runtime` owns callback.
 * Founder env may set client id; until NEXT_PUBLIC flag + callback exist, UI disables.
 */
export function isKakaoOAuthReady(): boolean {
  if (typeof process === "undefined") return false;
  const enabled = process.env.NEXT_PUBLIC_OAUTH_KAKAO_ENABLED;
  if (enabled === "0" || enabled === "false") return false;
  if (enabled === "1" || enabled === "true") return true;
  // Default: require public client id (secret stays server-side · Infra)
  const clientId = process.env.NEXT_PUBLIC_OAUTH_KAKAO_CLIENT_ID;
  return Boolean(clientId && clientId.length > 0);
}

export function kakaoStartHref(): string {
  return "/auth/oauth/kakao";
}
