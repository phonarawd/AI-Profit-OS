/**
 * Progressive Performance Escalation (PPE) ladder — audit §31–§36 / §47
 * Default = Level 0. Levels 3+ require measured bottleneck before use.
 */

export type PpeLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const PPE_LEVELS = {
  0: {
    name: "html-css-svg",
    default: true,
    surfaces: "~95% of app — nav, forms, badges, a11y-critical UI",
  },
  1: {
    name: "react-optimize",
    default: false,
    surfaces: "heavy/rare first-paint — KYC capture, Admin policy, legal",
    trigger: "bundle budget breach or non-trivial unused-on-FCP dependency",
  },
  2: {
    name: "virtualization",
    default: false,
    surfaces: "/profits feed, payout ticker, admin review queues",
    thresholds: { profitsFeed: 20, ticker: 50, adminQueue: 30 },
  },
  3: {
    name: "web-worker",
    default: false,
    surfaces: "none Day-1 — large client re-rank/filter only",
    trigger: "measured Long Task >50ms on main thread",
  },
  4: {
    name: "canvas",
    default: false,
    surfaces: "none Day-1 — dense sparkline / S-tier particle only",
    requires: "semantic HTML fallback + reduced-motion path",
  },
  5: {
    name: "webgl-webgpu",
    default: false,
    surfaces: "none scoped — future high-density viz only",
    trigger: "product decision + Canvas2D measured insufficient",
  },
} as const;

/** Device-tier feature parity: rendering path may degrade, feature set must not */
export const TIER_FEATURE_PARITY = {
  rule: "tiering changes rendering path, never feature set",
  batchMs: { S: 500, A: 1000, B: 3000 },
} as const;

export function recommendedPpeLevel(opts: {
  listLength?: number;
  longTaskMs?: number;
  needsDenseViz?: boolean;
}): PpeLevel {
  if (opts.needsDenseViz) return 4;
  if (opts.longTaskMs != null && opts.longTaskMs > 50) return 3;
  if (opts.listLength != null && opts.listLength > 20) return 2;
  return 0;
}
