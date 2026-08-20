/**
 * Runtime → OpportunityRoomModel.
 * 없는 칸은 null. 클라 환율 곱셈 0. duration owner 없으면 null.
 */

import type { CurrentFxApproxResponse } from "@aipo/sdk/current-fx";
import type { OpportunityFeedItem } from "@aipo/sdk/user-feed";
import type { WalletBucketsResponse } from "@aipo/sdk/wallet";
import {
  formatDurationMinutesFromSec,
  formatKrwApprox,
  formatRatePct,
  formatSignedUsdt,
  formatUsdtDisplay,
} from "../spark-dash-home/format";
import type { SparkDashNavItem } from "../spark-dash-home/types";
import { resolveProfitsMediaPolicy } from "../spark-dash-profits/map-runtime";
import type { ProfitsDesktopModel } from "../spark-dash-profits/types";
import type {
  OpportunityRoomItem,
  OpportunityRoomModel,
  OpportunityRoomViewState,
} from "./types";

const ROOM_RUNTIME_NAV: SparkDashNavItem[] = [
  { key: "home", label: "홈", href: "/", icon: "home" },
  { key: "explore", label: "기회 탐색", href: "/profits", icon: "explore" },
  { key: "assets", label: "내 자산", href: "/wallet", icon: "wallet" },
  { key: "participations", label: "참여 내역", href: "/trades", icon: "list" },
  { key: "settlements", label: "정산 내역", href: "/wallet/history", icon: "receipt" },
  { key: "partners", label: "파트너", href: "/me/guide/partners", icon: "partner" },
  { key: "alerts", label: "알림", href: "/me/inbox", icon: "bell" },
  { key: "settings", label: "설정", href: "/me/settings", icon: "settings" },
];

function asText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function asNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function partnerKindFromBuyMarketId(
  buyMarketId: string | null,
): OpportunityRoomItem["partnerKind"] {
  if (buyMarketId && buyMarketId.startsWith("ebay_")) return "ebay";
  return "plain";
}

function isJoinable(item: OpportunityFeedItem): boolean {
  return asText(item.bucket) === "affordable";
}

function needsFunding(item: OpportunityFeedItem): boolean {
  if (item.bucket === "nearMiss") return true;
  const suggest = item.suggestDepositUsdt;
  return typeof suggest === "string" && suggest !== "0" && /^-?[0-9]+(\.[0-9]+)?$/.test(suggest);
}

function formatSpreadChip(raw: string | null): string | null {
  const body = formatUsdtDisplay(raw);
  if (body == null) return null;
  if (body.startsWith("-")) return body;
  return `+${body}`;
}

export function mapOpportunityRoomItem(
  item: OpportunityFeedItem,
): OpportunityRoomItem | null {
  const id = asText(item.id);
  const title = asText(item.assetLabel);
  if (!id || !title) return null;
  const media = resolveProfitsMediaPolicy({
    url: asText(item.assetImageUrl),
    source: item.assetImageSource,
  });
  const sec = asNum(item.estimatedDurationSec);
  const profitKrw = asNum(item.expectedProfitKrwApprox);
  const capital = formatUsdtDisplay(asText(item.requiredCapitalUsdt));
  const suggestRaw = asText(item.suggestDepositUsdt);
  const suggest =
    suggestRaw && suggestRaw !== "0" ? formatUsdtDisplay(suggestRaw) : null;
  const joinable = isJoinable(item);
  const funding = needsFunding(item);
  const locked = item.bucket === "lockedHigh" || item.compareReady === false;
  return {
    id,
    title,
    partner: asText(item.buyMarketLabelKo) ?? "",
    partnerKind: partnerKindFromBuyMarketId(asText(item.buyMarketId)),
    productMediaUrl: media.displayUrl,
    productMediaAlt: asText(item.assetImageAltKo) ?? title,
    mediaState: media.mediaState,
    corridorKo: asText(item.arbitrageTypeKo),
    ratePct: formatRatePct(asText(item.marginPct)),
    expectedProfitUsdt: formatSignedUsdt(asText(item.expectedProfitUsdt)),
    expectedProfitKrw:
      profitKrw != null && profitKrw > 0
        ? formatKrwApprox(String(Math.round(profitKrw)))
        : null,
    capitalUsdt: capital,
    capitalKrw: null,
    durationLabel: formatDurationMinutesFromSec(sec),
    statusLabel: joinable
      ? "참여 가능"
      : funding
        ? "원금이 부족해요"
        : locked
          ? "지금은 이 기회로 수익을 벌 수 없어요"
          : "조건 확인 후 참여 가능",
    joinable,
    funding,
    locked,
    suggestDeposit: suggest,
    buyLabel: asText(item.buyMarketLabelKo),
    buyPriceUsdt: formatUsdtDisplay(asText(item.buyPriceUsdt)),
    sellLabel: asText(item.sellMarketLabelKo),
    sellPriceUsdt: formatUsdtDisplay(asText(item.sellPriceUsdt)),
    grossSpreadUsdt: formatSpreadChip(asText(item.grossSpreadUsdt)),
  };
}

export function emptyOpportunityRoomModel(
  viewState: OpportunityRoomViewState = "LOADING",
): OpportunityRoomModel {
  return {
    owner: "runtime",
    viewState,
    displayName: null,
    levelLabel: null,
    sidebarBalance: { usdt: null, krw: null },
    nav: ROOM_RUNTIME_NAV,
    item: null,
  };
}

export function mapOpportunityRoom(input: {
  buckets: WalletBucketsResponse | null;
  fx: CurrentFxApproxResponse | null;
  item: OpportunityFeedItem | null;
  displayName: string | null;
  viewState: OpportunityRoomViewState;
}): OpportunityRoomModel {
  const principal = formatUsdtDisplay(input.buckets?.principalUsdt ?? null);
  const principalKrw = formatKrwApprox(input.fx?.principalKrwApprox ?? null);
  const mapped =
    input.viewState === "READY" && input.item
      ? mapOpportunityRoomItem(input.item)
      : null;
  const viewState =
    input.viewState === "READY" && mapped == null ? "EMPTY" : input.viewState;

  return {
    owner: "runtime",
    viewState,
    displayName: input.displayName,
    levelLabel: input.displayName ? "회원" : null,
    sidebarBalance: { usdt: principal, krw: principalKrw },
    nav: ROOM_RUNTIME_NAV,
    item: viewState === "READY" ? mapped : null,
  };
}

export function toRoomShellModel(
  model: OpportunityRoomModel,
): ProfitsDesktopModel {
  return {
    owner: model.owner,
    viewState: model.viewState,
    displayName: model.displayName,
    levelLabel: model.levelLabel,
    sidebarBalance: model.sidebarBalance,
    nav: model.nav,
    items: [],
  };
}
