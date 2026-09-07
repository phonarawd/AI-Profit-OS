"use strict";
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "../verify/CATALOG.md");
let text = fs.readFileSync(file, "utf8");
if (text.includes("j0-admin-auth-live")) {
  console.log("[patch-catalog-j0] PASS");
  process.exit(0);
}
const row = "| j0-admin-auth-live | `verify:j0-admin-auth-live` | T0 path + CI | live (J0 suite lock; live run is e2e:j0-admin-auth-live; static is not PASS) |\n";
const map = "| `tooling/e2e/j0-admin-auth-live*.cjs` · `governance/release-master/J0-LIVE.v1.json` · `tooling/verify/j0-admin-auth-live.cjs` | j0-admin-auth-live |\n";
text = text.replace(
  "| hard-gate-live | `verify:hard-gate-live` | T0 path + CI | live (HARD_GATE recount, stale 0/10 discarded, PASS allowlist empty) |\n",
  "| hard-gate-live | `verify:hard-gate-live` | T0 path + CI | live (HARD_GATE recount, stale 0/10 discarded, PASS allowlist empty) |\n" + row,
);
text = text.replace(
  "| `governance/release-master/HARD_GATE_LIVE.v1.json` · `tooling/verify/hard-gate-live.cjs` | hard-gate-live |\n",
  "| `governance/release-master/HARD_GATE_LIVE.v1.json` · `tooling/verify/hard-gate-live.cjs` | hard-gate-live |\n" + map,
);
fs.writeFileSync(file, text);
console.log("[patch-catalog-j0] PASS");
