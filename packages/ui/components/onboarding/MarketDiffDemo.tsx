"use client";

import { useEffect, useState } from "react";
import { T } from "../../copy/ko";

/**
 * 가격 비교 체험 — 예시 숫자만. 실시간 시세/수익 아님.
 */
export function MarketDiffDemo() {
  const [phase, setPhase] = useState<"idle" | "scan" | "shown">("idle");

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase("shown");
      return;
    }
    const a = window.setTimeout(() => setPhase("scan"), 160);
    const b = window.setTimeout(() => setPhase("shown"), 820);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  return (
    <section
      className="acq-demo-panel"
      data-testid="onboarding-market-diff"
      data-demo="체험"
    >
      {phase === "scan" ? <span className="acq-scan is-on" aria-hidden /> : null}
      <p className="acq-demo-label">{T.onboarding.demoLabel}</p>
      <h2 className="mt-2 text-center text-base font-semibold text-pd-text">
        {T.onboarding.marketDiffTitle}
      </h2>
      <div className="acq-markets">
        <article className={`acq-market ${phase !== "idle" ? "is-in" : ""}`}>
          <p className="text-xs text-pd-text-muted">{T.onboarding.marketA}</p>
          <p className="mt-1 text-lg font-semibold">120</p>
        </article>
        <article
          className={`acq-market ${phase === "shown" ? "is-in" : ""}`}
          style={{ animationDelay: "80ms" }}
        >
          <p className="text-xs text-pd-text-muted">{T.onboarding.marketB}</p>
          <p className="mt-1 text-lg font-semibold">135</p>
        </article>
      </div>
      <p className="mt-3 text-center text-xs text-pd-text-muted">
        {T.onboarding.marketDiffHint}
      </p>
      <p className="mt-1 text-center text-xs text-pd-text-muted">
        {T.onboarding.demoNotLive}
      </p>
    </section>
  );
}
