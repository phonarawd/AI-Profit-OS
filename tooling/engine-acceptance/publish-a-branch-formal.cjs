/**
 * 공식 A_BRANCH_FORMAL publisher.
 *
 * CLI 값 = expected only. 진실은 live evidence + git ancestry.
 * 쓰기는 --actual 이고 검증 전부 PASS 후 atomic replace.
 * dry-run / 기본 실행은 저장 0.
 *
 * 소유 출력:
 *   - governance/engine-acceptance/a-branch-formal-result.v1.json
 *   - governance/engine-acceptance/evidence-manifest.v1.json
 *   - governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md
 * 금지 출력: qa1–qa9 result · baseline · workflow · product
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./lib/hash-scope.cjs");
const { atomicReplace } = require("./lib/atomic-publication.cjs");
const {
  OFFICIAL_RELS,
  RESULT_REL,
  EVIDENCE_REL,
  REPORT_REL,
  QA_RESULT_RELS,
  fail,
  readJsonRoot,
  readBytes,
  snapshotQaResults,
  assertQaResultsUnchanged,
  verifyPreconditions,
  buildFormalResult,
  nextEvidence,
  patchReport,
  verifyIssuedOutputs,
  alreadyPublished,
  verifyABranchFormalLive,
} = require("./lib/a-branch-formal.cjs");

function getArg(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  return argv[i + 1] || null;
}

function publishABranchFormal(opts = {}) {
  const root = opts.root || ROOT;
  const dryRun = opts.actual === true ? false : true;
  if (opts.actual === true && opts.dryRun === true) {
    fail("--actual and --dry-run cannot be combined", "FLAGS");
  }

  const qaSnap = snapshotQaResults(root);
  const pre = verifyPreconditions(root, opts);
  const issuedAt = opts.issuedAt || new Date().toISOString();
  const planned = buildFormalResult({
    ...pre,
    issuedAt: (() => {
      const existingAbs = path.join(root, RESULT_REL);
      if (fs.existsSync(existingAbs)) {
        try {
          const existing = readJsonRoot(root, RESULT_REL);
          if (existing && existing.issued_at) return existing.issued_at;
        } catch {
          /* ignore unreadable existing result — rebuild */
        }
      }
      return issuedAt;
    })(),
  });

  const publishedState = alreadyPublished(root, planned);
  if (publishedState === "DIVERGENT") {
    fail("different A-branch formalization already issued — reissue forbidden", "IDEMPOTENT_DIVERGENT");
  }

  const nextEv = nextEvidence(pre.evidence, planned, pre);
  const nextReport = patchReport(pre.report, planned);
  verifyIssuedOutputs(
    { result: planned, evidence: nextEv, report: nextReport },
    {
      contract: pre.contract,
      qa9: pre.qa9,
      epochBefore: pre.evidence.current_epoch,
      head: pre.head,
      allowSubjectEqualsPublisher: String(pre.head) === pre.contract.formalSubjectSha,
    },
  );
  assertGatesNotElevated(nextEv, planned);

  const writes = {
    [RESULT_REL]: Buffer.from(`${JSON.stringify(planned, null, 2)}\n`, "utf8"),
    [EVIDENCE_REL]: Buffer.from(`${JSON.stringify(nextEv, null, 2)}\n`, "utf8"),
    [REPORT_REL]: Buffer.from(nextReport, "utf8"),
  };
  for (const rel of QA_RESULT_RELS) {
    if (Object.prototype.hasOwnProperty.call(writes, rel)) {
      fail("publisher cannot write QA result files", "QA_EVIDENCE_MUTATION");
    }
  }

  const out = {
    status: dryRun
      ? "A_BRANCH_FORMAL_VALIDATED"
      : publishedState === "IDENTICAL" || publishedState === "SAME_INPUT"
        ? "A_BRANCH_FORMAL_ALREADY_PUBLISHED"
        : "A_BRANCH_FORMAL_PUBLISHED",
    dry_run: dryRun,
    formalization_id: planned.formalization_id,
    formal_subject_sha: planned.formal_subject_sha,
    publisher_commit_sha: planned.publisher_commit_sha,
    checksum: planned.checksum,
    a_branch_formal: "YES",
    engine_accepted_for_ui: "ISSUED",
    rc_formal: "NO",
    release_ready: "NO",
    next_release_step: planned.next_release_step,
    planned_writes: OFFICIAL_RELS.slice(),
    owned_outputs: OFFICIAL_RELS.slice(),
  };

  if (dryRun) {
    assertQaResultsUnchanged(root, qaSnap, "dry-run");
    return out;
  }

  if (publishedState === "IDENTICAL" || publishedState === "SAME_INPUT") {
    assertQaResultsUnchanged(root, qaSnap, "idempotent");
    return out;
  }

  if (opts.failBeforeStaging === true) {
    fail("injected failBeforeStaging — destination files must stay unchanged", "INJECTED_FAIL");
  }

  atomicReplace(root, writes, {
    failBeforeReplace: opts.failBeforeReplace === true,
    failDuringReplace: opts.failDuringReplace === true,
    failDuringReplaceAfter: opts.failDuringReplaceAfter,
    verifyStaged(staged) {
      const byRel = new Map(staged.map((s) => [s.rel, s]));
      for (const rel of OFFICIAL_RELS) {
        if (!byRel.has(rel)) fail(`staged official file missing: ${rel}`, "ATOMIC");
      }
      const stagedResult = JSON.parse(fs.readFileSync(byRel.get(RESULT_REL).tmp, "utf8"));
      const stagedEvidence = JSON.parse(fs.readFileSync(byRel.get(EVIDENCE_REL).tmp, "utf8"));
      const stagedReport = fs.readFileSync(byRel.get(REPORT_REL).tmp, "utf8");
      verifyIssuedOutputs(
        { result: stagedResult, evidence: stagedEvidence, report: stagedReport },
        {
          contract: pre.contract,
          qa9: pre.qa9,
          epochBefore: pre.evidence.current_epoch,
          head: pre.head,
          allowSubjectEqualsPublisher: String(pre.head) === pre.contract.formalSubjectSha,
        },
      );
    },
  });

  assertQaResultsUnchanged(root, qaSnap, "actual");
  verifyABranchFormalLive(root, {
    allowSubjectEqualsPublisher: String(pre.head) === pre.contract.formalSubjectSha,
  });
  return out;
}

function assertGatesNotElevated(evidence, result) {
  if (evidence.rc_formal === "YES" || result.rc_formal === true) {
    fail("publisher cannot set RC_FORMAL", "RC_FORMAL");
  }
  if (evidence.release_ready === "YES" || result.release_ready === true) {
    fail("publisher cannot set RELEASE_READY", "RELEASE_READY");
  }
}

function main() {
  const argv = process.argv.slice(2);
  try {
    const out = publishABranchFormal({
      expectedBranch: getArg(argv, "--branch"),
      expectedSubjectSha: getArg(argv, "--subject-sha"),
      expectedQa9RunId: getArg(argv, "--qa9-run-id"),
      expectedQa9Checksum: getArg(argv, "--qa9-checksum"),
      expectedBaselineId: getArg(argv, "--baseline-id"),
      expectedWorkflowHash: getArg(argv, "--workflow-hash"),
      expectedPromptHash: getArg(argv, "--prompt-hash"),
      expectedEvalHash: getArg(argv, "--eval-hash"),
      dryRun: argv.includes("--dry-run") || argv.includes("--validate-only") || !argv.includes("--actual"),
      actual: argv.includes("--actual"),
    });
    console.log("[engine-acceptance:publish-a-branch-formal] " + out.status);
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error(`[engine-acceptance:publish-a-branch-formal] ABORT — ${e.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  publishABranchFormal,
  OFFICIAL_RELS,
  RESULT_REL,
  EVIDENCE_REL,
  REPORT_REL,
  verifyABranchFormalLive,
};
