"use client";

import { fetchCurrentFxApprox } from "@aipo/sdk/current-fx";
import { fetchHomeReadModel } from "@aipo/sdk/home-read-model";
import { fetchOpportunityFeed } from "@aipo/sdk/user-feed";
import { fetchWalletBuckets } from "@aipo/sdk/wallet";
import { useEffect, useState } from "react";
import { HomeDesktop } from "../components/spark-dash-home/HomeDesktop";
import { HomeMobile } from "../components/spark-dash-home/HomeMobile";
import { emptyRuntimeModel, mapRuntimeHome } from "../components/spark-dash-home/map-runtime";
import type { SparkDashHomeModel } from "../components/spark-dash-home/types";

export function HomeDesktopClient() {
  const [model, setModel] = useState<SparkDashHomeModel>(emptyRuntimeModel);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const home = await fetchHomeReadModel({ signal: ac.signal });
        if (home.viewState === "unauthorized" || home.session.status !== "authenticated") {
          setModel(emptyRuntimeModel());
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
      } catch {
        if (!ac.signal.aborted) setModel(emptyRuntimeModel());
      }
    })();
    return () => ac.abort();
  }, []);

  return (
    <>
      <div className="sd-desktop-only">
        <HomeDesktop model={model} />
      </div>
      <div className="sd-mobile-placeholder">
        <HomeMobile model={model} />
      </div>
    </>
  );
}
