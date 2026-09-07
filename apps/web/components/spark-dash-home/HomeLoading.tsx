"use client";

import { T } from "@aipo/ui/copy/ko";
import { HomeLoadingDesktop } from "./HomeLoadingDesktop";
import { LoadingMobile } from "./loading-mobile";
import { emptyRuntimeModel } from "./map-runtime";
import "./spark-dash-home.css";
import "./spark-dash-home-loading.css";
import "./spark-dash-mobile.css";

export function HomeLoading() {
  const model = emptyRuntimeModel();
  return (
    <div
      data-testid="home-session-loading"
      data-home-loading="1"
      data-canon="home-session-loading"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sd-skel-sr">{T.home.header.scanIdle}</span>
      <div className="sd-desktop-only" data-testid="home-desktop-shell">
        <HomeLoadingDesktop model={model} />
      </div>
      <div className="sd-mobile-placeholder" data-testid="home-mobile-shell">
        <LoadingMobile model={model} />
      </div>
    </div>
  );
}
