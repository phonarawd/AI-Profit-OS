/**
 * @aipo/sdk/auth — Nest JWT · cookie aipo_session. Supabase Auth 금지.
 */

export type AuthRequestOpts = {
  apiBase?: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  signal?: AbortSignal;
};

export type AuthOnboardingStage = "A" | "B_incomplete" | "B_complete";

export type AuthSession = {
  sessionId: string;
  userId: string;
  issuer: "ai-profit-os-nest";
  issuedAt: string;
  expiresAt: string;
  revoked: false;
  onboardingStage: AuthOnboardingStage;
};

export type KakaoStartInput = {
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
  marketingConsent?: boolean;
  referralCode?: string;
};

export type KakaoStartResult =
  | { status: "ready"; authorizeUrl: string }
  | { status: "not_configured" };

export type StageASignupInput = {
  method: "email_magic";
  termsAcceptedAt: string;
  privacyAcceptedAt: string;
  marketingConsent?: boolean;
  referralCode?: string;
  email: string;
};

export type StageBProfileInput = {
  displayName: string;
  phoneE164: string;
  birthDate: string;
  email?: string;
  emailAlreadyKnown?: boolean;
};

export type StageBProfileResult = {
  ok: true;
  onboardingStage: "B_complete";
};

/** Nest `DELETE_ACCOUNT_CONFIRM_PHRASE` — 화면 문구와 동일해야 한다. */
export const DELETE_ACCOUNT_CONFIRM_PHRASE = "탈퇴하겠습니다" as const;

export type DeleteAccountInput = {
  confirmPhrase: string;
  confirmAgain: boolean;
};

export type DeleteAccountResult = {
  ok: true;
};

export type LogoutResult = {
  ok: true;
  revoked: true;
};
