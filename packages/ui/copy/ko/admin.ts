/**
 * T.admin.* — Admin plain language §27.5 · cute tone 0
 * Canon wire copyKeys · UI app implementation 0 for Admin Owns surfaces
 */
export const admin = {
  twelveModules: "운영 메뉴 12",
  savePolicy: "정책 저장",
  matchSuccessControl: "매칭 성공 조절",
  executionRealGuards: "실조건 가드",
  executionPresentation: "화면 연출만",
  observedSuccessRate: "오늘 관측 성공 비율(읽기 전용)",
  nearMissCapUsdt: "니어미스 상한(USDT)",
  growthTabs: "성장",
  contentTab: "면책·신뢰 카피",
  taxDisclaimerLocked: "세금 면책 블록(편집 잠금)",
  taxDisclaimerLockedHint:
    "유저 면책 문구는 코드 SSOT이며 이 화면에서 고칠 수 없습니다.",
  simulationGates: "시뮬레이션 게이트",
  simulationKpiInputs: "KPI 입력",
  growthEnabled: "Growth ON",
  simulationLatest: "최근 시뮬레이션",
  systemControlTabs: "시스템 제어",
  platformReserveTarget: "플랫폼 리저브 목표",
  platformReserveS2: "S2 리저브",
  platformReserveAudit: "리저브 감사",
  adaptersCollectors: "수집기",
  adaptersListingLegs: "리스팅 레그",
  adaptersMatchingKpi: "매칭 KPI",
  adaptersAlerts: "알림",
  adaptersYahoo0: "야후 경로 0",
  aiLogsTabs: "AI 로그",
  aiLogsTraces: "트레이스",
  aiPickScores: "AI PICK 점수",
  aiEvalGate: "평가 게이트",
  aiCoach: "퍼뜩 코치",
  toast: {
    depositReview: "입금 검수 대기",
    policySaved: "정책을 저장했습니다",
  },
} as const;

export type AdminCopy = typeof admin;
