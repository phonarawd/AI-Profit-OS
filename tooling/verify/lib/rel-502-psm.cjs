/**
 * REL-502 — PSM=TRUE REL 자동수집 + protected-scope live/baseline 대조.
 * 고정 숫자 range 금지. POST-* 는 미래 무효화 트리거(차단 아님).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const {
  readJson,
  buildManifest,
} = require("../../engine-acceptance/lib/hash-scope.cjs");

const PLAN_REL = ".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md";
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const QA9_REL = "governance/engine-acceptance/qa9-result.v1.json";
const CERT_REL = "governance/engine-acceptance/FINAL_ACCEPTANCE.md";

function readPlan(root) {
  return fs.readFileSync(path.join(root, PLAN_REL), "utf8");
}

function collectPsmFromPlan(planText) {
  const blocks = [];
  const re = /```yaml\r?\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(planText))) {
    const body = m[1];
    const id = (body.match(/^ID:\s*(REL-\S+|POST-\S+)/m) || [])[1];
    const status = (body.match(/^STATUS:\s*(\S+)/m) || [])[1];
    const psmRaw = (body.match(/^PROTECTED_SCOPE_MUTATION:\s*(\w+)/m) || [])[1];
    if (!id || !psmRaw) continue;
    if (String(psmRaw).toLowerCase() !== "true") continue;
    blocks.push({ id, status, psm: true });
  }
  return {
    rels: blocks.filter((b) => /^REL-/.test(b.id)),
    posts: blocks.filter((b) => /^POST-/.test(b.id)),
  };
}

function yamlBlockSlice(planText, relId) {
  const idx = planText.indexOf("ID: " + relId);
  if (idx < 0) return "";
  return planText.slice(idx, idx + 4000);
}

function yamlStatus(planText, relId) {
  const slice = yamlBlockSlice(planText, relId);
  const m = slice.match(/^STATUS:\s*(\S+)/m);
  return m ? m[1] : "";
}

function yamlCompleted(planText, relId) {
  return yamlStatus(planText, relId) === "COMPLETED";
}

function todoStatus(planText, relId) {
  const id = relId.replace(/^REL-/i, "rel-").toLowerCase();
  const re = new RegExp(
    "- id: " + id + "\\r?\\n(?:.*\\r?\\n){0,3}\\s*status: (\\w+)",
  );
  const m = planText.match(re);
  return m ? m[1] : "";
}

function todoCompleted(planText, relId) {
  return todoStatus(planText, relId) === "completed";
}

function parseRel502YamlDeps(planText) {
  const slice = yamlBlockSlice(planText, "REL-502");
  const block = slice.match(/DEPENDENCIES:\r?\n([\s\S]*?)(?:^[A-Z_]+:|\n```)/m);
  if (!block) return [];
  return (block[1].match(/REL-\d+/g) || []).filter((id, i, a) => a.indexOf(id) === i);
}

function compareProtectedScope() {
  const scope = readJson(SCOPE_REL);
  const live = buildManifest(scope);
  const baseline = readJson(BASELINE_REL);
  const baseManifest = baseline.protected_scope_manifest || {};
  const baseMap = new Map(
    (baseManifest.entries || []).map((e) => [e.path, e.sha256]),
  );
  const liveMap = new Map(live.entries.map((e) => [e.path, e.sha256]));
  const added = [];
  const changed = [];
  const missing = [];
  for (const [p, h] of liveMap) {
    if (!baseMap.has(p)) added.push(p);
    else if (baseMap.get(p) !== h) changed.push(p);
  }
  for (const p of baseMap.keys()) {
    if (!liveMap.has(p)) missing.push(p);
  }
  added.sort();
  changed.sort();
  missing.sort();
  const drift =
    live.aggregate !== baseManifest.aggregate ||
    live.pathCount !== baseManifest.pathCount ||
    added.length + changed.length + missing.length > 0;
  return {
    baselineId: baseline.id,
    liveAggregate: live.aggregate,
    baselineAggregate: baseManifest.aggregate,
    livePathCount: live.pathCount,
    baselinePathCount: baseManifest.pathCount,
    added,
    changed,
    missing,
    changedPathCount: added.length + changed.length + missing.length,
    drift,
  };
}

function currentEpochQaReady(root, baselineId) {
  let evidence;
  let qa9;
  try {
    evidence = JSON.parse(fs.readFileSync(path.join(root, EVIDENCE_REL), "utf8"));
  } catch {
    return { ready: false, reason: "evidence-manifest unreadable" };
  }
  try {
    qa9 = JSON.parse(fs.readFileSync(path.join(root, QA9_REL), "utf8"));
  } catch {
    return { ready: false, reason: "qa9-result unreadable" };
  }
  if (evidence.baseline_id !== baselineId) {
    return { ready: false, reason: "evidence baseline is not live epoch" };
  }
  const suites = evidence.suites || [];
  for (const id of ["QA1", "QA2", "QA3", "QA4", "QA5", "QA6", "QA7", "QA8"]) {
    const s = suites.find((x) => x.suite_id === id);
    if (!s || s.completion_status !== "COMPLETE" || s.baseline_id !== baselineId) {
      return { ready: false, reason: id + " not COMPLETE on current baseline" };
    }
  }
  if (qa9.baseline_id !== baselineId || qa9.completion_status !== "COMPLETE") {
    return { ready: false, reason: "QA9 not COMPLETE on current baseline" };
  }
  if (qa9.verdict !== "ENGINE_ACCEPTED_FOR_UI" || qa9.engine_accepted_for_ui !== "ISSUED") {
    return { ready: false, reason: "QA9 current-epoch verdict not issued" };
  }
  return { ready: true, reason: "" };
}

function needle(doc, key, value) {
  const re = new RegExp(
    "(?:^|\\r?\\n)" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " = " + String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:\\r?\\n|$)",
  );
  return re.test(doc);
}

function evaluate(root) {
  const planText = readPlan(root);
  const collected = collectPsmFromPlan(planText);
  const yamlDeps = parseRel502YamlDeps(planText);
  const scope = compareProtectedScope();
  const qa = currentEpochQaReady(root, scope.baselineId);
  const pendingRels = collected.rels.filter((b) => b.status !== "COMPLETED");
  const pendingPosts = collected.posts.filter((b) => b.status !== "COMPLETED");
  const plan502Done =
    todoCompleted(planText, "REL-502") || yamlCompleted(planText, "REL-502");
  const canIssue = !scope.drift && qa.ready && pendingRels.length === 0;
  return {
    planText,
    collected,
    yamlDeps,
    scope,
    qa,
    pendingRels,
    pendingPosts,
    plan502Done,
    canIssue,
    certRel: CERT_REL,
  };
}

module.exports = {
  PLAN_REL,
  SCOPE_REL,
  BASELINE_REL,
  EVIDENCE_REL,
  QA9_REL,
  CERT_REL,
  collectPsmFromPlan,
  yamlStatus,
  yamlCompleted,
  todoStatus,
  todoCompleted,
  parseRel502YamlDeps,
  compareProtectedScope,
  currentEpochQaReady,
  needle,
  evaluate,
};
