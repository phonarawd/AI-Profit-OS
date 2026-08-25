"use client";

import { fetchHomeReadModel } from "@aipo/sdk/home-read-model";
import { fetchOpportunityFeed } from "@aipo/sdk/user-feed";
import { fetchWalletBuckets } from "@aipo/sdk/wallet";
import { useEffect, useRef, useState } from "react";
import { fxRequestFromWallet } from "../lib/current-fx-refresh";
import { startFxBackgroundRefresh } from "../lib/start-fx-background-refresh";
import { GuestFirstVisit, HomeSessionUnavailable } from "./GuestFirstVisit";
import { HomeDesktop } from "../components/spark-dash-home/HomeDesktop";
import { HomeMobile } from "../components/spark-dash-home/HomeMobile";
import { emptyRuntimeModel, mapRuntimeHome } from "../components/spark-dash-home/map-runtime";
import type { SparkDashHomeModel } from "../components/spark-dash-home/types";

type SessionGate = "loading" | "guest" | "member" | "unavailable";

export function HomeDesktopClient() {
  const [model, setModel] = useState<SparkDashHomeModel>(emptyRuntimeModel);
  const [gate, setGate] = useState<SessionGate>("loading");
  const payloadRef = useRef<{
    home: Awaited<ReturnType<typeof fetchHomeReadModel>>;
    buckets: Awaited<ReturnType<typeof fetchWalletBuckets>> | null;
    items: NonNullable<Awaited<ReturnType<typeof fetchOpportunityFeed>>>["items"];
  } | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const home = await fetchHomeReadModel({ signal: ac.signal });
        if (home.viewState === "unauthorized" || home.session.status !== "authenticated") {
          setModel(emptyRuntimeModel());
          setGate("guest");
          return;
        }
        const [buckets, feed] = await Promise.all([
          fetchWalletBuckets({ signal: ac.signal }).catch(() => null),
          fetchOpportunityFeed({ signal: ac.signal }).catch(() => null),
        ]);
        const items = feed?.items ?? [];
        payloadRef.current = { home, buckets, items };
        setModel(
          mapRuntimeHome({
            home,
            buckets,
            fx: null,
            items,
            displayName: null,
          }),
        );
        setGate("member");
        startFxBackgroundRefresh(
          () => {
            const p = payloadRef.current;
            if (!p?.buckets) return null;
            return fxRequestFromWallet({
              principalUsdt: p.buckets.principalUsdt,
              profitUsdt: p.buckets.profitUsdt,
              expectedProfitUsdt: p.home.todayPossibleProfitUsdt,
              items: p.items,
            });
          },
          (nextFx) => {
            const p = payloadRef.current;
            if (!p) return;
            setModel(
              mapRuntimeHome({
                home: p.home,
                buckets: p.buckets,
                fx: nextFx,
                items: p.items,
                displayName: null,
              }),
            );
          },
          ac.signal,
        );
      } catch {
        if (!ac.signal.aborted) {
          setModel(emptyRuntimeModel());
          setGate("unavailable");
        }
      }
    })();
    return () => ac.abort();
  }, []);

  if (gate === "loading") {
    return (
      <div data-testid="home-session-loading" className="gfv gfv--plain">
        <div className="gfv-stage gfv-stage--narrow">
          <p className="gfv-lead">불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (gate === "unavailable") {
    return <HomeSessionUnavailable />;
  }

  if (gate === "guest") {
    return <GuestFirstVisit />;
  }

  return (
    <div data-testid="home-authenticated">
      <div className="sd-desktop-only" data-testid="home-desktop-shell">
        <HomeDesktop model={model} />
      </div>
      <div className="sd-mobile-placeholder" data-testid="home-mobile-shell">
        <HomeMobile model={model} />
      </div>
    </div>
  );
}
