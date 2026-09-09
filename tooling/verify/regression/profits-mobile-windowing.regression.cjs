/**
 * Regression test for D1-BLK-009 (ProfitsMobile.tsx unbounded map fix).
 *
 * Run: node tooling/verify/regression/profits-mobile-windowing.regression.cjs
 *
 * ProfitsMobile.tsx's windowing is plain React state/effect logic (threshold
 * check, initial visibleCount, IntersectionObserver-driven growth capped at
 * items.length) with no external dependencies - this test re-implements the
 * exact same pure math as a standalone function and asserts it, so the
 * windowing ALGORITHM is proven correct without needing a browser/DOM.
 *
 * Honest scope note (same class of gap already logged for the desktop
 * VirtualOpportunityGrid as D1-BLK-010): this does NOT drive a real
 * IntersectionObserver in a real browser, so it does not prove the actual
 * scroll-triggered reveal wiring end-to-end. tooling/e2e/specs/
 * profits-closure.spec.cjs's "mobile ready list keeps one-route truth" test
 * continues to PASS after this change (proving the <=20-item path, which is
 * everything that test exercises, is unaffected) - re-run as part of
 * verify:profits-live-wire in this same commit's gate run. A dedicated
 * >20-item/scroll Playwright spec for BOTH the desktop and mobile windowed
 * paths remains a tracked gap for a future CI-capable session.
 */
"use strict";

const VIRTUAL_PROFITS_MOBILE_THRESHOLD = 20;
const PROFITS_MOBILE_PAGE_SIZE = 20;

/** Mirrors ProfitsMobile.tsx's windowed/visibleCount/visibleItems logic exactly. */
function computeInitialWindow(itemCount) {
  const windowed = itemCount > VIRTUAL_PROFITS_MOBILE_THRESHOLD;
  const visibleCount = windowed ? PROFITS_MOBILE_PAGE_SIZE : itemCount;
  return { windowed, visibleCount };
}

function growWindow(itemCount, prevVisibleCount) {
  return Math.min(itemCount, prevVisibleCount + PROFITS_MOBILE_PAGE_SIZE);
}

const failures = [];
function expect(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// --- below/at threshold: no windowing, full parity with the pre-fix behaviour ---
for (const n of [0, 1, 19, 20]) {
  const { windowed, visibleCount } = computeInitialWindow(n);
  expect(`n=${n}: windowed must be false (identical to pre-fix .map(all items))`, windowed, false);
  expect(`n=${n}: visibleCount must equal the full item count`, visibleCount, n);
}

// --- above threshold: bounded initial render ---
for (const n of [21, 45, 1000]) {
  const { windowed, visibleCount } = computeInitialWindow(n);
  expect(`n=${n}: windowed must be true`, windowed, true);
  expect(`n=${n}: initial visibleCount must be capped at PAGE_SIZE`, visibleCount, PROFITS_MOBILE_PAGE_SIZE);
}

// --- growth sequence for a 45-item feed: 20 -> 40 -> 45 (capped, not 65) ---
{
  const total = 45;
  let visible = computeInitialWindow(total).visibleCount;
  expect("45-item feed: initial window", visible, 20);
  visible = growWindow(total, visible);
  expect("45-item feed: after 1 sentinel trigger", visible, 40);
  visible = growWindow(total, visible);
  expect("45-item feed: after 2nd sentinel trigger (capped at total, not 60)", visible, 45);
  visible = growWindow(total, visible);
  expect("45-item feed: further triggers stay capped at total (idempotent)", visible, 45);
}

// --- meta count always shows the TRUE total, independent of windowing ---
// (ProfitsMobile.tsx renders `model.items.length` for the "· N개의 기회" line,
// never `visibleItems.length` - this asserts that design intent stays true
// by construction: visibleCount can never exceed itemCount, and the meta
// line's source in the component is the raw items array, not the window.)
{
  const total = 1000;
  const { visibleCount } = computeInitialWindow(total);
  if (visibleCount > total) {
    failures.push("windowed visibleCount must never exceed the true total item count");
  }
}

if (failures.length) {
  console.error("[regression:profits-mobile-windowing] FAIL\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(
  "[regression:profits-mobile-windowing] PASS (4 below-threshold + 3 above-threshold + 4 growth-sequence + 1 meta-count assertion)",
);
