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
 *  2. discrimination: a string that the OLD `text.includes(host)` check
 *     would have wrongly accepted (host is a mere substring of a longer,
 *     unrelated token) is confirmed to really have matched under the old
 *     logic (so this test is not vacuous), and confirmed to correctly NOT
 *     match under the new boundary-checked helper.
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

// --- 2. discrimination: OLD .includes() would wrongly match; NEW must not ---
const OLD_CHECK = (text, host) => text.includes(host);

const attackerLike1 = "https://fake-r2.cloudflarestorage.com.attacker.net/steal";
expect(
  "sanity: the OLD .includes() check really did match the attacker-crafted string (test not vacuous)",
  OLD_CHECK(attackerLike1, "r2.cloudflarestorage.com"),
  true,
);
expect(
  "the NEW includesHostToken must NOT match a host that is merely a substring of a longer attacker-crafted token",
  includesHostToken(attackerLike1, "r2.cloudflarestorage.com"),
  false,
);

const attackerLike2 = "notreallyimages.pokemontcg.io.example.com";
expect(
  "sanity: the OLD .includes() check really did match the second attacker-crafted string",
  OLD_CHECK(attackerLike2, "images.pokemontcg.io"),
  true,
);
expect(
  "the NEW includesHostToken must NOT match the second attacker-crafted string",
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
  "[regression:host-token-boundary] PASS (3 real-usage + 4 discrimination assertions + 1 end-to-end run)",
);
