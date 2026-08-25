/**
 * Runtime → ProfitsDesktopModel.
 * 없는 칸은 null. 클라이언트 환율 곱셈 0. duration owner 없으면 null.
 */

import type { CurrentFxApproxResponse } from "@aipo/sdk/current-fx";
import type { OpportunityFeedItem } from "@aipo/sdk/user-feed";
import type { WalletBucketsResponse } from "@aipo/sdk/wallet";
import { formatKrwApproxLine } from "@aipo/ui/components/money";
import { fxHintFromStatus, quoteKrw } from "../../lib/current-fx-refresh";
import {
  formatDurationMinutesFromSec,
  formatRatePct,
  formatSignedUsdt,
  formatUsdtDisplay,
} from "../spark-dash-home/format";
import type { SparkDashNavItem } from "../spark-dash-home/types";
import type {
  ProfitsDesktopModel,
  ProfitsMediaState,
  ProfitsOpportunity,
  ProfitsViewState,
} from "./types";

/** Home visual fixture에 묶이지 않도록 profits runtime nav만 인라인. 값은 동일. */
const PROFITS_RUNTIME_NAV: SparkDashNavItem[] = [
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

/** Day-1: ebay_* → ebay. amazon/yahoo 추측 금지. 그 외·없으면 plain. */
function partnerKindFromBuyMarketId(
  buyMarketId: string | null,
): ProfitsOpportunity["partnerKind"] {
  if (buyMarketId && buyMarketId.startsWith("ebay_")) return "ebay";
  return "plain";
}

function isJoinable(item: OpportunityFeedItem): boolean {
  return asText(item.bucket) === "affordable";
}

/**
 * 07 Media Policy Gate.
 * URL EXISTS ≠ DISPLAY AUTHORIZED. assetImageUrl 전달 ≠ user-surface <img>.
 *
 * 기존 user-surface display allowlist는 없다. 기술 핫링크 호스트 목록,
 * 시세 참고용 카피, ingest host lock, catalog hydrate는 표시 허가가 아니다.
 *
 * 재사용 가능한 소유 증거: Asset Master + asset-image-r2 (admin_r2, https).
 * 그 외 외부 source = POLICY_UNKNOWN → fallback. 새 engine/hotlink 금지.
 */
export function resolveProfitsMediaPolicy(input: {
  url: string | null;
  source: OpportunityFeedItem["assetImageSource"];
}): {
  mediaState: Extract<ProfitsMediaState, "LOADING" | "MISSING" | "POLICY_UNKNOWN">;
  displayUrl: string | null;
} {
  const url = asText(input.url);
  if (!url) {
    return { mediaState: "MISSING", displayUrl: null };
  }
  if (input.source === "admin_r2" && url.startsWith("https://")) {
    return { mediaState: "LOADING", displayUrl: url };
  }
  return { mediaState: "POLICY_UNKNOWN", displayUrl: null };
}

function mapItem(item: OpportunityFeedItem, index: number, fx: CurrentFxApproxResponse | null): ProfitsOpportunity | null {
  const id = asText(item.id);
  const title = asText(item.assetLabel);
  if (!id || !title) return null;
  const partner = asText(item.buyMarketLabelKo) ?? "";
  const media = resolveProfitsMediaPolicy({
    url: asText(item.assetImageUrl),
    source: item.assetImageSource,
  });
  const sec = asNum(item.estimatedDurationSec);
  const quotedProfit = quoteKrw(fx, `profit:${item.id}`);
  const quotedCapital = quoteKrw(fx, `capital:${item.id}`);
  const capital = formatUsdtDisplay(asText(item.requiredCapitalUsdt));
  const joinable = isJoinable(item);
  return {
    id,
    partner,
    partnerKind: partnerKindFromBuyMarketId(asText(item.buyMarketId)),
    title,
    productMediaUrl: media.displayUrl,
    productMediaAlt: asText(item.assetImageAltKo) ?? title,
    mediaState: media.mediaState,
    ratePct: formatRatePct(asText(item.marginPct)),
    expectedProfitUsdt: formatSignedUsdt(asText(item.expectedProfitUsdt)),
    // Only the current-fx endpoint may authorize a display KRW quote.
    // The feed value has no client-side freshness clock and must not be used
    // as a fallback after an FX/API refresh failure.
    expectedProfitKrw:
      quotedProfit != null ? formatKrwApproxLine(quotedProfit, true) : null,
    durationLabel: formatDurationMinutesFromSec(sec),
    capitalUsdt: capital ? `${capital} USDT` : null,
    capitalKrw: quotedCapital ? formatKrwApproxLine(quotedCapital) : null,
    statusLabel: joinable ? "참여 가능" : "조건 확인 후 참여 가능",
    href: `/profits/${id}`,
    joinable,
    featured: index === 0,
    // official 미할당 = UNKNOWN. true 하드코드·false 생성 금지
  };
}

export function emptyProfitsRuntimeModel(
  viewState: ProfitsViewState = "LOADING",
): ProfitsDesktopModel {
  return {
    owner: "runtime",
    viewState,
    displayName: null,
    levelLabel: null,
    sidebarBalance: { usdt: null, krw: null },
    nav: PROFITS_RUNTIME_NAV,
    items: [],
    fxHint: null,
  };
}

export function mapRuntimeProfits(input: {
  buckets: WalletBucketsResponse | null;
  fx: CurrentFxApproxResponse | null;
  items: OpportunityFeedItem[];
  displayName: string | null;
  viewState: ProfitsViewState;
}): ProfitsDesktopModel {
  const principal = formatUsdtDisplay(input.buckets?.principalUsdt ?? null);
  const principalKrw = formatKrwApproxLine(input.fx?.principalKrwApprox ?? null);
  const mapped =
    input.viewState === "READY" || input.viewState === "EMPTY"
      ? input.items
          .map((item, index) => mapItem(item, index, input.fx))
          .filter((x): x is ProfitsOpportunity => x != null)
      : [];
  const viewState =
    input.viewState === "READY" && mapped.length === 0 ? "EMPTY" : input.viewState;
  const items = viewState === "READY" ? mapped : [];

  return {
    owner: "runtime",
    viewState,
    displayName: input.displayName,
    levelLabel: input.displayName ? "회원" : null,
    sidebarBalance: { usdt: principal, krw: principalKrw },
    nav: PROFITS_RUNTIME_NAV,
    items,
    fxHint: fxHintFromStatus(input.fx?.fxStatus),
  };
}
