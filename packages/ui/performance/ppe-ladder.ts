/**
 * Progressive Performance Escalation (PPE) ladder — audit §31–§36 / §47
 * Default = Level 0 (static HTML/CSS/SVG 선호 = 엔지니어링 최적화).
 * Levels 3+ / Canvas / WebGL = 기술명만으로 영구 금지하지 않음.
 * 조건: Approved Visual Master 실질 필요 + 측정 예산 + peotteok-performance-target.mdc §4.
 * PO 저사양 PC ≠ 제품 baseline. Tier는 rendering path만 바꾸고 feature parity 유지.
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
    surfaces:
      "dense viz when Visual Master needs it — prefer static/SVG first; gambling particles forever banned",
    requires:
      "semantic HTML fallback + reduced-motion + average-tier budget (peotteok-performance-target)",
  },
  5: {
    name: "webgl-webgpu",
    default: false,
    surfaces:
      "not categorically forbidden — only when Visual Master cannot be met by static/optimized assets",
    trigger:
      "PO/product decision + measured Canvas2D insufficient + §4 eight conditions ALL true",
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
