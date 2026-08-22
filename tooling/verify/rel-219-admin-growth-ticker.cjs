/**
 * verify:rel-219-admin-growth-ticker — G4 ticker live wire, same config owner
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const page = read("apps/admin/app/admin/growth/page.tsx");
const redir = read("apps/admin/app/admin/growth/ticker/page.tsx");
const ctrl = read(
  "services/api-nest/src/growth/growth-ticker.admin.controller.ts",
);
const svc = read("services/api-nest/src/growth/growth-public.service.ts");
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");

if (!redir.includes('redirect("/admin/growth?tab=ticker")')) {
  fails.push("legacy /admin/growth/ticker must redirect to hub tab");
}
for (const needle of [
  'data-testid="growth-ticker-panel"',
  'data-forbid="fake-ticker-truth"',
  "/api/v1/admin/growth/ticker",
  "adminGet",
  "adminSend",
  "AdminTruth",
]) {
  if (!page.includes(needle)) fails.push(`ticker growth missing ${needle}`);
}
if (/TICKER_PERF_FIXTURE|fakeTicker|trendingScore\s*=/.test(page)) {
  fails.push("ticker growth must not invent performance/trending");
}
if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("growth-ticker.admin.controller must use AdminGuard");
}
if (!svc.includes("growth_ticker_config")) {
  fails.push("ticker admin must reuse growth_ticker_config owner");
}
if (!svc.includes("patchTickerConfig")) {
  fails.push("ticker admin PATCH must stay on GrowthPublicService");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}

if (fails.length) {
  console.error("[verify:rel-219-admin-growth-ticker] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-219-admin-growth-ticker] PASS");
