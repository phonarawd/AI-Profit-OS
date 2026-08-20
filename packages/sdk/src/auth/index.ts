export {
  AuthError,
  assertNoForbiddenProfileFields,
  buildStageBProfileBody,
  continuePathAfterAuth,
  fetchAuthSession,
  isAuthError,
  normalizeAuthSession,
  patchAuthProfile,
  requestMagicLink,
  startKakaoOAuth,
} from "./fetch";
export { isKakaoOAuthReady, type KakaoReadyEnv } from "./kakao-ready";
export type {
  AuthOnboardingStage,
  AuthRequestOpts,
  AuthSession,
  KakaoStartInput,
  KakaoStartResult,
  StageBProfileInput,
  StageBProfileResult,
} from "./types";
