/**
 * stub 입력 해시 캐시 — 스크립트와 읽은 레포 파일이 그대로면 PASS 재사용.
 * child_process / spawn 을 쓰는 스크립트는 캐시하지 않음(fail-closed).
 * CI / AIPO_VERIFY_NO_CACHE=1 / AIPO_GATE_NO_STAMP=1 에서는 항상 실실행.
 */
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../..");
const cacheDir = path.join(root, ".cache", "verify-stub");
const UNCACHEABLE_RE =
  /child_process|spawnSync|execFileSync|execSync|\bspawn\(|\bfork\(/;

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function rawFileSha(abs) {
  try {
    if (!fs.existsSync(abs)) return "missing";
    const st = fs.statSync(abs);
    if (st.isDirectory()) return "dir";
    return sha256(fs.readFileSync(abs));
  } catch {
    return "unreadable";
  }
}

function relFromRoot(abs) {
  return path.relative(root, abs).split(path.sep).join("/");
}

function isRepoPath(abs) {
  const rel = path.relative(root, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return false;
  const top = rel.split(path.sep)[0];
  if (top === "node_modules" || top === ".cache") return false;
  if (rel.includes("node_modules")) return false;
  return true;
}

function cachePath(scriptAbs) {
  return path.join(cacheDir, path.basename(scriptAbs, ".cjs") + ".json");
}

function envLocked(env) {
  const e = env || process.env;
  return (
    e.CI === "true" ||
    e.GITHUB_ACTIONS === "true" ||
    e.AIPO_VERIFY_NO_CACHE === "1" ||
    e.AIPO_GATE_NO_STAMP === "1"
  );
}

function isUncacheable(scriptAbs) {
  try {
    return UNCACHEABLE_RE.test(fs.readFileSync(scriptAbs, "utf8"));
  } catch {
    return true;
  }
}

function readCache(scriptAbs) {
  const p = cachePath(scriptAbs);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!raw || raw.v !== 1) return null;
    return raw;
  } catch {
    return null;
  }
}

function inputsMatch(inputs) {
  if (!inputs || typeof inputs !== "object") return false;
  for (const [rel, want] of Object.entries(inputs)) {
    if (rawFileSha(path.join(root, rel)) !== want) return false;
  }
  return true;
}

function tryHit(scriptAbs, env) {
  if (envLocked(env)) return false;
  if (isUncacheable(scriptAbs)) return false;
  const cached = readCache(scriptAbs);
  if (!cached || cached.status !== 0) return false;
  if (cached.stubSha !== rawFileSha(scriptAbs)) return false;
  return inputsMatch(cached.inputs);
}

function withFsTrace(fn) {
  const inputs = {};
  const orig = {
    readFileSync: fs.readFileSync,
    existsSync: fs.existsSync,
    statSync: fs.statSync,
    lstatSync: fs.lstatSync,
    readdirSync: fs.readdirSync,
  };

  function recordFile(abs) {
    if (!isRepoPath(abs)) return;
    const rel = relFromRoot(abs);
    if (rel in inputs) return;
    try {
      if (!orig.existsSync.call(fs, abs)) {
        inputs[rel] = "missing";
        return;
      }
      const st = orig.statSync.call(fs, abs);
      if (st.isDirectory()) {
        inputs[rel] = "dir";
        return;
      }
      inputs[rel] = sha256(orig.readFileSync.call(fs, abs));
    } catch {
      inputs[rel] = "unreadable";
    }
  }

  fs.readFileSync = function (p, ...rest) {
    recordFile(path.resolve(String(p)));
    return orig.readFileSync.call(fs, p, ...rest);
  };
  fs.existsSync = function (p) {
    recordFile(path.resolve(String(p)));
    return orig.existsSync.call(fs, p);
  };
  fs.statSync = function (p, ...rest) {
    recordFile(path.resolve(String(p)));
    return orig.statSync.call(fs, p, ...rest);
  };
  fs.lstatSync = function (p, ...rest) {
    recordFile(path.resolve(String(p)));
    return orig.lstatSync.call(fs, p, ...rest);
  };
  fs.readdirSync = function (p, ...rest) {
    const abs = path.resolve(String(p));
    if (isRepoPath(abs)) {
      const rel = relFromRoot(abs);
      try {
        const names = orig.readdirSync.call(fs, p);
        const list = Array.isArray(names)
          ? names
              .map((n) => (typeof n === "string" ? n : n.name))
              .sort()
              .join("\n")
          : "";
        inputs[rel] = "readdir:" + sha256(list);
      } catch {
        inputs[rel] = "readdir:fail";
      }
    }
    return orig.readdirSync.call(fs, p, ...rest);
  };

  try {
    return { result: fn(), inputs };
  } finally {
    fs.readFileSync = orig.readFileSync;
    fs.existsSync = orig.existsSync;
    fs.statSync = orig.statSync;
    fs.lstatSync = orig.lstatSync;
    fs.readdirSync = orig.readdirSync;
  }
}

function remember(scriptAbs, inputs, status, env) {
  if (status !== 0 || envLocked(env) || isUncacheable(scriptAbs)) return;
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(
    cachePath(scriptAbs),
    JSON.stringify({
      v: 1,
      stubSha: rawFileSha(scriptAbs),
      inputs,
      status: 0,
    }),
  );
}

module.exports = {
  tryHit,
  withFsTrace,
  remember,
  isUncacheable,
  envLocked,
};
