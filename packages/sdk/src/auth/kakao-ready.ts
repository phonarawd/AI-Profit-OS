/**
 * 카카오 시작 가드.
 * CLIENT_ID만으로 활성 금지 — ENABLED 필수.
 */

export type KakaoReadyEnv = {
  NEXT_PUBLIC_OAUTH_KAKAO_ENABLED?: string;
  NEXT_PUBLIC_OAUTH_KAKAO_CLIENT_ID?: string;
};

function readKakaoEnv(env?: KakaoReadyEnv): KakaoReadyEnv {
  if (env) return env;
  if (typeof process === "undefined") return {};
  return {
    NEXT_PUBLIC_OAUTH_KAKAO_ENABLED: process.env.NEXT_PUBLIC_OAUTH_KAKAO_ENABLED,
    NEXT_PUBLIC_OAUTH_KAKAO_CLIENT_ID: process.env.NEXT_PUBLIC_OAUTH_KAKAO_CLIENT_ID,
  };
}

export function isKakaoOAuthReady(env?: KakaoReadyEnv): boolean {
  const enabled = readKakaoEnv(env).NEXT_PUBLIC_OAUTH_KAKAO_ENABLED;
  return enabled === "1" || enabled === "true";
}
