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
  return execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trim();
}

function dualDirty(scope) {
  let porcelain;
  try {
    porcelain = git("git status --porcelain");
  } catch {
    porcelain = "";
  }
  const dirtyAll = porcelain
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter(Boolean)
    .map((line) => {
      // XY PATH or XY ORIG -> PATH
      const m = line.match(/^.. (?:.* -> )?(.*)$/);
      return m ? normPath(m[1]) : null;
    })
    .filter(Boolean);

  const roots = scope.roots.map(normPath);
  const dirtyProtected = dirtyAll.filter((p) =>
    roots.some((r) => p === r || p.startsWith(`${r}/`)),
  );

  return {
    working_tree_clean: dirtyAll.length === 0,
    protected_scope_clean: dirtyProtected.length === 0,
    dirtyPathsAll: dirtyAll,
    dirtyPathsProtected: dirtyProtected,
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
  git,
  packageManagerVersion,
  nodeVersion,
};
