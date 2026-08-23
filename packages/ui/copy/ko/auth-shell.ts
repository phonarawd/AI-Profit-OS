/**
 * T.authShell.* — Spark Dash AuthShell brand panel notes (REL-101/102/103)
 * Headlines remain T.auth.* · brand notes are desktop/mobile masthead footnotes only.
 */
export const authShell = {
  loginBrandNote:
    "카카오로 시작하거나, 이 기기에서 패스키·이메일 링크로 들어와요. Google은 아직 열려 있지 않아요.",
  signupBrandNote:
    "약관에 동의한 뒤에만 카카오로 시작할 수 있어요. 표시 이름·연락처는 다음 단계에서 받아요.",
  completeBrandNote:
    "서비스 이용에 필요한 기본 정보만 받아요. 본인확인은 별도 절차이며, 출금 전에 안내해 드려요.",
} as const;

export type AuthShellCopy = typeof authShell;
