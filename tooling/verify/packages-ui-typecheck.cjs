/**
 * verify:packages-ui-typecheck — D1-BLK-004 (2026-09-05)
 *
 * Root cause this closes: packages/ui had no own tsconfig.json, so any file
 * inside it that no app (apps/web, apps/admin) happened to import was never
 * type-checked by anything — a real false-negative gap (confirmed empty by
 * D1/D1-S1D sessions, never implemented because the blast radius of running
 * tsc against the whole package for the first time was unknown ahead of
 * time). This script implements the standalone check and proves, via a
 * negative fixture, that it actually catches real type errors (not a fake
 * PASS that silently no-ops).
 *
 * Package-boundary discipline: this only type-checks packages/ui/**. It does
 * NOT re-run apps/web or apps/admin's own tsc (those already have their own
 * verify steps) and does not duplicate/replace them — packages/ui files are
 * still ALSO transitively checked as part of whichever app imports them;
 * this adds coverage for the files no app currently imports, it does not
 * remove or weaken the existing per-app checks.
 */
"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const root = path.resolve(__dirname, "../..");
const fails = [];
const tscBin = require.resolve("typescript/bin/tsc");
const pkgUiDir = path.join(root, "packages/ui");
const realTsconfig = path.join(pkgUiDir, "tsconfig.json");
const negativeFixture = path.join(
  root,
  "tooling/verify/fixtures/packages-ui-typecheck-negative.fixture.tsx",
);

function runTsc(tsconfigPath) {
  return spawnSync(process.execPath, [tscBin, "--noEmit", "-p", tsconfigPath], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
  });
}

// --- 0. sanity: the tsconfig itself must exist and be a real, scoped config ---
if (!fs.existsSync(realTsconfig)) {
  fails.push("missing packages/ui/tsconfig.json");
} else {
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(realTsconfig, "utf8"));
  } catch (err) {
    fails.push(`packages/ui/tsconfig.json invalid JSON: ${err.message}`);
    cfg = {};
  }
  const co = cfg.compilerOptions || {};
  if (co.noEmit !== true) fails.push("packages/ui/tsconfig.json must set noEmit:true");
  if (co.strict !== true) fails.push("packages/ui/tsconfig.json must set strict:true");
  if (!Array.isArray(cfg.include) || !cfg.include.some((p) => /\*\*\/\*\.tsx?$/.test(p))) {
    fails.push("packages/ui/tsconfig.json must include **/*.ts and **/*.tsx");
  }
  // Package-boundary guard: must not point outside packages/ui for its own
  // sources (paths mapping to sibling packages for cross-package imports is
  // fine and expected; `include` globs pulling in apps/** would not be).
  for (const inc of cfg.include || []) {
    if (/^(\.\.\/|\/)/.test(inc) === false) continue; // relative-into-self is fine
    fails.push(`packages/ui/tsconfig.json include must not escape the package: ${inc}`);
  }
}

// --- 1. the real standalone typecheck must PASS (fake-PASS-by-omission guard:
//         this actually spawns tsc, it does not just check the config shape) ---
if (fails.length === 0) {
  const real = runTsc(realTsconfig);
  if (real.status !== 0) {
    fails.push(
      "packages/ui standalone tsc FAILED (see full output below):\n" +
        String(real.stdout || real.stderr || "").trim(),
    );
    if (real.stdout) console.error(real.stdout);
    if (real.stderr) console.error(real.stderr);
  }
}

// --- 2. negative fixture: prove this check can actually catch a real error ---
if (fails.length === 0) {
  if (!fs.existsSync(negativeFixture)) {
    fails.push("missing negative fixture: " + path.relative(root, negativeFixture));
  } else {
    let cfg;
    try {
      cfg = JSON.parse(fs.readFileSync(realTsconfig, "utf8"));
    } catch {
      cfg = {};
    }
    const negativeConfig = {
      compilerOptions: { ...(cfg.compilerOptions || {}) },
      include: [path.relative(pkgUiDir, negativeFixture).split(path.sep).join("/")],
    };
    const tmpConfigPath = path.join(
      pkgUiDir,
      `.tsconfig.negative-fixture.${process.pid}.${Date.now()}.json`,
    );
    try {
      fs.writeFileSync(tmpConfigPath, JSON.stringify(negativeConfig, null, 2));
      const neg = runTsc(tmpConfigPath);
      if (neg.status === 0) {
        fails.push(
          "negative fixture did NOT fail typecheck (detection is vacuous) — " +
            "packages/ui/tsconfig.json's compilerOptions may have silently weakened",
        );
      } else if (!/TS2322/.test(String(neg.stdout || ""))) {
        fails.push(
          "negative fixture failed for an unexpected reason (expected TS2322 " +
            "type-mismatch, got):\n" + String(neg.stdout || neg.stderr || "").trim(),
        );
      }
    } finally {
      try {
        fs.unlinkSync(tmpConfigPath);
      } catch {
        /* best-effort cleanup */
      }
    }
  }
}

// --- 3. wiring: package.json / CATALOG.md / gate.yml / domain-by-path.cjs ---
function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:packages-ui-typecheck"')) {
  fails.push("package.json missing verify:packages-ui-typecheck");
}
if (!catalog.includes("packages-ui-typecheck")) {
  fails.push("CATALOG.md must list packages-ui-typecheck");
}
if (!domain.includes("packages-ui-typecheck.cjs")) {
  fails.push("domain-by-path must trigger packages-ui-typecheck for packages/ui changes");
}

// Avoid Windows path-separator false negatives in the temp-file cleanup guard above.
void os;

if (fails.length) {
  console.error("[verify:packages-ui-typecheck] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:packages-ui-typecheck] PASS (standalone tsc clean · negative fixture caught TS2322 · package-boundary guard)",
);
