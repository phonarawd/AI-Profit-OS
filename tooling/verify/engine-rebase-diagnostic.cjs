"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(process.env.AIPO_DIAG_ROOT || path.resolve(__dirname, "../.."));

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}
function sha256Buffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
function hashFile(abs) {
  const text = fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return sha256Buffer(Buffer.from(text, "utf8"));
}
function excluded(rel) {
  const p = String(rel).replace(/\\/g, "/");
  return (
    p.includes("/node_modules/") ||
    p.includes("/dist/") ||
    p.includes("/coverage/") ||
    p.includes("/target/") ||
    p.includes("/.next/") ||
    /(^|\/)_[^/]*tmp/i.test(p) ||
    /\.log$/i.test(p)
  );
}
function walk(abs, rel, out) {
  if (!fs.existsSync(abs)) return;
  const st = fs.statSync(abs);
  if (st.isFile()) {
    if (!excluded(rel)) out.push(rel.replace(/\\/g, "/"));
    return;
  }
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const childRel = path.join(rel, ent.name).replace(/\\/g, "/");
    if (excluded("/" + childRel + (ent.isDirectory() ? "/" : ""))) continue;
    walk(path.join(abs, ent.name), childRel, out);
  }
}
function hashPathList(relPaths, scope) {
  const entries = [];
  for (const relRaw of relPaths) {
    const rel = String(relRaw).replace(/\\/g, "/");
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      entries.push({
        path: rel,
        sha256: scope.normalization?.emptyFileHash,
      });
      continue;
    }
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      const files = [];
      walk(abs, rel, files);
      files.sort();
      for (const file of files) {
        entries.push({ path: file, sha256: hashFile(path.join(ROOT, file)) });
      }
    } else {
      entries.push({ path: rel, sha256: hashFile(abs) });
    }
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  return sha256Buffer(
    Buffer.from(entries.map((e) => `${e.path}\0${e.sha256}\n`).join(""), "utf8"),
  );
}
function buildManifest(scope) {
  const files = [];
  for (const rootRel of scope.roots || []) {
    walk(path.join(ROOT, rootRel), rootRel, files);
  }
  files.sort();
  const entries = files.map((p) => ({ path: p, sha256: hashFile(path.join(ROOT, p)) }));
  const aggregate = sha256Buffer(
    Buffer.from(entries.map((e) => `${e.path}\0${e.sha256}\n`).join(""), "utf8"),
  );
  return { entries, aggregate, pathCount: entries.length };
}

const baseline = readJson("governance/engine-acceptance/baseline.v1.json");
const scope = readJson("governance/engine-acceptance/protected-scope.v1.json");
const finalAcceptance = fs.readFileSync(
  path.join(ROOT, "governance/engine-acceptance/FINAL_ACCEPTANCE.md"),
  "utf8",
);
const liveManifest = buildManifest(scope);
const baselineEntries = new Map(
  (baseline.protected_scope_manifest?.entries || []).map((e) => [e.path, e.sha256]),
);
const liveEntries = new Map(liveManifest.entries.map((e) => [e.path, e.sha256]));
const added = [];
const mutated = [];
const missing = [];
for (const [p, h] of liveEntries) {
  if (!baselineEntries.has(p)) added.push(p);
  else if (baselineEntries.get(p) !== h) mutated.push(p);
}
for (const p of baselineEntries.keys()) {
  if (!liveEntries.has(p)) missing.push(p);
}

const hashes = {};
for (const [name, paths] of Object.entries(scope.aggregateHashes || {})) {
  const live = hashPathList(paths, scope);
  hashes[name] = {
    pinned: baseline[name] || null,
    live,
    status: baseline[name] === live ? "MATCH" : "MISMATCH",
  };
}

assert.match(finalAcceptance, /STATUS = NOT_ISSUED/);
assert.match(finalAcceptance, /REBASE_REQUIRED = 1/);
assert.match(finalAcceptance, /ACK_RECEIVED = 0/);
assert.match(finalAcceptance, /NEXT = ENGINE_ACCEPTANCE_REBASE_V1/);

const report = {
  schema: "gpt.engine-rebase-diagnostic.v2",
  label: process.env.AIPO_DIAG_LABEL || "unspecified",
  target_commit: process.env.AIPO_DIAG_SHA || null,
  baseline_id: baseline.id,
  baseline_commit: baseline.commit_sha,
  baseline_manifest: baseline.protected_scope_manifest?.aggregate || null,
  live_manifest: liveManifest.aggregate,
  baseline_path_count: baseline.protected_scope_manifest?.pathCount || 0,
  live_path_count: liveManifest.pathCount,
  changed_paths: added.length + mutated.length + missing.length,
  added_paths: added.length,
  mutated_paths: mutated.length,
  missing_paths: missing.length,
  hashes,
  acceptance: {
    status: "NOT_ISSUED",
    rebase_required: true,
    ack_received: false,
    next: "ENGINE_ACCEPTANCE_REBASE_V1",
  },
  sample: {
    added: added.slice(0, 25),
    mutated: mutated.slice(0, 25),
    missing: missing.slice(0, 25),
  },
};
console.log(JSON.stringify(report, null, 2));
