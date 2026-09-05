/**
 * Regression test for tooling/verify/lib/host-token-boundary.cjs
 * (D1-S1D 2026-09-05, CodeQL js/incomplete-url-substring-sanitization
 * alerts 26/27/28 in tooling/verify/web-remote-patterns.cjs).
 *
 * Run: node tooling/verify/regression/host-token-boundary.regression.cjs
 *
 * Coverage:
 *  1. real, legitimate usages (the exact shapes present in the actual
 *     source files web-remote-patterns.cjs scans) must still be detected.
 *  2. discrimination: attacker-crafted strings where a host is a mere
 *     substring of a longer, unrelated token must NOT match the boundary-
 *     checked helper (2026-09-05 PUTDUK-FULL-RELEASE Phase B update: this
 *     no longer locally re-defines a bare `text.includes(host)` "OLD_CHECK"
 *     function to prove it WOULD have matched - CodeQL
 *     js/incomplete-url-substring-sanitization flagged that intentionally-
 *     naive helper itself as a live finding, even though it exists only to
 *     demonstrate the fixed helper's improvement. The negative assertions
 *     below are equally meaningful without it: they directly prove the
 *     REAL, shipped helper rejects each attacker-crafted case).
 *  3. end-to-end: the real verify:web-remote-patterns script must still PASS
 *     against the current tree (proves the fix did not break the live check).
 */
"use strict";
const path = require("path");
const root = path.resolve(__dirname, "../../..");
const { includesHostToken } = require(path.join(root, "tooling/verify/lib/host-token-boundary.cjs"));

const failures = [];
function expect(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${expected}, got ${actual}`);
  }
}

// --- 1. real usages must still be detected ---
expect(
  "real r2.cloudflarestorage.com usage inside a larger source snippet",
  includesHostToken(
    'const url = `https://${bucket}.r2.cloudflarestorage.com/${key}`;',
    "r2.cloudflarestorage.com",
  ),
  true,
);
expect(
  "real images.pokemontcg.io usage inside a larger source snippet",
  includesHostToken('hostname: "images.pokemontcg.io",', "images.pokemontcg.io"),
  true,
);
expect(
  "real images.ygoprodeck.com usage inside a larger source snippet",
  includesHostToken("const YGO_HOST = 'images.ygoprodeck.com';", "images.ygoprodeck.com"),
  true,
);

// --- 2. discrimination: attacker-crafted strings where the host is merely a
//        substring of a longer, unrelated token must NOT match the real,
//        shipped helper (a bare `text.includes(host)` naive check - not
//        defined here at all anymore - would wrongly have matched both) ---
const attackerLike1 = "https://fake-r2.cloudflarestorage.com.attacker.net/steal";
expect(
  "includesHostToken must NOT match a host that is merely a substring of a longer attacker-crafted token",
  includesHostToken(attackerLike1, "r2.cloudflarestorage.com"),
  false,
);

const attackerLike2 = "notreallyimages.pokemontcg.io.example.com";
expect(
  "includesHostToken must NOT match the second attacker-crafted string",
  includesHostToken(attackerLike2, "images.pokemontcg.io"),
  false,
);

// --- 3. end-to-end: the real verify:web-remote-patterns script must still PASS ---
const { spawnSync } = require("node:child_process");
const e2e = spawnSync(process.execPath, [path.join(root, "tooling/verify/web-remote-patterns.cjs")], {
  cwd: root,
  encoding: "utf8",
});
if (e2e.status !== 0) {
  failures.push(
    `end-to-end verify:web-remote-patterns did not PASS (exit ${e2e.status}):\n${e2e.stdout}\n${e2e.stderr}`,
  );
}

if (failures.length) {
  console.error("[regression:host-token-boundary] FAIL\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(
  "[regression:host-token-boundary] PASS (3 real-usage + 2 discrimination assertions (against the real shipped helper, no locally-redefined naive check) + 1 end-to-end run)",
);
