/**
 * 약관·개인정보 동의 버전. 화면 체크 시각만으로는 문서 버전을 알 수 없다.
 * 유저웹이 버전을 안 보내면 현재 SSOT를 쓴다.
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
