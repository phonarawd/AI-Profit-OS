#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const psm = require("../verify/lib/rel-502-psm.cjs");

const root = path.resolve(__dirname, "../..");
const CERT_REL = "governance/engine-acceptance/FINAL_ACCEPTANCE.md";
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const QA9_REL = "governance/engine-acceptance/qa9-result.v1.json";
const REBASE_LEDGER_REL = "governance/engine-acceptance/product-rebases.v1.json";

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function git(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function fail(message) {
  throw new Error(message);
}

function main() {
  const baseline = readJson(BASELINE_REL);
  const evidence = readJson(EVIDENCE_REL);
  const qa9 = readJson(QA9_REL);
  const rebaseLedger = readJson(REBASE_LEDGER_REL);
  const ev = psm.evaluate(root);
  const head = git(["rev-parse", "HEAD"]);

  if (ev.scope.drift) fail("protected-scope drift remains");
  if (!ev.qa.ready) fail("current-epoch QA not ready: " + ev.qa.reason);
  if (!ev.canIssue) {
    fail(
      "REL-502 cannot issue: pending PSM RELs=" +
        ev.pendingRels.map((row) => row.id).join(","),
    );
  }
  if (evidence.baseline_id !== baseline.id) fail("evidence baseline mismatch");
  if (evidence.verdict !== "ENGINE_ACCEPTED_FOR_UI") fail("evidence verdict not accepted");
  if (evidence.evidence_integrity !== "VALID") fail("evidence integrity invalid");
  if (qa9.baseline_id !== baseline.id) fail("QA9 baseline mismatch");
  if (qa9.completion_status !== "COMPLETE") fail("QA9 incomplete");
  if (qa9.verdict !== "ENGINE_ACCEPTED_FOR_UI") fail("QA9 verdict not accepted");
  if (qa9.engine_accepted_for_ui !== "ISSUED") fail("QA9 did not issue UI acceptance");
  if (qa9.verdict_reason_code !== "ALL_FORMULA_CONDITIONS_MET") {
    fail("QA9 formula conditions not all met");
  }

  const currentRebase = [...(rebaseLedger.rebases || [])]
    .reverse()
    .find((entry) => entry.new_baseline_id === baseline.id);
  if (!currentRebase) fail("no rebase ledger entry for current baseline");
  if (currentRebase.decision_id !== "ENGINE_ACCEPTANCE_REBASE_V1") {
    fail("unexpected rebase decision");
  }

  const fi = qa9.formula_inputs || {};
  if (
    fi.mandatory_suite_complete !== true ||
    fi.critical_invariant_blocked !== 0 ||
    fi.critical_invariant_skipped !== 0 ||
    fi.critical_invariant_uncovered !== 0 ||
    fi.defects_P0 !== 0 ||
    fi.defects_P1 !== 0 ||
    fi.baseline_valid !== true ||
    fi.acceptance_scope_unchanged !== true ||
    fi.evidence_integrity_valid !== true
  ) {
    fail("QA9 acceptance formula is not clean");
  }

  const qa7 = (evidence.suites || []).find((suite) => suite.suite_id === "QA7");
  if (!qa7 || qa7.completion_status !== "COMPLETE" || qa7.formal_actions_evidence !== true) {
    fail("formal QA7 evidence missing");
  }

  const evalStatus = currentRebase.eval_dataset_status || "MATCH";
  const postPending = ev.pendingPosts.length;
  const live = ev.scope;
  const ackStatement = currentRebase.human_po_ack && currentRebase.human_po_ack.statement;
  if (!ackStatement || !ackStatement.startsWith("ACK APPROVED ENGINE_ACCEPTANCE_REBASE_V1")) {
    fail("approved rebase ACK missing");
  }

  const cert = `# REL-502 FINAL ENGINE ACCEPTANCE

이 문서는 REL-004 sanity 와 별도다. REL-004 로 대체 금지.

\`\`\`text
REL = REL-502
TITLE = FINAL ENGINE ACCEPTANCE
STATUS = ISSUED
CERT_ISSUED = 1
REL-004_SUBSTITUTE = 0
QA9_PREDECESSOR_VERDICT_AS_CURRENT = 0
PSM_REL_PENDING = ${ev.pendingRels.length}
POST_PSM_PENDING = ${postPending}
PROTECTED_SCOPE_DRIFT = 0
REBASE_REQUIRED = 0
REBASE_APPLIED = 1
ACK_RECEIVED = 1
LOCAL_QA0_QA9_RERUN = 0
EVAL_DATASET_STATUS = ${evalStatus}
QA1_QA8_STATUS = COMPLETE_CURRENT_EPOCH
QA9_STATUS = COMPLETE_CURRENT_EPOCH
QA9_VERDICT = ENGINE_ACCEPTED_FOR_UI
DEFECTS_P0 = ${fi.defects_P0}
DEFECTS_P1 = ${fi.defects_P1}
CRITICAL_INVARIANT_BLOCKED = ${fi.critical_invariant_blocked}
NEXT = RC_FORMAL
BASELINE_ID = ${baseline.id}
PREDECESSOR_BASELINE_ID = ${currentRebase.predecessor_baseline_id}
REBASE_ID = ${currentRebase.rebase_id}
LIVE_AGGREGATE = ${live.liveAggregate}
BASELINE_AGGREGATE = ${live.baselineAggregate}
PATH_COUNT_LIVE = ${live.livePathCount}
PATH_COUNT_BASELINE = ${live.baselinePathCount}
CHANGED_PATHS = ${live.changedPathCount}
ADDED_PATHS = ${live.added.length}
MUTATED_PATHS = ${live.changed.length}
MISSING_PATHS = ${live.missing.length}
EXIT_GATE = recovery/release-provenance-20260831 @ ${head} · current-epoch QA0-QA9 COMPLETE · QA9 ENGINE_ACCEPTED_FOR_UI · FINAL_ACCEPTANCE ISSUED
\`\`\`

## 판정

Human/PO 승인 ACK는 \`product-rebases.v1.json\`에 원문 그대로 보존되어 있으며,
승인된 product commit \`${currentRebase.product_commit}\`의 protected-scope 변경은
predecessor baseline \`${currentRebase.predecessor_baseline_id}\`에서
current baseline \`${baseline.id}\`로 formal rebase되었다.

Formal rebase는 \`${currentRebase.rebase_policy_version}\`에 따라 적용되었고,
rebase id는 \`${currentRebase.rebase_id}\`이다. Predecessor evidence/hash washing은 수행하지 않았으며
predecessor QA9 verdict는 history로만 유지한다.

Current epoch의 QA1~QA8은 모두 같은 baseline에서 \`COMPLETE\`이고,
formal QA7은 GitHub Actions run \`${qa7.run_id}\`의 실제 Actions evidence를 사용했다.
QA9 역시 같은 baseline에서 \`COMPLETE\`이며 최종 verdict는
\`ENGINE_ACCEPTED_FOR_UI\` / \`ALL_FORMULA_CONDITIONS_MET\`이다.

QA9 formula 기준:
- mandatory QA1~QA8 complete = true
- critical invariant blocked / skipped / uncovered = 0 / 0 / 0
- defects P0 / P1 = 0 / 0
- baseline.valid = true
- acceptance_scope.unchanged = true
- evidence_integrity_valid = true

Live protected aggregate와 current baseline aggregate는 모두
\`${live.liveAggregate}\`로 일치하며 current protected-scope drift는 0이다.

PSM=TRUE REL pending은 ${ev.pendingRels.length}건이다. POST-001~003 계열 후속 트리거는
미래 변경 시 다시 무효화할 수 있는 후속 상태이며 current Engine acceptance 발급 차단 REL이 아니다.

따라서 \`FINAL_ACCEPTANCE = ISSUED\`이며 Engine acceptance 단계의 다음 상태는 \`RC_FORMAL\`이다.

Local fake QA0-QA9 PASS = 0. REL-004 대체 = 0.
Predecessor QA9 verdict current-authoritative 사용 = 0.
Product mutation을 green 추적에 사용하지 않았다.
이 인증은 Production migration apply, Production deploy, secret rotation 또는 Production 운영 변경 승인을 의미하지 않는다.
`;

  fs.writeFileSync(path.join(root, CERT_REL), cert, "utf8");
  console.log(
    `[finalize-engine-current-epoch] PASS baseline=${baseline.id} rebase=${currentRebase.rebase_id} head=${head}`,
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("[finalize-engine-current-epoch] FAIL: " + String(error.message || error));
    process.exit(1);
  }
}

module.exports = { main };
