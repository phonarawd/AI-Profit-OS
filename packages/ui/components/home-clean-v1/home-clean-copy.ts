import type { HomeCleanViewState } from "./home-clean.types";

/**
 * HomeCleanV1 전용 presentation copy.
 * Founder 결정: HOME_CLEAN_COPY_CONFLICT_DECISION_APPROVED
 *
 * - `packages/ui/copy/ko/home.ts` (`T.home`) overwrite 0
 * - `USER_TABS` label/href overwrite 0
 * - 03 플랜 · legacy Home · 다른 페이지 변경 0
 * - Navigation 라벨 권위 = USER_TABS
 *   `홈`→`/` · `기회`→`/profits` · `수익`→`/trades` · `지갑`→`/wallet` · `내정보`→`/me`
 * - Visual Authority 이미지의 `매칭`/`자산`/`내 정보`를 탭 라벨로 복사 금지
 */

export const HOME_CLEAN_COPY = {
  greeting: {
    heading: "안녕하세요",
    aria: "인사",
  },
  profile: {
    /** identity 부재 fallback. 정적 김 금지 */
    fallback: "사용자",
  },
  aiSummary: {
    /** loading / scanning 표시만. 전 상태 고정 금지 */
    scanning: "퍼뜩 AI가 수익 기회를 찾고 있어요",
    readyData: "퍼뜩 AI가 발견한 기회",
    aria: "퍼뜩 AI 요약",
  },
  asset: {
    /** 섹션 제목. Ledger 잔액을 전체 자산으로 위장 금지 */
    sectionHeading: "내 자산",
    /** 실제 사용 가능 잔액 필드 */
    balanceField: "내 잔액",
    aria: "내 자산",
    krwUnit: "KRW",
    usdtUnit: "USDT",
    unitAria: "표시 통화",
    historyCta: "자산 내역",
    trendAria: "추세 자리",
  },
  category: {
    aria: "상품 분류",
    all: "전체",
    watch: "시계",
    card: "카드",
    bag: "가방",
  },
  requiredPrincipal: {
    /** Engine/read model required principal 실값만 */
    label: "필요 원금",
  },
  rail: {
    progress: "진행 중인 매칭",
    update: "퍼뜩 업데이트",
    trust: "신뢰와 안전",
    insight: "인사이트 요약",
  },
  absent: {
    dash: "—",
    checking: "확인 중",
    unavailable: "정보 없음",
  },
} as const;

export type HomeCleanCopy = typeof HOME_CLEAN_COPY;

/** HomeViewState 표시용. 새 enum 발명 아님 */
export type HomeCleanAiSummaryTitleState = HomeCleanViewState;

export function homeCleanAiSummaryTitle(
  state: HomeCleanAiSummaryTitleState,
): string {
  if (state === "loading") return HOME_CLEAN_COPY.aiSummary.scanning;
  if (state === "ready_data") return HOME_CLEAN_COPY.aiSummary.readyData;
  return HOME_CLEAN_COPY.absent.checking;
}
