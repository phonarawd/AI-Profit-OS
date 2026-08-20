/**
 * 카카오 시작 가드.
 * CLIENT_ID만으로 활성 금지 — ENABLED 필수.
 */

export type KakaoReadyEnv = {
  NEXT_PUBLIC_OAUTH_KAKAO_ENABLED?: string;
  NEXT_PUBLIC_OAUTH_KAKAO_CLIENT_ID?: string;
};

export function isKakaoOAuthReady(env: KakaoReadyEnv = process.env): boolean {
  const enabled = env.NEXT_PUBLIC_OAUTH_KAKAO_ENABLED;
  return enabled === "1" || enabled === "true";
}
