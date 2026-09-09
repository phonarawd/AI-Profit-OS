/**
 * 약관·개인정보 동의 버전 SSOT.
 * 화면 체크 시각만 저장하면 어떤 문서에 동의했는지 알 수 없다.
 */

export const CURRENT_TERMS_VERSION = "2026-09-06.v1" as const;
export const CURRENT_PRIVACY_VERSION = "2026-09-06.v1" as const;

export type ConsentVersions = {
  termsVersion: string;
  privacyVersion: string;
};

export function readConsentVersions(input: {
  termsVersion?: string;
  privacyVersion?: string;
}): ConsentVersions | "CONSENT_VERSION_STALE" {
  const terms =
    typeof input.termsVersion === "string" && input.termsVersion.trim()
      ? input.termsVersion.trim()
      : CURRENT_TERMS_VERSION;
  const privacy =
    typeof input.privacyVersion === "string" && input.privacyVersion.trim()
      ? input.privacyVersion.trim()
      : CURRENT_PRIVACY_VERSION;
  if (terms !== CURRENT_TERMS_VERSION || privacy !== CURRENT_PRIVACY_VERSION) {
    return "CONSENT_VERSION_STALE";
  }
  return { termsVersion: terms, privacyVersion: privacy };
}
