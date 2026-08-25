"use client";

import { fetchHomeReadModel } from "@aipo/sdk/home-read-model";
import {
  fetchOpportunityFeed,
  isOpportunityFeedError,
} from "@aipo/sdk/user-feed";
import { fetchWalletBuckets } from "@aipo/sdk/wallet";
import { useEffect, useRef, useState } from "react";
import { fxRequestFromWallet } from "../lib/current-fx-refresh";
import { startFxBackgroundRefresh } from "../lib/start-fx-background-refresh";
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
  const payloadRef = useRef<{
    buckets: Awaited<ReturnType<typeof fetchWalletBuckets>> | null;
    items: Awaited<ReturnType<typeof fetchOpportunityFeed>>["items"];
    expectedProfitUsdt: string | null;
  } | null>(null);

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

      const items0 = feedOutcome.ok ? feedOutcome.feed.items : [];
      payloadRef.current = {
        buckets,
        items: items0,
        expectedProfitUsdt: home?.todayPossibleProfitUsdt ?? null,
      };

      if (!feedOutcome.ok) {
        const viewState = viewStateFromFeedError(feedOutcome.err);
        if (!viewState) return;
        setModel(
          mapRuntimeProfits({
            buckets,
            fx: null,
            items: [],
            displayName: null,
            viewState,
          }),
        );
        return;
      }

      const items = feedOutcome.feed.items;
      const viewState: ProfitsViewState = items.length >= 1 ? "READY" : "EMPTY";
      payloadRef.current = {
        buckets,
        items,
        expectedProfitUsdt: home?.todayPossibleProfitUsdt ?? null,
      };
      setModel(
        mapRuntimeProfits({
          buckets,
          fx: null,
          items,
          displayName: null,
          viewState,
        }),
      );
      startFxBackgroundRefresh(
        () => {
          const p = payloadRef.current;
          if (!p?.buckets) return null;
          return fxRequestFromWallet({
            principalUsdt: p.buckets.principalUsdt,
            profitUsdt: p.buckets.profitUsdt,
            expectedProfitUsdt: p.expectedProfitUsdt,
            items: p.items,
          });
        },
        (nextFx) => {
          const p = payloadRef.current;
          if (!p) return;
          setModel(
            mapRuntimeProfits({
              buckets: p.buckets,
              fx: nextFx,
              items: p.items,
              displayName: null,
              viewState,
            }),
          );
        },
        ac.signal,
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
