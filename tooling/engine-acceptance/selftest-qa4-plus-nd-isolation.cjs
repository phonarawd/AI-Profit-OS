/**
 * Pure selftest: TIME-PLUS-365D Formal 32605594769 contamination vs isolation.
 * Does not boot Nest, does not touch qa4-result / evidence / baseline.
 */
"use strict";

const path = require("node:path");
const { ROOT } = require("./lib/hash-scope.cjs");
const core = require(path.join(ROOT, "services/api-nest/clock.core.cjs"));
const {
  PLUS_365D_WINDOW_ISOLATION_DAYS,
  plusNdLeavesExactlyOne,
  leftoverContaminatesPlusNdWindow,
  isolatedPlus365dAnchorMs,
} = require("./lib/qa4-plus-nd-isolation.cjs");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function main() {
  // Formal QA4 run 32605594769 — TIME-PLUS-30D then TIME-PLUS-365D.
  const formalPlus30AnchorMs = 1787441777383;
  const formalPlus365AnchorMs = 1787441777405;
  const formalPlus365Ms = 1818977777405;
  const leftoverCreatedAtMs = formalPlus30AnchorMs;

  assert(core.addDaysMs(formalPlus365AnchorMs, 365) === formalPlus365Ms, "Formal +365d ms");
  assert(core.kstDayKey(formalPlus365AnchorMs) === "2026-08-23", "Formal KST anchor day");
  assert(core.kstDayKey(formalPlus365Ms) === "2027-08-23", "Formal KST +365d day");

  const formalContaminates = leftoverContaminatesPlusNdWindow({
    leftoverCreatedAtMs,
    anchorMs: formalPlus365AnchorMs,
    plusMs: formalPlus365Ms,
    kstDayStartMs: (ms) => core.kstDayStartMs(ms),
  });
  assert(formalContaminates === true, "Formal leftover must contaminate same-day +365d window");
  assert(plusNdLeavesExactlyOne(2, 0) === false, "Formal counts must fail unchanged oracle");
  assert(plusNdLeavesExactlyOne(1, 0) === true, "Isolated counts must satisfy oracle");
  assert(plusNdLeavesExactlyOne(2, 1) === true, "oracle is anchor-1, not plus===0");

  const isolatedAnchor = isolatedPlus365dAnchorMs(formalPlus365AnchorMs, (ms, d) =>
    core.addDaysMs(ms, d),
  );
  const isolatedPlus = core.addDaysMs(isolatedAnchor, 365);
  assert(isolatedAnchor === core.addDaysMs(formalPlus365AnchorMs, PLUS_365D_WINDOW_ISOLATION_DAYS), "isolation offset");
  assert(core.kstDayKey(isolatedAnchor) !== core.kstDayKey(formalPlus365AnchorMs), "isolated day ≠ wall-clock today");
  assert(
    leftoverContaminatesPlusNdWindow({
      leftoverCreatedAtMs,
      anchorMs: isolatedAnchor,
      plusMs: isolatedPlus,
      kstDayStartMs: (ms) => core.kstDayStartMs(ms),
    }) === false,
    "leftover now() must not share isolated +365d window",
  );

  const ownRowCreatedAt = isolatedAnchor;
  assert(ownRowCreatedAt >= core.kstDayStartMs(isolatedAnchor), "own row visible at isolated anchor");
  assert(ownRowCreatedAt < core.kstDayStartMs(isolatedPlus), "own row invisible at isolated +365d");

  console.log("[selftest-qa4-plus-nd-isolation] PASS");
}

try {
  main();
} catch (e) {
  console.error(`[selftest-qa4-plus-nd-isolation] FAIL — ${e.message}`);
  process.exit(1);
}
