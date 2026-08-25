/**
 * Opportunity Room Desktop view-model.
 * Money 문자열은 owner가 이미 포맷. null = 없음 · 0으로 채우지 않음.
 */

import type {
  SparkDashDataOwner,
  SparkDashMoney,
  SparkDashNavItem,
} from "../spark-dash-home/types";
import type { ProfitsMediaState, ProfitsViewState } from "../spark-dash-profits/types";

export type OpportunityRoomMediaState = ProfitsMediaState;
export type OpportunityRoomViewState = ProfitsViewState;

export type OpportunityRoomItem = {
  id: string;
  title: string;
  partner: string;
  partnerKind: "ebay" | "amazon" | "yahoo" | "plain";
  productMediaUrl: string | null;
  productMediaAlt: string;
  mediaState: OpportunityRoomMediaState;
  corridorKo: string | null;
  ratePct: string | null;
  expectedProfitUsdt: string | null;
  expectedProfitKrw: string | null;
  capitalUsdt: string | null;
  capitalKrw: string | null;
  durationLabel: string | null;
  statusLabel: string;
  joinable: boolean;
  funding: boolean;
  locked: boolean;
  suggestDeposit: string | null;
  buyLabel: string | null;
  buyPriceUsdt: string | null;
  buyPriceKrw: string | null;
  sellLabel: string | null;
  sellPriceUsdt: string | null;
  sellPriceKrw: string | null;
  grossSpreadUsdt: string | null;
};

export type OpportunityRoomModel = {
  owner: SparkDashDataOwner;
  viewState: OpportunityRoomViewState;
  displayName: string | null;
  levelLabel: string | null;
  sidebarBalance: SparkDashMoney;
  nav: SparkDashNavItem[];
  item: OpportunityRoomItem | null;
};
