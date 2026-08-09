/**
 * S/A/B device tier — UI §29.1 Law 3
 * Tier changes rendering path only · feature set parity required (PPE §40)
 */
export type DeviceTier = "S" | "A" | "B";

type NavPlus = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export function detectDeviceTier(
  nav: NavPlus | undefined = typeof navigator !== "undefined"
    ? (navigator as NavPlus)
    : undefined,
  win: Window | undefined = typeof window !== "undefined" ? window : undefined,
): DeviceTier {
  if (!nav || !win) return "B";

  const cores = nav.hardwareConcurrency ?? 2;
  const memory = nav.deviceMemory;
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = nav.connection?.saveData === true;

  if (reduced || saveData) return "B";
  if (memory != null && memory <= 2) return "B";
  if (cores <= 4) return "B";
  if (memory != null && memory >= 8 && cores >= 8) return "S";
  return "A";
}

/** Phase0 polling / Phase1+ StreamPolicy bands (ms) — UI §29.6 */
export type StreamPolicyBands = {
  opportunityFeedMs: 500 | 1000 | 3000;
  /** Live Scan execute-tick · same band as opportunityFeed (S/A/B) */
  executionTickMs: 500 | 1000 | 3000;
  payoutTickerMs: 1000 | 3000 | 5000;
};

export function tierBatchMs(tier: DeviceTier): StreamPolicyBands {
  if (tier === "S") {
    return {
      opportunityFeedMs: 500,
      executionTickMs: 500,
      payoutTickerMs: 1000,
    };
  }
  if (tier === "B") {
    return {
      opportunityFeedMs: 3000,
      executionTickMs: 3000,
      payoutTickerMs: 5000,
    };
  }
  return {
    opportunityFeedMs: 1000,
    executionTickMs: 1000,
    payoutTickerMs: 3000,
  };
}
