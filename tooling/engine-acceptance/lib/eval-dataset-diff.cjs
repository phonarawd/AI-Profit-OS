/**
 * eval/ JSONL 케이스 diff — ENGINE_ACCEPTANCE_REBASE_EVAL_REVIEW_V1 전용
 *
 * product-only rebase(ENGINE_ACCEPTANCE_REBASE_V1)의 eval MATCH 가드를 바꾸지 않는다.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, normPath, git, hashFileBytes } = require("./hash-scope.cjs");

const EVAL_ROOT = "eval";

const SAFETY_FILES = Object.freeze([
  "eval/s_refuse.jsonl",
  "eval/g_scope_escape.jsonl",
  "eval/g_no_money.jsonl",
  "eval/rel-302-safe-refuse.jsonl",
  "eval/rel-303-red-team.jsonl",
]);

const CONSTRAINT_KEYS = Object.freeze([
  "expectLane",
  "expectPath",
  "expectAnswerPath",
  "expectPathAny",
  "expectTools",
  "expectToolsAny",
  "expectScope",
  "expectGuard",
  "expectThrow",
  "expectAnswerIncludes",
  "expectUngrounded",
  "expectUnavailable",
  "expectLeak",
  "forbidMoneyHallucination",
  "forbidMutateTools",
  "forbidExecute",
  "forbidPlatformMoneyTools",
  "forbidGuarantee",
  "forbidInventedUsdt",
  "forbidInventedZero",
  "forbidCoerceZero",
  "unavailableIfNoFact",
  "assurance",
  "overRefusal",
  "assertLaneToolsForbidden",
  "needSourceAsOf",
]);

const SEMANTIC = Object.freeze({
  STRICTER: "STRICTER",
  WEAKER: "WEAKER",
  NEUTRAL: "NEUTRAL",
  MIXED: "MIXED",
});

function parseJsonl(text) {
  const cases = [];
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      obj = { _unparsed: line, _parse_error: true };
    }
    const id = obj && obj.id ? String(obj.id) : `line:${i + 1}`;
    cases.push({ id, line, obj });
  }
  return cases;
}

function listEvalFilesFromDisk(root = ROOT) {
  const abs = path.join(root, EVAL_ROOT);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((n) => n.endsWith(".jsonl"))
    .map((n) => normPath(`${EVAL_ROOT}/${n}`))
    .sort();
}

function listEvalFilesFromGit(commitSha) {
  const out = git(`git ls-tree -r --name-only ${commitSha} -- ${EVAL_ROOT}`);
  if (!out) return [];
  return out
    .split(/\r?\n/)
    .map((p) => normPath(p.trim()))
    .filter((p) => p.endsWith(".jsonl"))
    .sort();
}

function readEvalFileFromGit(commitSha, rel) {
  try {
    return git(`git show ${commitSha}:${rel}`);
  } catch {
    return null;
  }
}

function readEvalFileFromDisk(rel, root = ROOT) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, "utf8");
}

function caseMap(cases) {
  const m = new Map();
  for (const c of cases) m.set(c.id, c);
  return m;
}

function assertionWeakened(oldObj, newObj) {
  const reasons = [];
  if (!oldObj || !newObj) return reasons;
  for (const k of CONSTRAINT_KEYS) {
    const a = oldObj[k];
    const b = newObj[k];
    if (a === undefined && b === undefined) continue;
    if (typeof a === "boolean" && a === true && b !== true) {
      reasons.push(`${k}: true → ${JSON.stringify(b)}`);
    }
    if (Array.isArray(a) && a.length > 0 && (!Array.isArray(b) || b.length === 0)) {
      reasons.push(`${k}: required array removed`);
    }
    if (typeof a === "string" && a && (b === undefined || b === null || b === "")) {
      reasons.push(`${k}: required string removed`);
    }
  }
  if (oldObj.expectLane === "S" && newObj.expectLane && newObj.expectLane !== "S") {
    reasons.push(`expectLane: S → ${newObj.expectLane}`);
  }
  if (
    (oldObj.expectPath === "refuse_s" || oldObj.expectAnswerPath === "refuse_s") &&
    newObj.expectPath !== "refuse_s" &&
    newObj.expectAnswerPath !== "refuse_s" &&
    !(Array.isArray(newObj.expectPathAny) && newObj.expectPathAny.includes("refuse_s"))
  ) {
    reasons.push("refuse_s path dropped");
  }
  if (
    (oldObj.expectPath === "scope_redirect" || oldObj.expectAnswerPath === "scope_redirect") &&
    newObj.expectPath !== "scope_redirect" &&
    newObj.expectAnswerPath !== "scope_redirect" &&
    !(Array.isArray(newObj.expectPathAny) && newObj.expectPathAny.includes("scope_redirect"))
  ) {
    reasons.push("scope_redirect path dropped");
  }
  return reasons;
}

function fileSemantic({ added, removed, modified, weakened, isSafety }) {
  if (weakened.length > 0) return SEMANTIC.WEAKER;
  if (removed.length > 0 && added.length > 0) return SEMANTIC.MIXED;
  if (removed.length > 0 && isSafety) return SEMANTIC.WEAKER;
  if (removed.length > 0) return SEMANTIC.MIXED;
  if (added.length > 0) return SEMANTIC.STRICTER;
  if (modified.length > 0) return SEMANTIC.MIXED;
  return SEMANTIC.NEUTRAL;
}

function rollupSemantic(effects) {
  const set = new Set(effects);
  if (set.has(SEMANTIC.WEAKER)) return SEMANTIC.WEAKER;
  if (set.has(SEMANTIC.MIXED)) return SEMANTIC.MIXED;
  if (set.has(SEMANTIC.STRICTER)) return SEMANTIC.STRICTER;
  return SEMANTIC.NEUTRAL;
}

function diffOneFile(rel, oldText, newText) {
  const oldCases = oldText == null ? [] : parseJsonl(oldText);
  const newCases = newText == null ? [] : parseJsonl(newText);
  const oldM = caseMap(oldCases);
  const newM = caseMap(newCases);
  const added = [];
  const removed = [];
  const modified = [];
  const weakened = [];
  for (const [id, c] of newM) {
    if (!oldM.has(id)) added.push(id);
  }
  for (const [id] of oldM) {
    if (!newM.has(id)) removed.push(id);
  }
  for (const [id, nc] of newM) {
    const oc = oldM.get(id);
    if (!oc) continue;
    if (oc.line !== nc.line) {
      modified.push(id);
      const w = assertionWeakened(oc.obj, nc.obj);
      if (w.length) weakened.push({ id, reasons: w });
    }
  }
  const isSafety = SAFETY_FILES.includes(rel);
  const semantic_effect = fileSemantic({
    added,
    removed,
    modified,
    weakened,
    isSafety,
  });
  return {
    path: rel,
    old_case_count: oldCases.length,
    new_case_count: newCases.length,
    added: added.slice().sort(),
    removed: removed.slice().sort(),
    modified: modified.slice().sort(),
    weakened,
    semantic_effect,
    is_safety_file: isSafety,
    existed_before: oldText != null,
    exists_now: newText != null,
  };
}

function diffEvalSnapshots(oldMap, newMap) {
  const paths = new Set([...oldMap.keys(), ...newMap.keys()]);
  const files = [];
  for (const rel of [...paths].sort()) {
    files.push(diffOneFile(rel, oldMap.get(rel) ?? null, newMap.get(rel) ?? null));
  }
  const changed = files.filter(
    (f) =>
      f.added.length ||
      f.removed.length ||
      f.modified.length ||
      f.existed_before !== f.exists_now ||
      f.old_case_count !== f.new_case_count,
  );
  const totals = {
    files_changed: changed.length,
    added: changed.reduce((n, f) => n + f.added.length, 0),
    removed: changed.reduce((n, f) => n + f.removed.length, 0),
    modified: changed.reduce((n, f) => n + f.modified.length, 0),
    weakened_assertions: changed.reduce((n, f) => n + f.weakened.length, 0),
    removed_safety_cases: changed
      .filter((f) => f.is_safety_file)
      .reduce((n, f) => n + f.removed.length, 0),
    disabled_eval_files: files.filter((f) => f.existed_before && !f.exists_now).length,
  };
  return {
    files,
    changed_files: changed,
    totals,
    coverage_effect: rollupSemantic(changed.map((f) => f.semantic_effect)),
    safety_coverage_weakened: totals.removed_safety_cases > 0 || totals.weakened_assertions > 0,
  };
}

function loadEvalMapFromGit(commitSha) {
  const map = new Map();
  for (const rel of listEvalFilesFromGit(commitSha)) {
    const text = readEvalFileFromGit(commitSha, rel);
    if (text != null) map.set(rel, text);
  }
  return map;
}

function loadEvalMapFromDisk(root = ROOT) {
  const map = new Map();
  for (const rel of listEvalFilesFromDisk(root)) {
    const text = readEvalFileFromDisk(rel, root);
    if (text != null) map.set(rel, text);
  }
  return map;
}

function diffEvalGitToDisk(predecessorCommit, root = ROOT) {
  return diffEvalSnapshots(loadEvalMapFromGit(predecessorCommit), loadEvalMapFromDisk(root));
}

function fileSha256(rel, root = ROOT) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return null;
  return hashFileBytes(abs);
}

module.exports = {
  EVAL_ROOT,
  SAFETY_FILES,
  CONSTRAINT_KEYS,
  SEMANTIC,
  parseJsonl,
  listEvalFilesFromDisk,
  listEvalFilesFromGit,
  readEvalFileFromGit,
  readEvalFileFromDisk,
  diffOneFile,
  diffEvalSnapshots,
  loadEvalMapFromGit,
  loadEvalMapFromDisk,
  diffEvalGitToDisk,
  fileSha256,
};
