/**
 * QA9 current-epoch aggregation 상태 머신 (canonical contract).
 *
 * QA9는 discovery suite가 아니다. 공식 QA9 runner 이전에는 항상
 * STALE aggregation 이어야 한다. NOT_STARTED 는 canonical 이 아니다
 * (정규화하지 않고 명시 거부). historical qa9-result COMPLETE 는
 * current-authoritative 가 아니다.
 */
"use strict";

const PHASE = Object.freeze({
  PRE_QA7: "PRE_QA7",
  POST_QA7: "POST_QA7",
  POST_QA8: "POST_QA8",
  POST_QA9: "POST_QA9",
});

const QA9_STALE_COMPLETION = "STALE";
const QA9_STALE_EPOCH_STATUS = "STALE_AGGREGATION_FOR_CURRENT_EPOCH";

function labelOf(opts) {
  return (opts && opts.label) || "QA9";
}

function qa9StaleAggregationErrors(qa9, opts) {
  const o = opts || {};
  const label = labelOf(o);
  const errors = [];
  if (!qa9) {
    errors.push(`${label} suite slot required`);
    return errors;
  }
  if (qa9.completion_status === "NOT_STARTED") {
    errors.push(
      `${label} completion_status=NOT_STARTED is not canonical; require STALE aggregation ` +
        `(completion_status=STALE, epoch_status=${QA9_STALE_EPOCH_STATUS}, ` +
        `current_epoch_authoritative=false, run_id=null, checksum=null)`,
    );
  }
  if (qa9.completion_status === "COMPLETE") {
    errors.push(
      `${label} COMPLETE is forbidden before official current-epoch QA9 aggregation (require STALE)`,
    );
  }
  if (qa9.completion_status !== QA9_STALE_COMPLETION) {
    errors.push(`${label} completion_status must be STALE (got ${qa9.completion_status})`);
  }
  if (qa9.epoch_status !== QA9_STALE_EPOCH_STATUS) {
    errors.push(`${label} epoch_status must be ${QA9_STALE_EPOCH_STATUS} (got ${qa9.epoch_status})`);
  }
  if (qa9.current_epoch_authoritative !== false) {
    errors.push(`${label} current_epoch_authoritative must be false while STALE aggregation`);
  }
  if (qa9.run_id !== null) {
    errors.push(`${label} run_id must be null while STALE aggregation (got ${qa9.run_id})`);
  }
  if (qa9.checksum !== null) {
    errors.push(`${label} checksum must be null while STALE aggregation`);
  }
  if (o.baselineId && qa9.baseline_id !== o.baselineId) {
    errors.push(`${label} baseline_id must match current baseline`);
  }
  errors.push(...historicalQa9NotCurrentErrors(qa9, o.qa9Result, o));
  return errors;
}

function historicalQa9NotCurrentErrors(qa9, qa9Result, opts) {
  const o = opts || {};
  const label = labelOf(o);
  const errors = [];
  if (!qa9 || !qa9Result) return errors;
  if (qa9.completion_status !== QA9_STALE_COMPLETION) return errors;
  if (qa9.current_epoch_authoritative === true) {
    errors.push(`${label}: historical qa9-result must not make STALE slot current-authoritative`);
  }
  if (qa9.run_id != null || qa9.checksum != null) {
    errors.push(`${label}: STALE QA9 must not bind historical run_id/checksum as current`);
  }
  const currentBaselineId = o.baselineId || o.currentBaselineId;
  if (
    currentBaselineId &&
    qa9Result.baseline_id === currentBaselineId &&
    qa9Result.completion_status === "COMPLETE"
  ) {
    errors.push(`${label}: historical qa9-result must not be bound to the current baseline`);
  }
  return errors;
}

function qa9OfficialCompleteErrors(qa9, opts) {
  const o = opts || {};
  const label = labelOf(o);
  const errors = [];
  if (!qa9) {
    errors.push(`${label} suite slot required`);
    return errors;
  }
  if (qa9.completion_status !== "COMPLETE") {
    errors.push(`${label} official aggregation requires completion_status=COMPLETE`);
  }
  if (!qa9.run_id || !qa9.checksum) {
    errors.push(`${label} official aggregation requires run_id + checksum`);
  }
  if (qa9.aggregation_only !== true) {
    errors.push(`${label} official aggregation must remain aggregation_only=true`);
  }
  if (o.baselineId && qa9.baseline_id !== o.baselineId) {
    errors.push(`${label} official aggregation baseline_id must match current baseline`);
  }
  const result = o.qa9Result;
  if (result) {
    if (result.completion_status !== "COMPLETE") {
      errors.push(`${label} official qa9-result.completion_status must be COMPLETE`);
    }
    if (!result.run_id || !result.checksum) {
      errors.push(`${label} official qa9-result requires run_id + checksum`);
    }
    if (!result.formula_inputs || typeof result.formula_inputs !== "object") {
      errors.push(`${label} official qa9-result requires formula_inputs binding`);
    }
    if (String(result.run_id) !== String(qa9.run_id) || result.checksum !== qa9.checksum) {
      errors.push(`${label} official suite slot must bind qa9-result run_id/checksum`);
    }
  }
  return errors;
}

function assertQa9StaleAggregation(qa9, failFn, opts) {
  for (const msg of qa9StaleAggregationErrors(qa9, opts)) failFn(msg);
}

function assertQa9OfficialComplete(qa9, failFn, opts) {
  for (const msg of qa9OfficialCompleteErrors(qa9, opts)) failFn(msg);
}

function isQa9StaleAggregation(qa9, opts) {
  return qa9StaleAggregationErrors(qa9, opts).length === 0;
}

function evaluateQa9ForPhase(input) {
  const i = input || {};
  const phase = i.phase;
  const qa7 = i.qa7;
  const qa8 = i.qa8;
  const qa9 = i.qa9;
  const opts = {
    baselineId: i.currentBaselineId,
    qa9Result: i.qa9Result,
    label: phase || "QA9",
  };
  const errors = [];
  if (!phase || !PHASE[phase]) {
    return { ok: false, errors: [`unknown QA9 phase ${phase}`], phase };
  }

  if (phase === PHASE.PRE_QA7) {
    if (!qa7 || qa7.completion_status !== "NOT_STARTED") {
      errors.push("pre-QA7 requires QA7 NOT_STARTED");
    }
    if (qa8 && qa8.completion_status === "COMPLETE") {
      errors.push("pre-QA7 forbids current QA8 COMPLETE");
    }
    errors.push(...qa9StaleAggregationErrors(qa9, opts));
  } else if (phase === PHASE.POST_QA7) {
    if (!qa7 || qa7.completion_status !== "COMPLETE") {
      errors.push("post-QA7 requires QA7 COMPLETE");
    }
    if (!qa8 || qa8.completion_status !== "NOT_STARTED") {
      errors.push("post-QA7 requires QA8 NOT_STARTED");
    }
    errors.push(...qa9StaleAggregationErrors(qa9, opts));
  } else if (phase === PHASE.POST_QA8) {
    if (!qa7 || qa7.completion_status !== "COMPLETE") {
      errors.push("post-QA8 requires QA7 COMPLETE");
    }
    if (!qa8 || qa8.completion_status !== "COMPLETE") {
      errors.push("post-QA8 requires QA8 COMPLETE");
    }
    errors.push(...qa9StaleAggregationErrors(qa9, opts));
  } else if (phase === PHASE.POST_QA9) {
    if (!qa7 || qa7.completion_status !== "COMPLETE") {
      errors.push("post-QA9 requires QA7 COMPLETE");
    }
    if (!qa8 || qa8.completion_status !== "COMPLETE") {
      errors.push("post-QA9 requires QA8 COMPLETE");
    }
    if (qa9 && qa9.completion_status === "STALE") {
      errors.push("post-QA9 forbids leaving QA9 as STALE aggregation");
    }
    if (qa9 && qa9.completion_status === "NOT_STARTED") {
      errors.push("post-QA9 forbids QA9 NOT_STARTED");
    }
    errors.push(...qa9OfficialCompleteErrors(qa9, opts));
  }

  return { ok: errors.length === 0, errors, phase };
}

function passthroughNonOwnedSuites(suites, ownerId, ownerSlot, baselineId) {
  return (suites || []).map((s) => {
    if (s.suite_id === ownerId) return ownerSlot;
    return { ...s, baseline_id: baselineId };
  });
}

function sourceWritesQa9Result(src) {
  return /qa9-result\.v1\.json/.test(src) && /write(Json|FileSync)/.test(src);
}

function sourceCreatesCurrentQa9Complete(src) {
  return (
    /suite_id:\s*"QA9"/.test(src) &&
    /completion_status:\s*"COMPLETE"/.test(src) &&
    /qa9-result\.v1\.json/.test(src)
  );
}

module.exports = {
  PHASE,
  QA9_STALE_COMPLETION,
  QA9_STALE_EPOCH_STATUS,
  qa9StaleAggregationErrors,
  qa9OfficialCompleteErrors,
  historicalQa9NotCurrentErrors,
  assertQa9StaleAggregation,
  assertQa9OfficialComplete,
  isQa9StaleAggregation,
  evaluateQa9ForPhase,
  passthroughNonOwnedSuites,
  sourceWritesQa9Result,
  sourceCreatesCurrentQa9Complete,
};
