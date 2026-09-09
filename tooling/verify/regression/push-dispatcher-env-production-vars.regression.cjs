/**
 * Regression test for D1-BLK-011 (workers/push-dispatcher/wrangler.toml
 * PUSH_ENABLED contract mismatch).
 *
 * Run: node tooling/verify/regression/push-dispatcher-env-production-vars.regression.cjs
 *
 * wrangler 4.120's `vars` field is @nonInheritable per named environment
 * (same root cause already fixed for Cloudflare Images bindings in
 * infra/web/wrangler.toml and infra/ops/wrangler.toml, commit 98c3e9f3).
 * [env.production]'s vars block previously omitted PUSH_ENABLED entirely,
 * so the top-level [vars] PUSH_ENABLED="true" silently did NOT apply in
 * production - isPushEnabled(undefined) resolves false, the opposite of
 * what the top-level declaration visually implies. This test asserts the
 * fix (explicit PUSH_ENABLED="false" in [env.production].vars) so the file
 * cannot silently regress back to an implicit/ambiguous omission, and
 * confirms the dispatch.cjs isPushEnabled() logic treats both shapes
 * (undefined and the literal string "false") identically.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../../..");

const failures = [];
function expect(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const tomlPath = path.join(root, "workers/push-dispatcher/wrangler.toml");
const toml = fs.readFileSync(tomlPath, "utf8");

// isolate the [env.production] block (up to the next [section] or EOF)
const prodMatch = toml.match(/\[env\.production\]([\s\S]*?)(?=\n\[|$)/);
if (!prodMatch) {
  failures.push("could not locate [env.production] block in wrangler.toml");
} else {
  const block = prodMatch[1];
  const varsLineMatch = block.match(/^vars\s*=\s*\{([^}]*)\}/m);
  expect("[env.production] must declare an explicit vars = { ... } line", Boolean(varsLineMatch), true);
  if (varsLineMatch) {
    const varsLine = varsLineMatch[1];
    expect(
      "[env.production].vars must explicitly set PUSH_ENABLED (no longer silently omitted)",
      /PUSH_ENABLED\s*=\s*"false"/.test(varsLine),
      true,
    );
    expect(
      "[env.production].vars must still set SERVICE explicitly",
      /SERVICE\s*=\s*"push-dispatcher"/.test(varsLine),
      true,
    );
    expect(
      "[env.production].vars must still set PHASE explicitly",
      /PHASE\s*=\s*"0"/.test(varsLine),
      true,
    );
  }
}

// top-level [vars] must be untouched (still declares the base/dev intent)
const topVarsMatch = toml.match(/^\[vars\]([\s\S]*?)(?=\n\[)/m);
expect("top-level [vars] block must still exist", Boolean(topVarsMatch), true);
if (topVarsMatch) {
  expect(
    "top-level [vars] PUSH_ENABLED must remain 'true' (unchanged - this fix only touches the production override)",
    /PUSH_ENABLED\s*=\s*"true"/.test(topVarsMatch[1]),
    true,
  );
}

// isPushEnabled() must treat undefined and the literal "false" identically
// (proves the fix does not change actual runtime behaviour, only makes it explicit)
const dispatch = require(path.join(root, "workers/push-dispatcher/src/lib/dispatch.cjs"));
expect("isPushEnabled(undefined) must be false (pre-fix de-facto behaviour)", dispatch.isPushEnabled(undefined), false);
expect("isPushEnabled('false') must also be false (post-fix explicit value, same effect)", dispatch.isPushEnabled("false"), false);
expect("isPushEnabled('true') must be true (sanity - the flip switch still works when set)", dispatch.isPushEnabled("true"), true);

if (failures.length) {
  console.error("[regression:push-dispatcher-env-production-vars] FAIL\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(
  "[regression:push-dispatcher-env-production-vars] PASS (4 wrangler.toml shape assertions + 1 top-level-untouched + 3 isPushEnabled behaviour-preservation assertions)",
);
