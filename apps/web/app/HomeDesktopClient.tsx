"use client";

import { fetchCurrentFxApprox } from "@aipo/sdk/current-fx";
import { fetchHomeReadModel } from "@aipo/sdk/home-read-model";
import { fetchOpportunityFeed } from "@aipo/sdk/user-feed";
import { fetchWalletBuckets } from "@aipo/sdk/wallet";
import { useEffect, useState } from "react";
import { GuestFirstVisit, HomeSessionUnavailable } from "./GuestFirstVisit";
import { HomeDesktop } from "../components/spark-dash-home/HomeDesktop";
import { HomeMobile } from "../components/spark-dash-home/HomeMobile";
import { emptyRuntimeModel, mapRuntimeHome } from "../components/spark-dash-home/map-runtime";
import type { SparkDashHomeModel } from "../components/spark-dash-home/types";

type SessionGate = "loading" | "guest" | "member" | "unavailable";

export function HomeDesktopClient() {
  const [model, setModel] = useState<SparkDashHomeModel>(emptyRuntimeModel);
  const [gate, setGate] = useState<SessionGate>("loading");

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
        const fx = buckets
          ? await fetchCurrentFxApprox(
              {
                principalUsdt: buckets.principalUsdt,
                withdrawableProfitUsdt: buckets.profitUsdt,
                expectedProfitUsdt: home.todayPossibleProfitUsdt,
              },
              { signal: ac.signal },
            ).catch(() => null)
          : null;
        setModel(
          mapRuntimeHome({
            home,
            buckets,
            fx,
            items: feed?.items ?? [],
            displayName: null,
          }),
        );
        setGate("member");
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
