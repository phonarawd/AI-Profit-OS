/**
 * QA9 검증기 회귀 — 옛 결과를 현재 COMPLETE/ISSUED 로 인정하면 안 된다.
 * 현재 증거 없이 전체 합격시키면 안 된다.
 */
"use strict";

const {
  rejectQa9Laundry,
  isQa9StaleAggregation,
  liveQa9EpochBindingOk,
} = require("./lib/qa9-current-epoch-policy.cjs");

const fails = [];
function check(name, cond, detail) {
  if (!cond) {
    fails.push(`${name}: ${detail || "failed"}`);
    console.error(`  FAIL ${name}`);
  } else {
    console.log(`  PASS ${name}`);
  }
}

const current = "ea-baseline-current";
const pred = "ea-baseline-old";

function staleEvidence(over) {
  return {
    verdict: "ENGINE_QA_INCOMPLETE",
    suites: [
      {
        suite_id: "QA9",
        completion_status: "NOT_STARTED",
        current_epoch_authoritative: false,
        baseline_id: current,
      },
    ],
    ...over,
  };
}

{
  const r = rejectQa9Laundry({
    evidence: staleEvidence({
      suites: [
        {
          suite_id: "QA9",
          completion_status: "COMPLETE",
          current_epoch_authoritative: false,
          baseline_id: current,
        },
      ],
    }),
    qa9Result: { baseline_id: pred, engine_accepted_for_ui: "NOT_ISSUED", verdict: "ENGINE_QA_INCOMPLETE" },
    baseline: { id: current },
  });
  check(
    "stale_qa9_not_current_complete",
    r.fails.some((x) => /current-epoch COMPLETE/i.test(x)),
    r.fails.join("; "),
  );
}

{
  const r = rejectQa9Laundry({
    evidence: staleEvidence({ verdict: "ENGINE_ACCEPTED_FOR_UI" }),
    qa9Result: { baseline_id: pred, engine_accepted_for_ui: "ISSUED", verdict: "ENGINE_ACCEPTED_FOR_UI" },
    baseline: { id: current },
  });
  check(
    "old_issued_not_current_cert",
    r.fails.some((x) => /ISSUED|ENGINE_ACCEPTED_FOR_UI/i.test(x)),
    r.fails.join("; "),
  );
}

{
  const r = rejectQa9Laundry({
    evidence: staleEvidence(),
    qa9Result: { baseline_id: current, engine_accepted_for_ui: "NOT_ISSUED", verdict: "ENGINE_QA_INCOMPLETE" },
    baseline: { id: current },
  });
  check(
    "epoch_only_wash_rejected",
    r.fails.some((x) => /washing/i.test(x)),
    r.fails.join("; "),
  );
}

{
  const r = rejectQa9Laundry({
    evidence: {
      verdict: "ENGINE_ACCEPTED_FOR_UI",
      suites: [{ suite_id: "QA9", completion_status: "COMPLETE", current_epoch_authoritative: true, run_id: "r", checksum: "c" }],
    },
    qa9Result: { baseline_id: current, verdict: "ENGINE_QA_INCOMPLETE", engine_accepted_for_ui: "NOT_ISSUED" },
    baseline: { id: current },
  });
  check(
    "verdict_mismatch_rejected",
    r.fails.some((x) => /verdict/i.test(x)),
    r.fails.join("; "),
  );
}

{
  const r = rejectQa9Laundry({
    evidence: {
      verdict: "ENGINE_ACCEPTED_FOR_UI",
      suites: [{ suite_id: "QA9", completion_status: "COMPLETE", current_epoch_authoritative: true }],
    },
    qa9Result: null,
    baseline: { id: current },
  });
  check(
    "accept_without_current_evidence_rejected",
    r.fails.some((x) => /without current/i.test(x)),
    r.fails.join("; "),
  );
}

{
  const liveLike = staleEvidence();
  const r = rejectQa9Laundry({
    evidence: liveLike,
    qa9Result: { baseline_id: pred, engine_accepted_for_ui: "ISSUED", verdict: "ENGINE_ACCEPTED_FOR_UI" },
    baseline: { id: current },
  });
  check("live_stale_predecessor_preserved", r.stale === true && r.fails.length === 0, r.fails.join("; "));
  check("isQa9StaleAggregation_flag", isQa9StaleAggregation(liveLike) === true);
}

{
  const ancestor = "ea-baseline-older";
  const ledger = {
    rebases: [
      { predecessor_baseline_id: ancestor, new_baseline_id: pred },
      { predecessor_baseline_id: pred, new_baseline_id: current },
    ],
  };
  const baseline = { id: current, epoch: { predecessor_baseline_id: pred } };
  const ev = staleEvidence();
  const qa9 = { baseline_id: ancestor, engine_accepted_for_ui: "ISSUED", verdict: "ENGINE_ACCEPTED_FOR_UI" };
  const r = rejectQa9Laundry({ evidence: ev, qa9Result: qa9, baseline });
  check(
    "ancestor_issued_preserved_not_current",
    r.stale === true && r.fails.length === 0,
    r.fails.join("; "),
  );
  check(
    "ancestor_epoch_binding_ok",
    liveQa9EpochBindingOk({ evidence: ev, qa9Result: qa9, baseline, rebaseLedger: ledger }) === true,
  );
  check(
    "current_epoch_not_historical",
    liveQa9EpochBindingOk({
      evidence: ev,
      qa9Result: { baseline_id: current },
      baseline,
      rebaseLedger: ledger,
    }) === false,
  );
}

function run() {
  if (fails.length) {
    const err = new Error(`[selftest-qa9-verifier] FAIL\n- ${fails.join("\n- ")}`);
    if (require.main === module) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
  console.log("[selftest-qa9-verifier] PASS");
}

if (require.main === module) {
  run();
}

module.exports = { run };
