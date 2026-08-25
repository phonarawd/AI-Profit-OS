/**
 * Runtime → SparkDashHomeModel.
 * wallet buckets / feed / current-fx만 사용. 없는 칸은 null.
 * 클라이언트 환율 곱셈 0.
 */

import type { CurrentFxApproxResponse } from "@aipo/sdk/current-fx";
import { quoteKrw } from "../../lib/current-fx-refresh";
import type { HomeReadModelResponse } from "@aipo/sdk/home-read-model";
import type { OpportunityFeedItem } from "@aipo/sdk/user-feed";
import type { WalletBucketsResponse } from "@aipo/sdk/wallet";
import {
  formatDurationMinutesFromSec,
  formatKrwApprox,
  formatRatePct,
  formatSignedUsdt,
  formatUsdtDisplay,
} from "./format";
import { SPARK_DASH_DESKTOP_VISUAL_FIXTURE } from "./visual-fixture";
import type { SparkDashHomeModel, SparkDashPopular } from "./types";

function asText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function asNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function partnerKind(partner: string | null): SparkDashPopular["partnerKind"] {
  const p = (partner ?? "").toLowerCase();
  if (p.includes("ebay")) return "ebay";
  if (p.includes("yahoo")) return "yahoo";
  if (p.includes("amazon")) return "amazon";
  return "plain";
}

/**
 * Home visual-zero adapter.
 * SDK ghost 금지. 레거시 키가 런타임 JSON에 남아 있으면 지금과 같은 fallback만 유지.
 * 시장 라벨로 partner를 바꾸지 않는다.
 */
type HomeFeedVisualCompat = {
  title?: unknown;
  partnerLabel?: unknown;
  partner?: unknown;
  officialPartner?: unknown;
};

function homeVisualCompat(item: OpportunityFeedItem): HomeFeedVisualCompat {
  return item as OpportunityFeedItem & HomeFeedVisualCompat;
}

function mapItem(item: OpportunityFeedItem, fx: CurrentFxApproxResponse | null = null): SparkDashPopular | null {
  const compat = homeVisualCompat(item);
  const id = asText(item.id);
  const title = asText(item.assetLabel) ?? asText(compat.title);
  if (!id || !title) return null;
  const partner =
    asText(compat.partnerLabel) ??
    asText(compat.partner) ??
    asText(compat.officialPartner);
  const sec = asNum(item.estimatedDurationSec);
  const quoted = quoteKrw(fx, `profit:${item.id}`);
  return {
    id,
    partner: partner ?? "공식 파트너",
    partnerKind: partnerKind(partner),
    title,
    ratePct: formatRatePct(asText(item.marginPct)),
    expectedProfitUsdt: formatSignedUsdt(asText(item.expectedProfitUsdt)),
    // KRW is displayable only when the current-fx endpoint supplies a
    // freshness-qualified quote. Do not resurrect the feed's older KRW
    // approximation after a refresh/API failure.
    expectedProfitKrw: quoted != null ? formatKrwApprox(quoted) : null,
    durationLabel: formatDurationMinutesFromSec(sec),
    capitalUsdt: formatUsdtDisplay(asText(item.requiredCapitalUsdt))
      ? `${formatUsdtDisplay(asText(item.requiredCapitalUsdt))} USDT`
      : null,
    capitalKrw: null,
    statusLabel: "조건 확인 후 참여 가능",
    href: `/profits/${id}`,
  };
}

export function emptyRuntimeModel(): SparkDashHomeModel {
  return {
    owner: "runtime",
    displayName: null,
    levelLabel: null,
    sidebarBalance: { usdt: null, krw: null },
    walletHeadline: { usdt: null, krw: null },
    walletRows: [
      { key: "available", label: "사용 가능", usdt: null, krw: null, tone: "green" },
      { key: "participating", label: "참여 중", usdt: null, krw: null, tone: "blue" },
      { key: "pending", label: "정산 대기", usdt: null, krw: null, tone: "amber" },
      { key: "withdrawable", label: "출금 가능", usdt: null, krw: null, tone: "purple" },
    ],
    hero: null,
    stats: [
      { key: "active", label: "참여 중 기회", value: null, usdt: null, krw: null, tone: "blue" },
      { key: "pending", label: "정산 대기", value: null, usdt: null, krw: null, tone: "purple" },
      { key: "month", label: "이번 달 수익", value: null, usdt: null, krw: null, tone: "green" },
      { key: "lifetime", label: "누적 수익", value: null, usdt: null, krw: null, tone: "red" },
    ],
    popular: [],
    nav: SPARK_DASH_DESKTOP_VISUAL_FIXTURE.nav,
  };
}

export function mapRuntimeHome(input: {
  home: HomeReadModelResponse | null;
  buckets: WalletBucketsResponse | null;
  fx: CurrentFxApproxResponse | null;
  items: OpportunityFeedItem[];
  displayName: string | null;
}): SparkDashHomeModel {
  const base = emptyRuntimeModel();
  const principal = formatUsdtDisplay(input.buckets?.principalUsdt ?? null);
  const locked = formatUsdtDisplay(input.buckets?.lockedUsdt ?? null);
  const profit = formatUsdtDisplay(input.buckets?.profitUsdt ?? null);
  const principalKrw = formatKrwApprox(input.fx?.principalKrwApprox ?? null);
  const profitKrw = formatKrwApprox(input.fx?.withdrawableProfitKrwApprox ?? null);

  const popular = input.items.map((item) => mapItem(item, input.fx)).filter((x): x is SparkDashPopular => x != null);
  const top = popular[0] ?? null;

  return {
    ...base,
    displayName: input.displayName,
    levelLabel: input.displayName ? "회원" : null,
    sidebarBalance: { usdt: principal, krw: principalKrw },
    walletHeadline: { usdt: principal, krw: principalKrw },
    walletRows: [
      {
        key: "available",
        label: "사용 가능",
        usdt: principal ? `${principal} USDT` : null,
        krw: principalKrw,
        tone: "green",
      },
      {
        key: "participating",
        label: "참여 중",
        usdt: locked ? `${locked} USDT` : null,
        krw: null,
        tone: "blue",
      },
      {
        key: "pending",
        label: "정산 대기",
        usdt: null,
        krw: null,
        tone: "amber",
      },
      {
        key: "withdrawable",
        label: "출금 가능",
        usdt: profit ? `${profit} USDT` : null,
        krw: profitKrw,
        tone: "purple",
      },
    ],
    hero: top
      ? {
          partner: top.partner,
          partnerKind: top.partnerKind,
          title: top.title,
          productMediaUrl: asText(input.items[0]?.assetImageUrl),
          productMediaAlt: top.title,
          ratePct: top.ratePct,
          expectedProfitUsdt: top.expectedProfitUsdt,
          expectedProfitKrw: top.expectedProfitKrw,
          durationLabel: top.durationLabel,
          capitalUsdt: formatUsdtDisplay(asText(input.items[0]?.requiredCapitalUsdt)),
          capitalKrw: null,
          statusLabel: "참여 가능",
          statusCopy: "조건을 확인한 뒤 참여할 수 있어요.",
          participateHref: top.href,
          detailHref: top.href,
        }
      : null,
    stats: base.stats,
    popular: popular.slice(0, 4),
  };
}
