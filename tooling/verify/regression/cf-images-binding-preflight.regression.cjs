/**
 * Regression test for tooling/deploy/cf-images-binding-preflight.cjs (D1 6-G,
 * rewritten by S1C 2026-09-05).
 *
 * Run: node tooling/verify/regression/cf-images-binding-preflight.regression.cjs
 *
 * This is a plain Node assertion script (no test framework is wired into
 * tooling/verify|deploy/ in this repo), consistent with the sibling
 * home-product-contract.regression.cjs. It performs pure, in-memory checks
 * against synthetic wrangler.toml / next.config text (via dependency
 * injection - `evaluateSurface`'s text args and `evaluateAll`'s injectable
 * `fsImpl`) - it does not write any file, and only READS the real tree once,
 * for the end-to-end assertion at the bottom.
 *
 * Coverage required by the D1-S1C mandate section 5 ("최소 negative-control
 * regression cases"), each mapped 1:1 to a mandate bullet:
 *   1. top-level images만 존재 -> named env FAIL
 *   2. preview만 존재 -> production FAIL
 *   3. production만 존재 -> preview FAIL
 *   4. binding 이름이 다름 -> FAIL
 *   5. 필수 vars가 top-level에만 존재 -> named env FAIL
 *   6. web만 정상/ops 누락 -> FAIL
 *   7. 두 surface의 모든 effective env 정상 -> PASS
 * Plus 3 bonus cases directly exercising requirement #9 (custom loader
 * exceptions must be PROVEN, not just string-present), and an end-to-end
 * real-tree run.
 */
"use strict";

const path = require("node:path");
const {
  evaluateSurface,
  evaluateAll,
  SURFACES,
} = require("../../deploy/cf-images-binding-preflight.cjs");

const root = path.resolve(__dirname, "../../..");
const failures = [];

function expect(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures.push(`${label}: expected ${e}, got ${a}`);
  }
}

function expectTrue(label, cond) {
  if (!cond) failures.push(`${label}: expected true, got false`);
}

const WEB_SURFACE = SURFACES.find((s) => s.label.startsWith("web"));
const OPS_SURFACE = SURFACES.find((s) => s.label.startsWith("ops"));

// A fully-correct web-shaped wrangler.toml (mirrors the real, corrected
// infra/web/wrangler.toml's structurally-relevant parts).
const FULL_CORRECT_WEB_TOML = `
name = "ai-profit-web"
account_id = "x"
main = "x"
compatibility_date = "2025-03-01"
workers_dev = true

[assets]
directory = "x"
binding = "ASSETS"

[images]
binding = "IMAGES"

[vars]
APP_NAME = "a"
PLATFORM_NAME = "b"

[env.preview]
name = "ai-profit-web-preview"
workers_dev = true

[env.preview.images]
binding = "IMAGES"

[env.preview.vars]
APP_NAME = "a"
PLATFORM_NAME = "b"

[env.production]
name = "ai-profit-web"
workers_dev = true

[env.production.images]
binding = "IMAGES"

[env.production.vars]
APP_NAME = "a"
PLATFORM_NAME = "b"
`;

const FULL_CORRECT_OPS_TOML = FULL_CORRECT_WEB_TOML.replace(/PLATFORM_NAME = "b"/g, 'ROBOTS = "noindex, nofollow"');

function noLoader() {
  return null;
}

// --- 1. top-level images only (named env sections exist but declare
//        neither images nor vars of their own) -> FAIL for BOTH envs ---
{
  const toml = `
[images]
binding = "IMAGES"

[vars]
APP_NAME = "a"
PLATFORM_NAME = "b"

[env.preview]
name = "x-preview"
workers_dev = true

[env.production]
name = "x"
workers_dev = true
`;
  const r = evaluateSurface(WEB_SURFACE, toml, null, noLoader);
  expectTrue("case1 preview imagesOk must be false (top-level-only)", r.perEnv.preview.imagesOk === false);
  expectTrue("case1 production imagesOk must be false (top-level-only)", r.perEnv.production.imagesOk === false);
  expectTrue("case1 preview varsOk must be false (top-level-only)", r.perEnv.preview.varsOk === false);
  expectTrue("case1 production varsOk must be false (top-level-only)", r.perEnv.production.varsOk === false);
  expectTrue("case1 must produce fails", r.fails.length > 0);
}

// --- 2. preview only -> production FAIL (preview itself must PASS) ---
{
  const toml = FULL_CORRECT_WEB_TOML.replace(
    /\[env\.production\.images\]\nbinding = "IMAGES"\n\n\[env\.production\.vars\]\nAPP_NAME = "a"\nPLATFORM_NAME = "b"\n/,
    "",
  );
  const r = evaluateSurface(WEB_SURFACE, toml, null, noLoader);
  expectTrue("case2 preview imagesOk must be true", r.perEnv.preview.imagesOk === true);
  expectTrue("case2 preview varsOk must be true", r.perEnv.preview.varsOk === true);
  expectTrue("case2 production imagesOk must be false", r.perEnv.production.imagesOk === false);
  expectTrue("case2 production varsOk must be false", r.perEnv.production.varsOk === false);
  expectTrue("case2 must produce fails (production only)", r.fails.some((f) => f.includes("/production:")));
  expectTrue("case2 must NOT fail preview", !r.fails.some((f) => f.includes("/preview:")));
}

// --- 3. production only -> preview FAIL (symmetric to case 2) ---
{
  const toml = FULL_CORRECT_WEB_TOML.replace(
    /\[env\.preview\.images\]\nbinding = "IMAGES"\n\n\[env\.preview\.vars\]\nAPP_NAME = "a"\nPLATFORM_NAME = "b"\n/,
    "",
  );
  const r = evaluateSurface(WEB_SURFACE, toml, null, noLoader);
  expectTrue("case3 production imagesOk must be true", r.perEnv.production.imagesOk === true);
  expectTrue("case3 production varsOk must be true", r.perEnv.production.varsOk === true);
  expectTrue("case3 preview imagesOk must be false", r.perEnv.preview.imagesOk === false);
  expectTrue("case3 preview varsOk must be false", r.perEnv.preview.varsOk === false);
  expectTrue("case3 must produce fails (preview only)", r.fails.some((f) => f.includes("/preview:")));
  expectTrue("case3 must NOT fail production", !r.fails.some((f) => f.includes("/production:")));
}

// --- 4. binding name differs from "IMAGES" -> FAIL ---
{
  const toml = FULL_CORRECT_WEB_TOML.replace(
    '[env.preview.images]\nbinding = "IMAGES"',
    '[env.preview.images]\nbinding = "MEDIA"',
  );
  const r = evaluateSurface(WEB_SURFACE, toml, null, noLoader);
  expectTrue("case4 preview imagesOk must be false (wrong binding name)", r.perEnv.preview.imagesOk === false);
  expectTrue(
    "case4 failure message must name the wrong binding",
    r.fails.some((f) => f.includes('binding is "MEDIA"')),
  );
  expectTrue("case4 production must remain unaffected", r.perEnv.production.imagesOk === true);
}

// --- 5. required vars exist ONLY at top-level -> named env FAIL (both envs,
//        images correct so only vars should fail) ---
{
  const toml = FULL_CORRECT_WEB_TOML
    .replace('[env.preview.vars]\nAPP_NAME = "a"\nPLATFORM_NAME = "b"\n\n', "")
    .replace('[env.production.vars]\nAPP_NAME = "a"\nPLATFORM_NAME = "b"\n', "");
  const r = evaluateSurface(WEB_SURFACE, toml, null, noLoader);
  expectTrue("case5 preview imagesOk must remain true", r.perEnv.preview.imagesOk === true);
  expectTrue("case5 production imagesOk must remain true", r.perEnv.production.imagesOk === true);
  expectTrue("case5 preview varsOk must be false (top-level only)", r.perEnv.preview.varsOk === false);
  expectTrue("case5 production varsOk must be false (top-level only)", r.perEnv.production.varsOk === false);
  expect("case5 preview varsMissing", r.perEnv.preview.varsMissing.slice().sort(), ["APP_NAME", "PLATFORM_NAME"].sort());
}

// --- 6. web fully correct, ops missing entirely -> overall FAIL ---
{
  const fakeFs = {
    readFileSync(p) {
      const norm = String(p).replace(/\\/g, "/");
      if (norm.endsWith("infra/web/wrangler.toml")) return FULL_CORRECT_WEB_TOML;
      const err = new Error(`ENOENT (fake): ${p}`);
      err.code = "ENOENT";
      throw err;
    },
  };
  const { fails, results } = evaluateAll("FAKE_ROOT", fakeFs);
  const webResult = results.find((r) => r.label.startsWith("web"));
  const opsResult = results.find((r) => r.label.startsWith("ops"));
  expectTrue("case6 web surface must have zero fails", webResult.fails.length === 0);
  expectTrue("case6 ops surface must fail (missing file)", opsResult.fails.length > 0);
  expectTrue("case6 overall fails must be non-empty", fails.length > 0);
}

// --- 7. both surfaces, all effective environments correct -> overall PASS ---
{
  const fakeFs = {
    readFileSync(p) {
      const norm = String(p).replace(/\\/g, "/");
      if (norm.endsWith("infra/web/wrangler.toml")) return FULL_CORRECT_WEB_TOML;
      if (norm.endsWith("infra/ops/wrangler.toml")) return FULL_CORRECT_OPS_TOML;
      const err = new Error(`ENOENT (fake): ${p}`);
      err.code = "ENOENT";
      throw err;
    },
  };
  const { fails } = evaluateAll("FAKE_ROOT", fakeFs);
  expect("case7 overall fails must be empty when both surfaces fully correct", fails, []);
}

// --- 8 (bonus, requirement #9). a PROVEN custom loader must let images PASS
//        even with no [images] binding at all ---
{
  const toml = `
[env.preview]
name = "x-preview"
workers_dev = true

[env.preview.vars]
APP_NAME = "a"
PLATFORM_NAME = "b"

[env.production]
name = "x"
workers_dev = true

[env.production.vars]
APP_NAME = "a"
PLATFORM_NAME = "b"
`;
  const nextConfig = `
const nextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./image-loader.js",
  },
};
module.exports = nextConfig;
`;
  const fakeLoaderSrc = `
export default function myLoader({ src, width, quality }) {
  return src + "?w=" + width;
}
`;
  const r = evaluateSurface(WEB_SURFACE, toml, nextConfig, () => fakeLoaderSrc);
  expectTrue("case8 preview imagesOk must be true via proven loader", r.perEnv.preview.imagesOk === true);
  expectTrue("case8 production imagesOk must be true via proven loader", r.perEnv.production.imagesOk === true);
  expectTrue("case8 must warn about loader usage, not silently pass", r.warns.length > 0);
  expectTrue("case8 must have zero fails (vars are present)", r.fails.length === 0);
}

// --- 9 (bonus, requirement #9 negative). loader:"custom" string present but
//        loaderFile does NOT resolve to a real file -> must still FAIL, not
//        pass on string-presence alone ---
{
  const toml = `
[env.preview]
name = "x-preview"
workers_dev = true

[env.preview.vars]
APP_NAME = "a"
PLATFORM_NAME = "b"
`;
  const nextConfig = `
const nextConfig = {
  images: { loader: "custom", loaderFile: "./does-not-exist.js" },
};
`;
  const r = evaluateSurface(WEB_SURFACE, toml, nextConfig, () => null /* simulate missing file */);
  expectTrue(
    "case9 imagesOk must be false when loaderFile does not exist (not proven by string alone)",
    r.perEnv.preview.imagesOk === false,
  );
  expectTrue("case9 must fail", r.fails.some((f) => f.includes("preview")));
}

// --- 10 (bonus, requirement #9 negative). loaderFile exists but has no
//        function-shaped default export -> must still FAIL ---
{
  const toml = `
[env.preview]
name = "x-preview"
workers_dev = true

[env.preview.vars]
APP_NAME = "a"
PLATFORM_NAME = "b"
`;
  const nextConfig = `
const nextConfig = {
  images: { loader: "custom", loaderFile: "./not-a-function.js" },
};
`;
  const r = evaluateSurface(WEB_SURFACE, toml, nextConfig, () => "export const foo = 1;\n");
  expectTrue(
    "case10 imagesOk must be false when loaderFile has no function export (not proven by existence alone)",
    r.perEnv.preview.imagesOk === false,
  );
}

// --- 11. end-to-end: the real script must PASS against the current
//         (S1C-corrected) tree - guards against a regression in the actual
//         committed infra/web|ops/wrangler.toml files ---
{
  const { fails, warns, results } = evaluateAll(root);
  if (fails.length) {
    failures.push(
      `end-to-end evaluateAll(root) did not PASS on the current tree:\n- ${fails.join("\n- ")}`,
    );
  }
  void warns;
  void results;
}

if (failures.length) {
  console.error(
    "[regression:cf-images-binding-preflight] FAIL\n- " + failures.join("\n- "),
  );
  process.exit(1);
}
console.log(
  "[regression:cf-images-binding-preflight] PASS (11 assertions: 7 mandate negative-controls + 3 custom-loader-proof cases + 1 end-to-end real-tree run)",
);
