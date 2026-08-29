"use client";

import { T } from "../../copy/ko";
import type {
  CapitalBandId,
  CapitalBandJourneyModel,
} from "./trust-types";

export type CapitalBandJourneyProps = {
  data?: CapitalBandJourneyModel | null;
  className?: string;
};

const BAND_ORDER: CapitalBandId[] = [
  "micro",
  "small",
  "mid",
  "high",
  "whale",
];

/**
 * §51.18 Capital Band Journey — settlement 횟수 + 잔액
 * deposit-only paywall 금지 · membership §51.18a와 병행
 */
export function CapitalBandJourney({
  data = null,
  className = "",
}: CapitalBandJourneyProps) {
  const current = data?.current ?? "micro";
  const c = T.trust.journey;
  const labels = c.bands;

  return (
    <section
      data-testid="capital-band-journey"
      data-canon-block="capitalBandJourney"
      data-current-band={current}
      data-deposit-only-paywall="false"
      className={`rounded-pd-md border border-pd-border p-3 text-sm text-pd-text ${className}`.trim()}
    >
      <h2 className="font-semibold">{c.title}</h2>
      <p className="mt-1 text-pd-text-muted">{c.lead}</p>
      <ol className="mt-3 space-y-2">
        {BAND_ORDER.map((band) => {
          const unlocked =
            BAND_ORDER.indexOf(band) <= BAND_ORDER.indexOf(current);
          return (
            <li
              key={band}
              data-band={band}
              data-unlocked={unlocked ? "1" : "0"}
              className="flex items-start justify-between gap-2"
            >
              <span>
                <span className="font-medium text-pd-text">
                  {labels[band]}
                </span>
                <span className="mt-0.5 block text-xs text-pd-text-muted">
                  {c.unlock[band]}
                </span>
              </span>
              <span
                className={
                  unlocked ? "text-pd-accent" : "text-pd-text-muted"
                }
              >
                {unlocked ? c.unlocked : c.locked}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-pd-text-muted">{c.progressNote}</p>
    </section>
  );
}
