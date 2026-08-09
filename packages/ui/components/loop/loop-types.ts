/** UI §51.24 · schemas/day-opportunity-pulse.v1.json */
export type DayPulsePresence = {
  enabled: boolean;
  liveSessionCount: number | null;
};

export type DayPulseModel = {
  asOf: string;
  tz: "Asia/Seoul";
  source: "live";
  g4Merge: false;
  platformSafeStopToday: number;
  settlementCompletedToday: number;
  scope: "platform";
  presence: DayPulsePresence;
};

export type PreCTAProps = {
  /** Nest POST preflight 로 발급 · 없으면 participate 412 */
  preflightToken?: string | null;
  onReady?: (token: string) => void;
  className?: string;
};
