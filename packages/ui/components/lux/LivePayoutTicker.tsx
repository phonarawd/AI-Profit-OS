"use client";

import { T } from "../../copy/ko";

/** Admin §35.4 / schemas/public-ticker-event.v1 — client receives masked only */
export type PublicTickerEvent = {
  id: string;
  displayLabel: string;
  amountKrwText: string;
  templateKey: "just_settled" | "just_reflected" | "participant_amt";
  at: string;
};

export type LivePayoutTickerProps = {
  mode: "off" | "live" | "demo" | "hybrid";
  events: PublicTickerEvent[];
  maxItems?: 50 | number;
};

const TEMPLATE_KEY: Record<
  PublicTickerEvent["templateKey"],
  keyof typeof T.ticker
> = {
  just_settled: "justSettled",
  just_reflected: "justReflected",
  participant_amt: "participantAmt",
};

function isSafeLabel(label: string): boolean {
  if (!label || label.includes("@")) return false;
  if (/userId|email|legalName/i.test(label)) return false;
  return true;
}

function formatLine(ev: PublicTickerEvent): string | null {
  if (!isSafeLabel(ev.displayLabel)) return null;
  const key = TEMPLATE_KEY[ev.templateKey];
  if (!key) return null;
  const tpl = T.ticker[key];
  if (typeof tpl !== "string") return null;
  let line = tpl
    .replaceAll("{name}", ev.displayLabel)
    .replaceAll("{amount}", ev.amountKrwText);
  for (const bad of T.ticker.forbiddenPhrases) {
    if (line.includes(bad)) return null;
  }
  return line;
}

/**
 * LivePayoutTicker — §33.2a home [A] only.
 * DayPulse merge 0 · kind/demo flag never rendered · PII0
 */
export function LivePayoutTicker({
  mode,
  events,
  maxItems = 50,
}: LivePayoutTickerProps) {
  if (mode === "off") return null;

  const lines = events
    .slice(0, Math.min(50, maxItems))
    .map((ev) => ({ id: ev.id, text: formatLine(ev) }))
    .filter((x): x is { id: string; text: string } => Boolean(x.text));

  if (lines.length === 0) return null;

  return (
    <section
      data-testid="live-payout-ticker"
      data-ticker-mode={mode}
      data-day-pulse-merge="false"
      aria-label={T.ticker.regionAria}
      className="overflow-hidden border-b border-lux-border bg-lux-surface px-3 py-2"
    >
      <ul className="flex max-h-24 flex-col gap-1 overflow-y-auto text-sm text-lux-text-muted">
        {lines.map((row) => (
          <li
            key={row.id}
            data-testid="ticker-row"
            className="truncate lux-motion-any"
          >
            {row.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
