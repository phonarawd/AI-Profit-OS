import type { ReactNode } from "react";
import { SD_ASSETS } from "../../components/spark-dash-home/assets";

export function GuestChrome({ children }: { children: ReactNode }) {
  return (
    <div data-testid="guest-chrome" className="csp-auth-shell">
      <aside className="csp-auth-story" aria-hidden>
        <div className="csp-auth-brand">
          <span>퍼뜩</span>
          <img src={SD_ASSETS.brandSpark} alt="" />
        </div>
        <div className="csp-auth-copy">
          <p className="csp-auth-kicker">GLOBAL OPPORTUNITY PLATFORM</p>
          <h1>AI가 전 세계 기회를 찾아<br />한눈에 보여드려요.</h1>
          <p>같은 상품을 연결하고, 필요한 원금과 예상 수익을 이해하기 쉽게 정리합니다.</p>
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
