"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchGrowthPublicSurface } from "@aipo/sdk/growth";
import {
  fetchHomeReadModel,
  type HomeReadModelResponse,
} from "@aipo/sdk/home-read-model";
import {
  fetchDayPulse,
  fetchOpportunityFeed,
  type OpportunityFeedResponse,
} from "@aipo/sdk/user-feed";
import {
  HomeCleanShell,
  HomeCleanView,
  createHomeCleanFixtureViewModel,
  type HomeCleanSessionStatus,
  type HomeCleanTabSource,
  type HomeCleanViewModel,
  type HomeCleanViewState,
} from "@aipo/ui/components/home-clean-v1";
import { mapHomeReadModelToCleanViewModel } from "./mapHomeReadModelToCleanViewModel";

export const HOME_CLEAN_PRODUCTION_FIXTURE_FORBIDDEN =
  "HOME_CLEAN_PRODUCTION_FIXTURE_FORBIDDEN" as const;

export type HomeCleanAdapterMode = "fixture" | "live";

export type HomeCleanDataAdapterProps = {
  mode: HomeCleanAdapterMode;
  tabs: readonly HomeCleanTabSource[];
  hasSession?: boolean;
  viewOverride?: HomeCleanViewState;
  sessionOverride?: HomeCleanSessionStatus;
};

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

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

function assertFixtureAllowed(mode: HomeCleanAdapterMode) {
  if (mode === "fixture" && isProductionRuntime()) {
    throw new Error(HOME_CLEAN_PRODUCTION_FIXTURE_FORBIDDEN);
  }
}

export function HomeCleanDataAdapter({
  mode,
  tabs,
  hasSession = false,
  viewOverride,
  sessionOverride,
}: HomeCleanDataAdapterProps) {
  assertFixtureAllowed(mode);

  if (mode === "fixture") {
    return (
      <FixtureAdapter
        tabs={tabs}
        viewOverride={viewOverride}
        sessionOverride={sessionOverride}
      />
    );
  }

  return (
    <LiveAdapter
      tabs={tabs}
      hasSession={hasSession}
      viewOverride={viewOverride}
      sessionOverride={sessionOverride}
    />
  );
}

function ShellWithView({
  tabs,
  model,
  onRetry,
}: {
  tabs: readonly HomeCleanTabSource[];
  model: HomeCleanViewModel;
  onRetry?: () => void;
}) {
  return (
    <HomeCleanShell
      tabs={tabs}
      viewer={model.viewer}
      viewState={model.viewState}
      sessionStatus={model.sessionStatus}
      mode={model.mode}
      inboxHref={model.cta.inbox}
      meHref={model.cta.me}
    >
      <HomeCleanView model={model} onRetry={onRetry} />
    </HomeCleanShell>
  );
}

function FixtureAdapter({
  tabs,
  viewOverride,
  sessionOverride,
}: {
  tabs: readonly HomeCleanTabSource[];
  viewOverride?: HomeCleanViewState;
  sessionOverride?: HomeCleanSessionStatus;
}) {
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => {
    setReloadKey((n) => n + 1);
  }, []);
  const model = useMemo(
    () =>
      createHomeCleanFixtureViewModel({
        viewState: viewOverride,
        sessionStatus: sessionOverride,
      }),
    [reloadKey, sessionOverride, viewOverride],
  );
  return <ShellWithView tabs={tabs} model={model} onRetry={retry} />;
}

function LiveAdapter({
  tabs,
  hasSession,
  viewOverride,
  sessionOverride,
}: {
  tabs: readonly HomeCleanTabSource[];
  hasSession: boolean;
  viewOverride?: HomeCleanViewState;
  sessionOverride?: HomeCleanSessionStatus;
}) {
  const [model, setModel] = useState<HomeCleanViewModel>(() =>
    mapHomeReadModelToCleanViewModel({
      viewState: hasSession ? "loading" : "unauthorized",
      sessionStatus: hasSession ? "authenticated" : "guest",
      home: null,
      feed: null,
      viewer: {},
    }),
  );
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setReloadKey((n) => n + 1);
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      const growthPromise = fetchGrowthPublicSurface({ signal: ac.signal });

      if (!hasSession) {
        await Promise.allSettled([growthPromise]);
        if (cancelled) return;
        setModel(
          mapHomeReadModelToCleanViewModel({
            viewState: viewOverride ?? "unauthorized",
            sessionStatus: sessionOverride ?? "guest",
            home: null,
            feed: null,
            viewer: {},
          }),
        );
        return;
      }

      const [homeResult, feedResult, pulseResult] = await Promise.allSettled([
        fetchHomeReadModel({ signal: ac.signal }),
        fetchOpportunityFeed({ signal: ac.signal }),
        fetchDayPulse({ signal: ac.signal }),
        growthPromise,
      ]);

      if (cancelled) return;

      const home: HomeReadModelResponse | null =
        homeResult.status === "fulfilled" ? homeResult.value : null;
      const feed: OpportunityFeedResponse | null =
        feedResult.status === "fulfilled" ? feedResult.value : null;

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
        setModel(
          mapHomeReadModelToCleanViewModel({
            viewState: viewOverride ?? "unauthorized",
            sessionStatus: sessionOverride ?? "expired",
            home,
            feed,
            viewer: {},
          }),
        );
        return;
      }

      setModel(
        mapHomeReadModelToCleanViewModel({
          viewState: viewOverride ?? home?.viewState ?? "recoverable_error",
          sessionStatus: sessionOverride ?? "authenticated",
          home,
          feed,
          viewer: {},
        }),
      );
    }

    void load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [hasSession, reloadKey, sessionOverride, viewOverride]);

  return <ShellWithView tabs={tabs} model={model} onRetry={retry} />;
}
