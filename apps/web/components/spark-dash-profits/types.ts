/**
 * Spark Dash 기회 탐색 Desktop view-model.
 * Home 모델과 분리. Money 문자열은 owner가 이미 포맷.
 */

import type {
  SparkDashDataOwner,
  SparkDashMoney,
  SparkDashNavItem,
} from "../spark-dash-home/types";

export type ProfitsFilterKey = "all" | "joinable";
export type ProfitsSortKey = "recommended";

/** viewState owner = opportunity feed. Wallet/FX 실패와 섞지 않음. */
export type ProfitsViewState =
  | "LOADING"
  | "READY"
  | "EMPTY"
  | "ERROR"
  | "UNAUTHORIZED";

/**
 * 카드 미디어 슬롯 상태.
 * AVAILABLE = 07 gate 통과 URL이 로드된 뒤.
 * POLICY_UNKNOWN = URL은 있어도 표시 허가 증거 없음. UI는 MISSING과 동일.
 */
export type ProfitsMediaState =
  | "LOADING"
  | "AVAILABLE"
  | "MISSING"
  | "BROKEN"
  | "POLICY_UNKNOWN";

export type ProfitsOpportunity = {
  id: string;
  partner: string;
  partnerKind: "ebay" | "amazon" | "yahoo" | "plain";
  title: string;
  /** 07 gate 통과 URL만. POLICY_UNKNOWN/MISSING이면 null */
  productMediaUrl: string | null;
  productMediaAlt: string;
  /** mapper 초기값. AVAILABLE/BROKEN은 슬롯 로드 후 */
  mediaState: ProfitsMediaState;
  ratePct: string | null;
  expectedProfitUsdt: string | null;
  expectedProfitKrw: string | null;
  durationLabel: string | null;
  capitalUsdt: string | null;
  capitalKrw: string | null;
  statusLabel: string;
  href: string;
  /** 있으면 true만. 없으면 UNKNOWN — false 생성 금지 */
  official?: true;
  joinable: boolean;
  featured: boolean;
};

export type ProfitsDesktopModel = {
  owner: SparkDashDataOwner;
  viewState: ProfitsViewState;
  displayName: string | null;
  levelLabel: string | null;
  sidebarBalance: SparkDashMoney;
  nav: SparkDashNavItem[];
  items: ProfitsOpportunity[];
  fxHint: "latest" | "recent" | null;
};
