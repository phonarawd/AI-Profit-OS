/**
 * verify:mission-no-manual-grant — Money §51.8a B1 · Admin §35.7
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const forbidden = [
  /mission-grant/i,
  /manual-bonus/i,
  /manualBonus/i,
  /grantMission/i,
];

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".next", "coverage", "target"].includes(ent.name)) {
      continue;
    }
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, onFile);
    else onFile(p);
  }
}

walk(path.join(root, "services/api-nest/src"), (file) => {
  if (!/\.(ts|js)$/.test(file)) return;
  const rel = path.relative(root, file);
  const t = fs.readFileSync(file, "utf8");
  for (const re of forbidden) {
    if (re.test(t)) {
      if (/FORBIDDEN|금지|verify:mission-no-manual-grant/i.test(t)) return;
      fails.push(`forbidden manual grant path: ${rel} matches ${re}`);
    }
  }
});

const adminPlan = fs.readFileSync(
  path.join(root, ".cursor/plans/ai_profit_os_04_admin_e5f6a7b8.plan.md"),
  "utf8",
);
if (!adminPlan.includes("유저별 지급 버튼 0")) {
  fails.push("Admin §35.7 must forbid per-user grant button");
}

if (fails.length) {
  console.error("[verify:mission-no-manual-grant] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:mission-no-manual-grant] PASS");
