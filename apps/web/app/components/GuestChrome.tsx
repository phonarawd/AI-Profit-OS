import type { ReactNode } from "react";
import { T } from "@aipo/ui/copy/ko";
import { SD_ASSETS } from "../../components/spark-dash-home/assets";
import "./guest-spark.css";

export function GuestChrome({ children }: { children: ReactNode }) {
  return (
    <div data-testid="guest-chrome" className="csp-auth-shell">
      <aside className="csp-auth-story" aria-hidden>
        <div className="csp-auth-brand">
          <span>{T.brand.consumer}</span>
          <img src={SD_ASSETS.brandSpark} alt="" />
        </div>
        <div className="csp-auth-copy">
          <p className="csp-auth-kicker">{T.landing.guestChromeKicker}</p>
          <h1>
            {T.landing.guestChromeHeadlineA}
            <br />
            {T.landing.guestChromeHeadlineB}
          </h1>
          <p>{T.landing.guestChromeBody}</p>
        </div>
        <div className="csp-auth-art">
          <img src={SD_ASSETS.heroLightningOutline} alt="" />
        </div>
      </aside>
      <main className="csp-auth-main">
        <div className="csp-auth-panel">{children}</div>
      </main>
    </div>
  );
}
