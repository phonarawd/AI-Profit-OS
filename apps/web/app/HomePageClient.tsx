"use client";

import { useEffect, useState } from "react";
import {
  fetchGrowthPublicSurface,
  type GrowthPublicSurfaceResponse,
} from "@aipo/sdk/growth";
import {
  fetchHomeReadModel,
  type HomeReadModelResponse,
  type HomeSessionStatus,
  type HomeViewState,
} from "@aipo/sdk/home-read-model";
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
} from "@aipo/ui/primitives";
import { type OpportunityCardModel } from "@aipo/ui/components/opportunity";
import { T } from "@aipo/ui/copy/ko";
import { toOpportunityCardModel } from "../lib/opportunity-card-map";

type SessionBannerKind = "guest" | "expired" | null;
export type HomeClientViewState = HomeViewState | "loading";

type HomePageTruth = {
  viewState: HomeClientViewState;
  sessionStatus: HomeSessionStatus;
  items: OpportunityCardModel[];
  principalUsdt: string | null;
  todayPossibleProfitUsdt: string | null;
  ledgerTotal: number | null;
  affordableCount: number | null;
  nearMissExtraCount: number | null;
  topSuggestDepositUsdt: string | null;
  pulse: DayPulseModel | null;
  tickerMode: GrowthPublicSurfaceResponse["tickerMode"];
  tickerEvents: PublicTickerEvent[];
  counterMode: HomePayoutCounterMode;
  sessionBanner: SessionBannerKind;
};

const GROWTH_HIDDEN = {
  tickerMode: "off" as const,
  tickerEvents: [] as PublicTickerEvent[],
  counterMode: "off" as HomePayoutCounterMode,
};

function isUnauthorizedError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.message.includes("opportunity_feed_401") ||
    err.message.includes("day_pulse_401") ||
    err.message.includes("home_read_model_401") ||
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

function itemsFromFeed(feed: OpportunityFeedResponse): OpportunityCardModel[] {
  return feed.items
    .map(toOpportunityCardModel)
    .filter((x): x is OpportunityCardModel => x != null);
}

function moneyStateAllowsValue(state: string): boolean {
  return state === "ready_data" || state === "ready_empty" || state === "stale";
}

function principalFromHome(home: HomeReadModelResponse): string | null {
  const money = home.money;
  if (!money || !moneyStateAllowsValue(money.state)) return null;
  if (typeof money.principalUsdt === "string" && money.principalUsdt.trim()) {
    return money.principalUsdt;
  }
  return null;
}

function applyGrowth(growth: GrowthPublicSurfaceResponse): Pick<
  HomePageTruth,
  "tickerMode" | "tickerEvents" | "counterMode"
> {
  return {
    tickerMode: growth.tickerMode,
    tickerEvents: growth.events as PublicTickerEvent[],
    counterMode: growth.counterMode as HomePayoutCounterMode,
  };
}

function unauthorizedTruth(input: {
  sessionStatus: HomeSessionStatus;
  sessionBanner: SessionBannerKind;
  growth?: GrowthPublicSurfaceResponse;
}): HomePageTruth {
  const g = input.growth ? applyGrowth(input.growth) : GROWTH_HIDDEN;
  return {
    viewState: "unauthorized",
    sessionStatus: input.sessionStatus,
    items: [],
    principalUsdt: null,
    todayPossibleProfitUsdt: null,
    ledgerTotal:
      input.growth && typeof input.growth.ledgerTotal === "number"
        ? input.growth.ledgerTotal
        : null,
    affordableCount: null,
    nearMissExtraCount: null,
    topSuggestDepositUsdt: null,
    pulse: null,
    tickerMode: g.tickerMode,
    tickerEvents: g.tickerEvents,
    counterMode: g.counterMode,
    sessionBanner: input.sessionBanner,
  };
}

function initialTruth(hasSession: boolean): HomePageTruth {
  return {
    viewState: "loading",
    sessionStatus: hasSession ? "authenticated" : "guest",
    items: [],
    principalUsdt: null,
    todayPossibleProfitUsdt: null,
    ledgerTotal: null,
    affordableCount: null,
    nearMissExtraCount: null,
    topSuggestDepositUsdt: null,
    pulse: null,
    ...GROWTH_HIDDEN,
    sessionBanner: hasSession ? null : "guest",
  };
}

export type HomePageClientProps = {
  /** cookies() session flag — skip auth fetches when false */
  hasSession?: boolean;
};

/**
 * PART9 data orchestration keep · presentation = HomeExperience
 * Home Fact authority = fetchHomeReadModel · no HomePageV2 · no client sum
 */
export function HomePageClient({ hasSession = false }: HomePageClientProps) {
  const [truth, setTruth] = useState<HomePageTruth>(() =>
    initialTruth(hasSession),
  );

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      const growthPromise = fetchGrowthPublicSurface({ signal: ac.signal });

      if (!hasSession) {
        const growthResult = await Promise.allSettled([growthPromise]);
        if (cancelled) return;
        setTruth(
          unauthorizedTruth({
            sessionStatus: "guest",
            sessionBanner: "guest",
            growth:
              growthResult[0].status === "fulfilled"
                ? growthResult[0].value
                : undefined,
          }),
        );
        return;
      }

      const [homeResult, feedResult, pulseResult, growthResult] =
        await Promise.allSettled([
          fetchHomeReadModel({ signal: ac.signal }),
          fetchOpportunityFeed({ signal: ac.signal }),
          fetchDayPulse({ signal: ac.signal }),
          growthPromise,
        ]);

      if (cancelled) return;

      const home =
        homeResult.status === "fulfilled" ? homeResult.value : null;
      const feed =
        feedResult.status === "fulfilled" ? feedResult.value : null;
      const pulse =
        pulseResult.status === "fulfilled"
          ? toDayPulseModel(pulseResult.value)
          : null;
      const growth =
        growthResult.status === "fulfilled" ? growthResult.value : undefined;

      const unauthorized =
        home?.viewState === "unauthorized" ||
        (home != null && home.session.status !== "authenticated") ||
        (homeResult.status === "rejected" &&
          isUnauthorizedError(homeResult.reason)) ||
        (feedResult.status === "rejected" &&
          isUnauthorizedError(feedResult.reason)) ||
        (pulseResult.status === "rejected" &&
          isUnauthorizedError(pulseResult.reason));

      if (unauthorized) {
        setTruth(
          unauthorizedTruth({
            sessionStatus: "expired",
            sessionBanner: "expired",
            growth,
          }),
        );
        return;
      }

      const g = growth ? applyGrowth(growth) : GROWTH_HIDDEN;
      const opportunity = home?.opportunity ?? null;
      const ledgerFromHome =
        home && typeof home.ledgerTotal === "number" ? home.ledgerTotal : null;
      const ledgerFromGrowth =
        growth && typeof growth.ledgerTotal === "number"
          ? growth.ledgerTotal
          : null;

      setTruth({
        viewState: home?.viewState ?? "recoverable_error",
        sessionStatus: "authenticated",
        items: feed ? itemsFromFeed(feed) : [],
        principalUsdt: home ? principalFromHome(home) : null,
        todayPossibleProfitUsdt:
          home && typeof home.todayPossibleProfitUsdt === "string"
            ? home.todayPossibleProfitUsdt
            : null,
        ledgerTotal: ledgerFromHome ?? ledgerFromGrowth,
        affordableCount:
          opportunity && typeof opportunity.affordableCount === "number"
            ? opportunity.affordableCount
            : null,
        nearMissExtraCount:
          opportunity && typeof opportunity.nearMissCount === "number"
            ? opportunity.nearMissCount
            : null,
        topSuggestDepositUsdt:
          opportunity && opportunity.topSuggestDepositUsdt != null
            ? opportunity.topSuggestDepositUsdt
            : null,
        pulse,
        tickerMode: g.tickerMode,
        tickerEvents: g.tickerEvents,
        counterMode: g.counterMode,
        sessionBanner: null,
      });
    }

    void load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [hasSession]);

  const totalResultValue =
    typeof truth.ledgerTotal === "number" && Number.isFinite(truth.ledgerTotal)
      ? `${truth.ledgerTotal}${T.ticker.settleCountSuffix}`
      : null;

  return (
    <main className="text-pd-text" data-testid="home-shell">
      <HomeExperience
        viewState={truth.viewState}
        sessionStatus={truth.sessionStatus}
        principalUsdt={truth.principalUsdt}
        todayPossibleProfitUsdt={truth.todayPossibleProfitUsdt}
        items={truth.items}
        affordableCount={truth.affordableCount}
        nearMissExtraCount={truth.nearMissExtraCount}
        topSuggestDepositUsdt={truth.topSuggestDepositUsdt}
        pulse={truth.pulse}
        tickerMode={truth.tickerMode}
        tickerEvents={truth.tickerEvents}
        counterMode={truth.counterMode}
        ledgerTotal={truth.ledgerTotal}
        totalResultValue={totalResultValue}
        sessionExpiredSlot={
          truth.sessionBanner ? (
            <HomeSessionBanner kind={truth.sessionBanner} />
          ) : null
        }
      />
    </main>
  );
}
