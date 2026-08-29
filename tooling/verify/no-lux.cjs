const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const SKIP = new Set(["node_modules", ".git", ".next", "dist", "target", ".wrangler", "coverage", "playwright-report"]);
const ALLOW = new Set([
  "tooling/verify/no-lux.cjs",
  "governance/ui/PUTDUK_UI_AUTHORITY_V1.md",
  "tooling/verify/luxury-bag-vertical.cjs",
  "services/market-intelligence/src/luxury-bag-seed.cjs",
]);
const PATTERNS = [
  /lux-theme/i,
  /lux-fintech/i,
  /color-lux/i,
  /bg-lux-/i,
  /text-lux-/i,
  /border-lux-/i,
  /rounded-lux-/i,
  /shadow-lux-/i,
  /components\/lux/i,
  /--color-lux/i,
  /luxFintech/,
  /LuxFintech/,
  /lux-motion/i,
  /lux-pulse/i,
  /lux-skeleton/i,
  /lux-badge/i,
  /lux-app-main/i,
];
const fails = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(ent.name) || ent.name.startsWith("_tmp-")) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else {
      const rel = path.relative(root, p).replace(/\\/g, "/");
      if (ALLOW.has(rel)) continue;
      if (rel.includes("luxury-bag") || rel.includes("luxury_bag") || /luxury/i.test(rel)) continue;
      const ext = path.extname(rel);
      if (![".ts", ".tsx", ".js", ".cjs", ".mjs", ".css", ".json", ".md"].includes(ext)) continue;
      const src = fs.readFileSync(p, "utf8");
      for (const re of PATTERNS) {
        if (re.test(src)) {
          const line = src.split("\n").findIndex((l) => re.test(l)) + 1;
          fails.push(rel + ":" + line + " " + String(re));
        }
      }
    }
  }
}
walk(root);
if (fails.length) {
  console.error("[verify:no-lux] FAIL\n- " + fails.slice(0, 40).join("\n- "));
  process.exit(1);
}
console.log("[verify:no-lux] PASS (design-system lux = 0)");
