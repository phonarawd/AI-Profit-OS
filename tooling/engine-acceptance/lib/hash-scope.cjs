/**
 * Protected-scope hash 산출 (SSOT 규칙 = governance/engine-acceptance/protected-scope.v1.json)
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../../..");

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function normPath(p) {
  return String(p).replace(/\\/g, "/");
}

function sha256Buffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** LF 정규화 후 SHA-256 */
function hashFileBytes(absPath) {
  const raw = fs.readFileSync(absPath);
  const text = raw.toString("utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return sha256Buffer(Buffer.from(text, "utf8"));
}

function matchGlob(relPosix, pattern) {
  // 최소 glob: ** / * 지원
  const esc = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "::DS::")
    .replace(/\*/g, "[^/]*")
    .replace(/::DS::/g, ".*");
  return new RegExp(`^${esc}$`).test(relPosix);
}

function isExcluded(relPosix, excludeGlobs) {
  return excludeGlobs.some((g) => matchGlob(relPosix, g));
}

function walkFiles(absDir, rootRel, excludeGlobs, out) {
  if (!fs.existsSync(absDir)) return;
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const ent of entries) {
    const abs = path.join(absDir, ent.name);
    const rel = normPath(path.join(rootRel, ent.name));
    if (isExcluded(rel, excludeGlobs) || isExcluded(`${rel}/`, excludeGlobs)) continue;
    if (ent.isDirectory()) {
      walkFiles(abs, rel, excludeGlobs, out);
    } else if (ent.isFile()) {
      out.push(rel);
    }
  }
}

function collectPaths(scope) {
  const files = [];
  for (const rootRel of scope.roots) {
    const abs = path.join(ROOT, rootRel);
    if (!fs.existsSync(abs)) continue;
    const st = fs.statSync(abs);
    if (st.isFile()) {
      const rel = normPath(rootRel);
      if (!isExcluded(rel, scope.excludeGlobs)) files.push(rel);
    } else {
      walkFiles(abs, normPath(rootRel), scope.excludeGlobs, files);
    }
  }
  files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return files;
}

function buildManifest(scope) {
  const paths = collectPaths(scope);
  const entries = paths.map((rel) => ({
    path: rel,
    sha256: hashFileBytes(path.join(ROOT, rel)),
  }));
  const aggregate = sha256Buffer(
    Buffer.from(
      entries.map((e) => `${e.path}\0${e.sha256}\n`).join(""),
      "utf8",
    ),
  );
  return { entries, aggregate, pathCount: entries.length };
}

function hashPathList(relPaths, scope) {
  const entries = [];
  for (const relRaw of relPaths) {
    const rel = normPath(relRaw);
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      entries.push({ path: rel, sha256: scope.normalization.emptyFileHash, missing: true });
      continue;
    }
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      const files = [];
      walkFiles(abs, rel, scope.excludeGlobs, files);
      files.sort();
      for (const f of files) {
        entries.push({ path: f, sha256: hashFileBytes(path.join(ROOT, f)) });
      }
    } else {
      entries.push({ path: rel, sha256: hashFileBytes(abs) });
    }
  }
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return sha256Buffer(
    Buffer.from(entries.map((e) => `${e.path}\0${e.sha256}\n`).join(""), "utf8"),
  );
}

function git(cmd) {
  // trimEnd only — trim() would eat porcelain XY's leading space (` M path`).
  return execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trimEnd();
}

/** `git status --porcelain` 한 줄 → 경로. 선행 공백은 XY 상태라 지우지 않는다. */
function parsePorcelainLine(line) {
  const raw = String(line || "").replace(/\r$/, "");
  if (!raw) return null;
  const m = raw.match(/^.. (?:.* -> )?(.*)$/);
  if (!m) return null;
  let p = m[1];
  if (p.startsWith('"') && p.endsWith('"') && p.length >= 2) {
    p = p
      .slice(1, -1)
      .replace(/\\\\/g, "\\")
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
  }
  return normPath(p);
}

function inspectDirtyPath(rel) {
  const q = String(rel).replace(/"/g, '\\"');
  const run = (cmd) => {
    try {
      return execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trimEnd();
    } catch {
      return "";
    }
  };
  const raw = run(`git diff --raw -- "${q}"`) || "(no-raw-diff)";
  const stat = run(`git diff --stat -- "${q}"`) || "(no-stat)";
  const head = run(`git rev-parse HEAD:${q}`) || "NA";
  const workRaw = run(`git hash-object -- "${q}"`) || "NA";
  const workFiltered = run(`git hash-object --path="${q}" -- "${q}"`) || "NA";
  return {
    rel: normPath(rel),
    raw,
    stat,
    head,
    workRaw,
    workFiltered,
    sameBlob: head !== "NA" && workFiltered !== "NA" && head === workFiltered,
  };
}

/** git porcelain 경로가 해시 exclude(dist/target 등)면 protected dirty가 아니다. */
function isScopeExcluded(relPosix, excludeGlobs) {
  const p = normPath(relPosix).replace(/\/$/, "");
  const candidates = [p, `${p}/`, `${p}/x`];
  const segs = p.split("/").filter(Boolean);
  for (let i = 1; i < segs.length; i += 1) {
    candidates.push(`${segs.slice(0, i).join("/")}/x`);
  }
  return candidates.some((c) => isExcluded(c, excludeGlobs || []));
}

function dualDirty(scope) {
  try {
    execSync("git update-index --refresh -q", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    // refresh exits 1 when some paths are actually dirty — expected
  }

  let porcelain;
  try {
    porcelain = git("git status --porcelain");
  } catch {
    porcelain = "";
  }
  const dirtyAll = porcelain
    .split(/\r?\n/)
    .map((l) => l.replace(/\r$/, ""))
    .filter(Boolean)
    .map(parsePorcelainLine)
    .filter(Boolean);

  const roots = scope.roots.map(normPath);
  const excludeGlobs = scope.excludeGlobs || [];
  const dirtyProtected = dirtyAll.filter(
    (p) =>
      roots.some((r) => p === r || p.startsWith(`${r}/`)) &&
      !isScopeExcluded(p, excludeGlobs),
  );

  return {
    working_tree_clean: dirtyAll.length === 0,
    protected_scope_clean: dirtyProtected.length === 0,
    dirtyPathsAll: dirtyAll,
    dirtyPathsProtected: dirtyProtected,
    dirtyInspect: dirtyProtected.slice(0, 20).map(inspectDirtyPath),
  };
}

function packageManagerVersion() {
  try {
    return `pnpm@${execSync("pnpm -v", { cwd: ROOT, encoding: "utf8" }).trim()}`;
  } catch {
    return "pnpm@unknown";
  }
}

function nodeVersion() {
  return process.version.replace(/^v/, "v"); // keep v prefix style e.g. v22.14.0
}

module.exports = {
  ROOT,
  readJson,
  normPath,
  sha256Buffer,
  hashFileBytes,
  buildManifest,
  hashPathList,
  dualDirty,
  isScopeExcluded,
  parsePorcelainLine,
  inspectDirtyPath,
  git,
  packageManagerVersion,
  nodeVersion,
};
