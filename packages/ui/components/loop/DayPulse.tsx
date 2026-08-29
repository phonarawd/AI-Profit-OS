"use client";

import { T } from "../../copy/ko";
import type { DayPulseModel } from "./loop-types";

export type DayPulseProps = {
  data?: DayPulseModel | null;
  className?: string;
};

/**
 * Home [A2] DayPulse — §51.24.1
 * live 집계만 · G4 ticker/counter 슬롯·수치 merge 0 · Admin 편집 0
 */
export function DayPulse({ data = null, className = "" }: DayPulseProps) {
  const safeStop = data?.platformSafeStopToday ?? 0;
  const settled = data?.settlementCompletedToday ?? 0;
  const empty = safeStop === 0 && settled === 0;
  const presenceOn =
    data?.presence?.enabled === true &&
    data.presence.liveSessionCount != null &&
    data.presence.liveSessionCount > 0;

  return (
    <section
      data-testid="day-pulse"
      data-canon="day-pulse"
      data-home-slot="day-pulse"
      data-source="live"
      data-g4-merge="false"
      data-admin-edit="false"
      data-presence-default="off"
      data-engine-pointer={T.loop.enginePointer}
      data-admin-pointer={T.loop.adminPointer}
      aria-label={T.loop.dayPulseAria}
      className={`border-b border-pd-border bg-pd-surface px-3 py-2 text-sm text-pd-text ${className}`.trim()}
    >
      <p className="font-medium text-pd-text">{T.loop.dayPulseTitle}</p>
      {empty ? (
        <p
          data-testid="day-pulse-empty"
          className="mt-1 text-pd-text-muted"
        >
          {T.loop.emptyToday}
        </p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-pd-text-muted">
          {safeStop > 0 ? (
            <li data-testid="day-pulse-safe-stop" data-field="platformSafeStopToday">
              {T.loop.safeStopToday.replace("{n}", String(safeStop))}
              <span className="ml-1 text-xs">{T.loop.safeStopTrustHint}</span>
            </li>
          ) : null}
          {settled > 0 ? (
            <li
              data-testid="day-pulse-settlement"
              data-field="settlementCompletedToday"
            >
              {T.loop.settlementToday.replace("{n}", String(settled))}
            </li>
          ) : null}
        </ul>
      )}
      {presenceOn ? (
        <p
          data-testid="day-pulse-presence"
          data-presence-live="true"
          className="mt-1 text-xs text-pd-text-muted"
        >
          {T.loop.presenceWatching.replace(
            "{n}",
            String(data!.presence.liveSessionCount),
          )}
        </p>
      ) : (
        <span data-testid="day-pulse-presence-off" data-presence-live="false" hidden />
      )}
    </section>
  );
}
