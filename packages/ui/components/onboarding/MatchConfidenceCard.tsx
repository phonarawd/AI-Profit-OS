"use client";

import { useEffect, useState } from "react";
import { T } from "../../copy/ko";

/** 같은 상품 연결 체험. 실시간 매칭 점수가 아님. */
export function MatchConfidenceCard() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setOn(true);
      return;
    }
    const id = window.setTimeout(() => setOn(true), 240);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <section
      className="acq-demo-panel"
      data-testid="onboarding-match-card"
      data-demo="체험"
    >
      <p className="acq-demo-label">{T.onboarding.demoLabel}</p>
      <div className="mt-3 flex items-center justify-center gap-3">
        <span className={`acq-pulse ${on ? "is-on" : ""}`} aria-hidden />
        <div className={`acq-connect ${on ? "is-on" : ""}`} aria-hidden />
        <span className={`acq-pulse ${on ? "is-on" : ""}`} aria-hidden />
      </div>
      <h2 className="mt-3 text-center text-base font-semibold">
        {T.onboarding.matchTitle}
      </h2>
      <p className="mt-1 text-center text-sm text-lux-text-muted">
        {T.onboarding.matchHint}
      </p>
    </section>
  );
}
