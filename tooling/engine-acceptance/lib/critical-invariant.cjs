/**
 * Cumulative critical-invariant merge.
 *
 * blocked / skipped / uncovered / failed 는 후속 스위트가 0이어도 사라지면 안 된다.
 * FAIL 을 BLOCKED 로 바꾸지 않는다.
 */
"use strict";

const CRITICAL_KEYS = Object.freeze(["blocked", "skipped", "uncovered", "failed"]);

function pickCriticalCounts(src) {
  const o = src || {};
  const out = {};
  for (const k of CRITICAL_KEYS) {
    const n = Number(o[k]);
    out[k] = Number.isFinite(n) && n > 0 ? n : 0;
  }
  return out;
}

function isCriticalDirty(ci) {
  const c = pickCriticalCounts(ci);
  return CRITICAL_KEYS.some((k) => c[k] > 0);
}

/**
 * @param {object} prior
 * @param {object} current
 * @param {{ priorLabel?: string, currentLabel?: string }} [labels]
 */
function mergeCriticalInvariant(prior, current, labels = {}) {
  const priorLabel = labels.priorLabel || "prior";
  const currentLabel = labels.currentLabel || "current";
  const p = pickCriticalCounts(prior);
  const c = pickCriticalCounts(current);
  const sources = {};
  if (prior && prior.sources && typeof prior.sources === "object") {
    for (const [k, v] of Object.entries(prior.sources)) {
      sources[k] = pickCriticalCounts(v);
    }
  } else {
    sources[priorLabel] = p;
  }
  sources[currentLabel] = c;
  return {
    blocked: p.blocked + c.blocked,
    skipped: p.skipped + c.skipped,
    uncovered: p.uncovered + c.uncovered,
    failed: p.failed + c.failed,
    sources,
  };
}

function countBySeverity(defects) {
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const d of defects || []) {
    if (counts[d.severity] !== undefined) counts[d.severity] += 1;
  }
  return counts;
}

/**
 * 누적 수용 문구. suite-local counts 를 전역 진실처럼 쓰지 않는다.
 * P0/P1=0 문구는 누적 카운트가 실제로 0일 때만.
 */
function buildCumulativeAcceptanceMessaging(opts) {
  const suiteLabel = opts.suiteLabel || "SUITE";
  const mergedCounts = opts.mergedCounts || { P0: 0, P1: 0 };
  const criticalMerged = pickCriticalCounts(opts.criticalMerged);
  const remainingSuitesNote = opts.remainingSuitesNote || "later suites not executed";
  const p0 = mergedCounts.P0 || 0;
  const p1 = mergedCounts.P1 || 0;

  if (p0 > 0 || p1 > 0) {
    return {
      verdict: "ENGINE_NOT_ACCEPTED",
      verdictReason: `${suiteLabel} COMPLETE · cumulative P0=${p0} P1=${p1} · critical.failed=${criticalMerged.failed} · 03 blocked · product mutation 0`,
    };
  }
  if (criticalMerged.failed > 0) {
    return {
      verdict: "ENGINE_NOT_ACCEPTED",
      verdictReason: `${suiteLabel} COMPLETE · cumulative critical_invariant.failed=${criticalMerged.failed} · P0/P1=${p0}/${p1} · 03 blocked · product mutation 0`,
    };
  }
  if (criticalMerged.blocked > 0 || criticalMerged.skipped > 0 || criticalMerged.uncovered > 0) {
    return {
      verdict: "ENGINE_QA_INCOMPLETE",
      verdictReason: `${suiteLabel} COMPLETE · critical_invariant.blocked=${criticalMerged.blocked} skipped=${criticalMerged.skipped} uncovered=${criticalMerged.uncovered} failed=${criticalMerged.failed} · P0/P1=${p0}/${p1} · ACCEPTED 불가 · ${remainingSuitesNote}`,
    };
  }
  return {
    verdict: "ENGINE_QA_INCOMPLETE",
    verdictReason: `${suiteLabel} COMPLETE · P0/P1=${p0}/${p1} · mandatory suites ${remainingSuitesNote} · ENGINE_ACCEPTED_FOR_UI forbidden`,
  };
}

function inspectAcceptanceMessaging(opts) {
  const fails = [];
  const p0 = (opts.defects && opts.defects.counts && opts.defects.counts.P0) || 0;
  const p1 = (opts.defects && opts.defects.counts && opts.defects.counts.P1) || 0;
  const reason = String(opts.verdictReason || "");
  const report = String(opts.reportText || "");
  const critical = pickCriticalCounts(opts.critical);
  if ((p0 > 0 || p1 > 0) && /P0\/P1=0/.test(reason)) {
    fails.push(`verdict_reason claims P0/P1=0 while registry P0=${p0} P1=${p1}`);
  }
  if ((p0 > 0 || p1 > 0) && /defects\.P0 \/ P1\s*\|\s*0\s*\/\s*0/.test(report)) {
    fails.push(`REPORT claims defects.P0/P1 0/0 while registry P0=${p0} P1=${p1}`);
  }
  if (critical.failed > 0 && /P0\/P1=0/.test(reason) && (p0 > 0 || p1 > 0)) {
    fails.push("verdict_reason omits cumulative defect truth while critical.failed>0");
  }
  return fails;
}

module.exports = {
  CRITICAL_KEYS,
  pickCriticalCounts,
  isCriticalDirty,
  mergeCriticalInvariant,
  countBySeverity,
  buildCumulativeAcceptanceMessaging,
  inspectAcceptanceMessaging,
};
