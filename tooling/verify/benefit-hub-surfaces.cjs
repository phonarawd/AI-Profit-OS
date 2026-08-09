/**
 * verify:benefit-hub-surfaces — UI §5.9.5
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const files = [
  "packages/ui/copy/ko/benefits.ts",
  "packages/ui/canon/surfaces/benefit-hub.wire.json",
  "packages/ui/canon/surfaces/benefit-mission-card.wire.json",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fails.push(`missing: ${f}`);
}

const ui = fs.readFileSync(
  path.join(root, ".cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md"),
  "utf8",
);
for (const needle of ["#### 5.9.5", "/me/benefits", "Credits"]) {
  if (!ui.includes(needle)) fails.push(`UI plan missing: ${needle}`);
}
if (!ui.includes("Credits ❌") && !ui.includes("Credits **0**")) {
  fails.push("UI §5.9.5 must forbid Credits currency");
}

const copy = fs.readFileSync(
  path.join(root, "packages/ui/copy/ko/benefits.ts"),
  "utf8",
);
if (/credits_balance|creditsBalance|virtualCredits|\bCredits\b/i.test(copy)) {
  fails.push("benefits copy must not use Credits currency label");
}
if (!copy.includes("혜택 · 미션")) {
  fails.push("benefits copy missing title 혜택 · 미션");
}

if (fails.length) {
  console.error("[verify:benefit-hub-surfaces] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:benefit-hub-surfaces] PASS");
