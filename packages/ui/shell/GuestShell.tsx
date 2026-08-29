import type { ReactNode } from "react";
import { PutdukBrand } from "../brand/PutdukBrand";
import "./guest-shell.css";

export function GuestShell({ children }: { children: ReactNode }) {
  return (
    <div data-testid="guest-chrome" className="csp-auth-shell">
      <aside className="csp-auth-story" aria-hidden>
        <div className="csp-auth-brand">
          <PutdukBrand size="hero" />
        </div>
        <div className="csp-auth-copy">
          <h1>퍼뜩</h1>
          <p>AI가 전 세계 기회를 찾아 한눈에 보여드려요.</p>
        </div>
        <div className="csp-auth-art">
          <img src="/spark-dash/hero-lightning-outline.svg" alt="" />
        </div>
      </aside>
      <main className="csp-auth-main">
        <div className="csp-auth-panel">{children}</div>
      </main>
    </div>
  );
}
