"use client";

import { useEffect, useState } from "react";
import {
  fetchGrowthPublicSurface,
  type GrowthPublicSurfaceResponse,
} from "@aipo/sdk/growth";
import {
  fetchDayPulse,
  fetchOpportunityFeed,
  type DayPulseResponse,
  type OpportunityFeedResponse,
} from "@aipo/sdk/user-feed";
import { type DayPulseModel } from "@aipo/ui/components/loop";
import {
  HomeExperience,
  HomeSessionBanner,
} from "@aipo/ui/components/home";
import {
  type HomePayoutCounterMode,
  type PublicTickerEvent,
} from "@aipo/ui/components/lux";
import { type OpportunityCardModel } from "@aipo/ui/components/opportunity";
import { toOpportunityCardModel } from "../lib/opportunity-card-map";

type HomeFeedState = {
  items: OpportunityCardModel[];
  principalUsdt: string;
  affordableCount?: number;
  nearMissExtraCount?: number;
  topSuggestDepositUsdt?: string | null;
};

type SessionBannerKind = "guest" | "expired" | null;

function isUnauthorizedError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.message.includes("opportunity_feed_401") ||
    err.message.includes("day_pulse_401") ||
    /_401\b/.test(err.message) ||
    /unauthorized/i.test(err.message)
  );
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

/** affordable expectedProfitUsdt 합 — Engine 필드 합산만 · 가격식 재발명 0 */
function sumAffordableExpectedProfitUsdt(
  items: OpportunityCardModel[],
): string {
  let sum = 0;
  for (const item of items) {
    if (item.bucket && item.bucket !== "affordable") continue;
    const n = Number(item.expectedProfitUsdt);
    if (Number.isFinite(n)) sum += n;
  }
  return sum.toFixed(2);
}

function feedToHomeState(feed: OpportunityFeedResponse): HomeFeedState {
  return {
    items: feed.items
      .map(toOpportunityCardModel)
      .filter((x): x is OpportunityCardModel => x != null),
    principalUsdt:
      typeof feed.principalUsdt === "string" && feed.principalUsdt.trim()
        ? feed.principalUsdt
        : "0",
    affordableCount: feed.affordableCount,
    nearMissExtraCount: feed.nearMissExtraCount,
    topSuggestDepositUsdt: feed.topSuggestDepositUsdt ?? null,
  };
}

export type HomePageClientProps = {
  /** 서버 cookies() 판정 · 없으면 auth feed/pulse 호출 스킵(401 콘솔 0) */
  hasSession?: boolean;
};

/**
 * PART9 data orchestration keep · presentation = HomeExperience (ADR-017 STEP4)
 * HomePageV2 금지 · SDK/Auth/Wallet 재작성 금지
 */
export function HomePageClient({ hasSession = false }: HomePageClientProps) {
  const [feed, setFeed] = useState<HomeFeedState>({
    items: [],
    principalUsdt: "0",
  });
  const [pulse, setPulse] = useState<DayPulseModel | null>(null);
  const [sessionBanner, setSessionBanner] = useState<SessionBannerKind>(
    hasSession ? null : "guest",
  );
  const [growth, setGrowth] = useState<GrowthPublicSurfaceResponse>({
    tickerMode: "off",
    counterMode: "off",
    ledgerTotal: 0,
    events: [],
    asOf: "",
  });

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      const growthPromise = fetchGrowthPublicSurface({ signal: ac.signal });

      if (!hasSession) {
        const growthResult = await Promise.allSettled([growthPromise]);
        if (cancelled) return;
        if (growthResult[0].status === "fulfilled") {
          setGrowth(growthResult[0].value);
        } else {
          setGrowth({
            tickerMode: "off",
            counterMode: "off",
            ledgerTotal: 0,
            events: [],
            asOf: "",
          });
        }
        setFeed({ items: [], principalUsdt: "0" });
        setPulse(null);
        setSessionBanner("guest");
        return;
      }

      const [feedResult, pulseResult, growthResult] = await Promise.allSettled([
        fetchOpportunityFeed({ signal: ac.signal }),
        fetchDayPulse({ signal: ac.signal }),
        growthPromise,
      ]);

      if (cancelled) return;

      let unauthorized = false;

      if (feedResult.status === "fulfilled") {
        setFeed(feedToHomeState(feedResult.value));
      } else if (isUnauthorizedError(feedResult.reason)) {
        unauthorized = true;
        setFeed({ items: [], principalUsdt: "0" });
      } else {
        setFeed({ items: [], principalUsdt: "0" });
      }

      if (pulseResult.status === "fulfilled") {
        setPulse(toDayPulseModel(pulseResult.value));
      } else if (isUnauthorizedError(pulseResult.reason)) {
        unauthorized = true;
        setPulse(null);
      } else {
        setPulse(null);
      }

      if (growthResult.status === "fulfilled") {
        setGrowth(growthResult.value);
      } else {
        setGrowth({
          tickerMode: "off",
          counterMode: "off",
          ledgerTotal: 0,
          events: [],
          asOf: "",
        });
      }

      setSessionBanner(unauthorized ? "expired" : null);
    }

    void load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [hasSession]);

  const tickerEvents = growth.events as PublicTickerEvent[];
  const counterMode = growth.counterMode as HomePayoutCounterMode;
  const todayPossibleProfitUsdt = sumAffordableExpectedProfitUsdt(feed.items);

  return (
    <main className="text-lux-text" data-testid="home-shell">
      <HomeExperience
        principalUsdt={feed.principalUsdt}
        todayPossibleProfitUsdt={todayPossibleProfitUsdt}
        items={feed.items}
        affordableCount={feed.affordableCount}
        nearMissExtraCount={feed.nearMissExtraCount}
        topSuggestDepositUsdt={feed.topSuggestDepositUsdt}
        pulse={pulse}
        tickerMode={growth.tickerMode}
        tickerEvents={tickerEvents}
        counterMode={counterMode}
        ledgerTotal={growth.ledgerTotal}
        totalResultValue={
          // C01 · ledgerTotal = settlement completed COUNT (currency suffix forbidden)
          growth.ledgerTotal > 0 ? `${growth.ledgerTotal}건` : null
        }
        sessionExpiredSlot={
          sessionBanner ? <HomeSessionBanner kind={sessionBanner} /> : null
        }
      />
    </main>
  );
}
