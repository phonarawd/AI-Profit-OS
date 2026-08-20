"use client";

import { fetchCurrentFxApprox } from "@aipo/sdk/current-fx";
import { fetchHomeReadModel } from "@aipo/sdk/home-read-model";
import {
  fetchOpportunityFeed,
  isOpportunityFeedError,
} from "@aipo/sdk/user-feed";
import { fetchWalletBuckets } from "@aipo/sdk/wallet";
import { useEffect, useState } from "react";
import { ProfitsDesktop } from "../components/spark-dash-profits/ProfitsDesktop";
import { ProfitsMobile } from "../components/spark-dash-profits/ProfitsMobile";
import {
  emptyProfitsRuntimeModel,
  mapRuntimeProfits,
} from "../components/spark-dash-profits/map-runtime";
import type {
  ProfitsDesktopModel,
  ProfitsViewState,
} from "../components/spark-dash-profits/types";

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

function viewStateFromFeedError(err: unknown): ProfitsViewState | null {
  if (isAbortError(err)) return null;
  if (isOpportunityFeedError(err) && err.status === 401) return "UNAUTHORIZED";
  return "ERROR";
}

/**
 * /profits = real runtime only.
 * viewState owner = opportunity feed.
 * visual fixture 자동 치환 금지 · fixture는 /dev/spark-dash-profits 만.
 */
export function ProfitsDesktopClient() {
  const [model, setModel] = useState<ProfitsDesktopModel>(
    emptyProfitsRuntimeModel("LOADING"),
  );

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      const [home, buckets, feedOutcome] = await Promise.all([
        fetchHomeReadModel({ signal: ac.signal }).catch(() => null),
        fetchWalletBuckets({ signal: ac.signal }).catch(() => null),
        fetchOpportunityFeed({ signal: ac.signal }).then(
          (feed) => ({ ok: true as const, feed }),
          (err: unknown) => ({ ok: false as const, err }),
        ),
      ]);
      if (ac.signal.aborted) return;

      const fx = buckets
        ? await fetchCurrentFxApprox(
            {
              principalUsdt: buckets.principalUsdt,
              withdrawableProfitUsdt: buckets.profitUsdt,
              expectedProfitUsdt: home?.todayPossibleProfitUsdt ?? null,
            },
            { signal: ac.signal },
          ).catch(() => null)
        : null;
      if (ac.signal.aborted) return;

      if (!feedOutcome.ok) {
        const viewState = viewStateFromFeedError(feedOutcome.err);
        if (!viewState) return;
        setModel(
          mapRuntimeProfits({
            buckets,
            fx,
            items: [],
            displayName: null,
            viewState,
          }),
        );
        return;
      }

      const items = feedOutcome.feed.items;
      setModel(
        mapRuntimeProfits({
          buckets,
          fx,
          items,
          displayName: null,
          viewState: items.length >= 1 ? "READY" : "EMPTY",
        }),
      );
    })();
    return () => ac.abort();
  }, []);

  return (
    <div data-testid="profits-shell" data-profits-state={model.viewState}>
      <div className="sd-desktop-only" data-testid="profits-desktop-shell">
        <ProfitsDesktop model={model} />
      </div>
      <div className="sd-mobile-placeholder" data-testid="profits-mobile-shell">
        <ProfitsMobile model={model} />
      </div>
    </div>
  );
}
