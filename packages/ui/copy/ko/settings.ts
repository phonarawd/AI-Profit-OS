/**
 * T.settings.* — §50.1 fontScale 3단 · toneBand · Light 테마 토글 0
 */
export const settings = {
  title: "설정",
  fontScale: {
    label: "글자 크기",
    md: "보통",
    lg: "크게",
    xl: "더 크게",
  },
  toneBand: {
    label: "설명 방식",
    young: "짧게",
    mid: "비교로",
    senior: "한 줄씩",
  },
  depositPref: {
    label: "충전 화면 기본",
    usdt: "테더(USDT)",
    krw: "원화",
  },
  viewStyle: {
    label: "화면 스타일",
    darkFixed: "어두운 화면으로 고정돼 있어요. 밝은 화면 전환은 없어요.",
  },
  notify: {
    label: "알림",
    master: "앱 알림",
    opportunity: "수익 기회 알림",
    wallet: "충전·출금 알림",
    notice: "공지 알림",
  },
  money: {
    label: "내 돈 관련",
    defaultWithdrawProfit: "기본 출금: 수익만",
  },
  /** Forbidden — verify:font-scale-three / korean-ui */
  themeToggleForbidden: true,
  legalLinks: "약관과 정보",
  appInfo: "앱 정보",
} as const;

export type SettingsCopy = typeof settings;
