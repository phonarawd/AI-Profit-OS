/**
 * T.loop.* — UI §51.24 DayPulse · PreCTA · Presence
 * G4 ticker/counter 수치·문구와 분리 · IT 코드 유저 surface 0
 */
export const loop = {
  /** Home [A2] DayPulse */
  dayPulseAria: "오늘 실측 요약",
  dayPulseTitle: "오늘 요약",
  safeStopToday: "오늘 안전하게 멈춘 횟수 {n}",
  settlementToday: "오늘 정산 완료 {n}",
  emptyToday: "아직 없어요",
  /** §51.24.4 · 실패/낙첨 프레이밍 금지 */
  safeStopTrustHint: "손해 없이 멈춘 기록이에요",
  enginePointer: "Engine §48.13.1 live",
  adminPointer: "Admin §35.4 DayPulse 편집 UI 0",
  g4MergeForbidden: "G4 demo·hybrid·blended 합치기 금지",

  /** PreCTA / Preflight · participate 직전 */
  mayStop: "시세가 움직이면 안전하게 멈출 수 있어요",
  preflightAria: "참여 전 안내",
  preflightHint: "확인 후에만 수익 벌기로 이어져요",

  /** Presence · 기본 OFF */
  presenceWatching: "지금 보는 중 {n}명",

  /** Forbidden user-facing phrases (verify:loop-psychology L9/L11/L20) */
  forbiddenPhrases: [
    "무조건 성공",
    "무조건 수익",
    "보장 수익",
    "100% 당첨",
    "낙첨",
    "실패했어요",
  ] as const,
} as const;

export type LoopCopy = typeof loop;
