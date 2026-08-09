/**
 * T.auth.* — Canon auth-login / auth-signup / auth-complete-profile
 * §27.10 · Infra §51.9 field SSOT · wiring = auth-login-signup-ui
 * Guest = utility 톤(§6.4c.1 F) · 수익|투자|USDT|테더|보장|차익|괴리율 0
 * Kakao callback = Infra auth-kakao-oauth-runtime (pending → UI disabled guard)
 */
export const auth = {
  kakaoStart: "카카오로 시작하기",
  googleStart: "Google로 계속하기",
  passkeyStart: "패스키로 로그인",
  emailMagic: "이메일로 로그인 링크 받기",
  emailForm: "이메일 주소",
  emailPlaceholder: "이름@예시.com",
  loginHeadline: "👋 다시 오신 걸 환영해요",
  loginSub: "퍼뜩에서 이어서 시세·가격 비교를 살펴보세요",
  signupHeadline: "✨ 퍼뜩 시작하기",
  signupSub: "가입하면 실시간 시세 맵을 이어서 볼 수 있어요",
  completeHeadline: "📝 기본 정보만 남겨 주세요",
  completeSub: "이름·연락처만 있으면 바로 쓸 수 있어요",
  completeHintWithdraw: "출금·본인확인 전에 이 정보가 필요해요",
  saveContinue: "저장하고 계속",
  displayName: "표시 이름",
  phone: "휴대폰 번호",
  email: "이메일",
  birthDate: "생년월일",
  termsRequired: "이용약관·개인정보 처리방침에 동의해요 (필수)",
  marketingOptional: "혜택·소식 받기 (선택)",
  referralCode: "초대 코드 (선택)",
  logout: "로그아웃",
  /** Kakao env / callback missing — UI disabled guard (Infra pointer) */
  kakaoUnavailable: "💡 카카오 로그인은 곧 열려요. 다른 방법으로 시작해 주세요",
  oauthSoon: "💡 이 로그인 방법은 곧 열려요",
  toSignup: "아직 계정이 없나요? 가입하기",
  toLogin: "이미 계정이 있나요? 로그인",
} as const;

export type AuthCopy = typeof auth;
