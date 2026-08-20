/**
 * verify:no-it-jargon — §50 · user copy/help/empty/peotteok IT terms 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const BANNED = [
  /\bAPI\b/,
  /\bStaging\b/i,
  /\bDLQ\b/,
  /\bNATS\b/,
  /\bMock\b/,
  /\bWebSocket\b/,
  /\bSSE\b/,
  /\bJSONB?\b/,
  /\bnullable\b/i,
  /\bFailed\b/,
  /\bHTTP\/\d/,
  /\bP레인\b/,
  /\bG레인\b/,
  /\bS레인\b/,
];

const files = [
  "packages/ui/copy/ko/user.ts",
  "packages/ui/copy/ko/guide.ts",
  "packages/ui/copy/ko/peotteok.ts",
  "packages/ui/copy/ko/onboarding.ts",
  "packages/ui/copy/ko/auth.ts",
  "packages/ui/copy/ko/landing.ts",
  "packages/ui/copy/ko/toast.ts",
  "packages/ui/copy/ko/common.ts",
  "packages/ui/copy/ko/settings.ts",
  "packages/ui/copy/ko/legal.ts",
  "packages/ui/copy/ko/ticker.ts",
  "apps/web/components/pwa/copy.ts",
];

for (const rel of files) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    continue;
  }
  const src = fs.readFileSync(p, "utf8");
  // Only scan string literals
  const lits = [...src.matchAll(/["'`]([^"'`\\]|\\.)*["'`]/g)].map((m) => m[0]);
  for (const lit of lits) {
    for (const re of BANNED) {
      if (re.test(lit)) {
        fails.push(`${rel}: IT jargon ${re} in ${lit.slice(0, 80)}`);
      }
    }
  }
}

if (fails.length) {
  console.error("[verify:no-it-jargon] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:no-it-jargon] PASS (user help/empty/toast/peotteok)");
