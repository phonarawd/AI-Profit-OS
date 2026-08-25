export const money = {
  usdtSuffix: "USDT",
  krwApprox: "약 ₩{amount}",
  krwUnavailable: "원화 환산 정보 없음",
  krwError: "원화 환산 정보를 불러올 수 없어요",
  hintLatest: "최신 환율 기준",
  hintRecent: "최근 환율 기준",
  hintAuto: "주기적으로 자동 갱신돼요",
  helper: "원화는 최신 환율 기준 예상 금액이에요.",
  attribution: "시세 데이터 제공: CoinGecko",
  attributionHref: "https://www.coingecko.com/en/api",
} as const;

export type MoneyCopy = typeof money;
