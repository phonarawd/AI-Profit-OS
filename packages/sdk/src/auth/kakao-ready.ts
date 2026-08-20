/**
 * 카카오 시작 가드.
 * CLIENT_ID만으로 활성 금지 — ENABLED=1 필수.
 */

export type KakaoReadyEnv = {
  NEXT_PUBLIC_OAUTH_KAKAO_ENABLED?: string;
  NEXT_PUBLIC_OAUTH_KAKAO_CLIENT_ID?: string;
};

export function isKakaoOAuthReady(env: KakaoReadyEnv = process.env): boolean {
  return env.NEXT_PUBLIC_OAUTH_KAKAO_ENABLED === "1";
}
