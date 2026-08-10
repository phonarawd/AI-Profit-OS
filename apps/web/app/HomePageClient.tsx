"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchDayPulse,
  fetchOpportunityFeed,
  type DayPulseResponse,
  type OpportunityFeedItem,
  type OpportunityFeedResponse,
} from "@aipo/sdk/user-feed";
import { DayPulse, type DayPulseModel } from "@aipo/ui/components/loop";
import {
  BalanceAwareHome,
  type OpportunityCardModel,
} from "@aipo/ui/components/opportunity";
import {
  HomePayoutCounter,
  LivePayoutTicker,
} from "@aipo/ui/components/lux";
import { T } from "@aipo/ui/copy/ko";

type HomeFeedState = {
  items: OpportunityCardModel[];
  affordableCount?: number;
  nearMissExtraCount?: number;
  topSuggestDepositUsdt?: string | null;
};

function isUnauthorizedError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.message.includes("opportunity_feed_401") ||
    err.message.includes("day_pulse_401") ||
    /_401\b/.test(err.message) ||
    /unauthorized/i.test(err.message)
  );
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asBucket(
  v: unknown,
): OpportunityCardModel["bucket"] | undefined {
  if (v === "affordable" || v === "nearMiss" || v === "lockedHigh") return v;
  return undefined;
}

/** Nest listFeed card → BalanceAwareHome 카드 (필드 pass-through · 재계산 0) */
function toCardModel(item: OpportunityFeedItem): OpportunityCardModel | null {
  const id = asString(item.id);
  if (!id) return null;
  const assetLabel = asString(item.assetLabel);
  return {
    id,
    arbitrageTypeKo: asString(item.arbitrageTypeKo),
    buyMarketLabelKo: asString(item.buyMarketLabelKo) || undefined,
    sellMarketLabelKo: asString(item.sellMarketLabelKo) || undefined,
    buyMarketId: asString(item.buyMarketId) || undefined,
    sellMarketId: asString(item.sellMarketId) || undefined,
    assetLabel,
    assetImageUrl:
      typeof item.assetImageUrl === "string" || item.assetImageUrl === null
        ? (item.assetImageUrl as string | null)
        : undefined,
    assetImageAltKo: asString(item.assetImageAltKo, assetLabel),
    assetImageSource:
      typeof item.assetImageSource === "string" ||
      item.assetImageSource === null
        ? (item.assetImageSource as string | null)
        : undefined,
    assetIcon:
      typeof item.assetIcon === "string" || item.assetIcon === null
        ? (item.assetIcon as string | null)
        : undefined,
    category: asString(item.category, "watch"),
    requiredCapitalUsdt: asString(item.requiredCapitalUsdt, "0"),
    expectedProfitUsdt: asString(item.expectedProfitUsdt, "0"),
    aiConfidenceScore: asNumber(item.aiConfidenceScore, 0),
    buyPriceUsdt:
      typeof item.buyPriceUsdt === "string" || item.buyPriceUsdt === null
        ? (item.buyPriceUsdt as string | null)
        : undefined,
    sellPriceUsdt:
      typeof item.sellPriceUsdt === "string" || item.sellPriceUsdt === null
        ? (item.sellPriceUsdt as string | null)
        : undefined,
    platformMarginUsdt:
      typeof item.platformMarginUsdt === "string" ||
      item.platformMarginUsdt === null
        ? (item.platformMarginUsdt as string | null)
        : undefined,
    compareReady:
      typeof item.compareReady === "boolean" ? item.compareReady : undefined,
    sellSuccessRate:
      typeof item.sellSuccessRate === "number"
        ? item.sellSuccessRate
        : undefined,
    sellSuccessWindowDays:
      typeof item.sellSuccessWindowDays === "number"
        ? item.sellSuccessWindowDays
        : undefined,
    tags: Array.isArray(item.tags)
      ? item.tags.filter((t): t is string => typeof t === "string")
      : undefined,
    bucket: asBucket(item.bucket),
    suggestDepositUsdt:
      typeof item.suggestDepositUsdt === "string" ||
      item.suggestDepositUsdt === null
        ? (item.suggestDepositUsdt as string | null)
        : undefined,
    staleAt:
      typeof item.staleAt === "string" || item.staleAt === null
        ? (item.staleAt as string | null)
        : undefined,
    lastAdapterSyncAt:
      typeof item.lastAdapterSyncAt === "string" ||
      item.lastAdapterSyncAt === null
        ? (item.lastAdapterSyncAt as string | null)
        : undefined,
    sourceCount:
      typeof item.sourceCount === "number" ? item.sourceCount : undefined,
    ctaLockReasonKo:
      typeof item.ctaLockReasonKo === "string" || item.ctaLockReasonKo === null
        ? (item.ctaLockReasonKo as string | null)
        : undefined,
  };
}

function toDayPulseModel(res: DayPulseResponse): DayPulseModel {
  return {
    asOf: res.asOf,
    tz: "Asia/Seoul",
    source: "live",
    g4Merge: false,
    platformSafeStopToday: res.platformSafeStopToday,
    settlementCompletedToday: res.settlementCompletedToday,
    scope: "platform",
    presence: {
      enabled: res.presence?.enabled === true,
      liveSessionCount:
        typeof res.presence?.liveSessionCount === "number"
          ? res.presence.liveSessionCount
          : null,
    },
  };
}

function feedToHomeState(feed: OpportunityFeedResponse): HomeFeedState {
  return {
    items: feed.items
      .map(toCardModel)
      .filter((x): x is OpportunityCardModel => x != null),
    affordableCount: feed.affordableCount,
    nearMissExtraCount: feed.nearMissExtraCount,
    topSuggestDepositUsdt: feed.topSuggestDepositUsdt ?? null,
  };
}

/**
 * PART9c — 홈 live feed + DayPulse
 * SDK=@aipo/sdk/user-feed · 401 graceful · ticker/counter mode=off(9h Owns)
 */
export function HomePageClient() {
  const [feed, setFeed] = useState<HomeFeedState>({ items: [] });
  const [pulse, setPulse] = useState<DayPulseModel | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      const [feedResult, pulseResult] = await Promise.allSettled([
        fetchOpportunityFeed({ signal: ac.signal }),
        fetchDayPulse({ signal: ac.signal }),
      ]);

      if (cancelled) return;

      let unauthorized = false;

      if (feedResult.status === "fulfilled") {
        setFeed(feedToHomeState(feedResult.value));
      } else if (isUnauthorizedError(feedResult.reason)) {
        unauthorized = true;
        setFeed({ items: [] });
      } else {
        setFeed({ items: [] });
      }

      if (pulseResult.status === "fulfilled") {
        setPulse(toDayPulseModel(pulseResult.value));
      } else if (isUnauthorizedError(pulseResult.reason)) {
        unauthorized = true;
        setPulse(null);
      } else {
        setPulse(null);
      }

      setSessionExpired(unauthorized);
    }

    void load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  return (
    <main className="text-lux-text" data-testid="home-shell">
      <div data-home-slot="ticker" data-canon-block="tickerSlot">
        <LivePayoutTicker mode="off" events={[]} maxItems={50} />
      </div>
      <div data-home-slot="day-pulse" data-canon-block="dayPulseSlot">
        <DayPulse data={pulse} />
      </div>
      <div data-home-slot="counter" data-canon-block="counterSlot">
        <HomePayoutCounter mode="off" ledgerTotal={0} />
      </div>
      {sessionExpired ? (
        <p
          className="px-4 py-2 text-sm text-lux-text-muted"
          role="status"
          data-testid="home-session-expired"
        >
          <Link href="/auth/login" className="text-lux-accent underline">
            {T.toast.SESSION_EXPIRED}
          </Link>
        </p>
      ) : null}
      <BalanceAwareHome
        items={feed.items}
        affordableCount={feed.affordableCount}
        nearMissExtraCount={feed.nearMissExtraCount}
        topSuggestDepositUsdt={feed.topSuggestDepositUsdt}
        asSection
      />
    </main>
  );
}
