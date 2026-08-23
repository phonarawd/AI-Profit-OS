/**
 * verify:rel-220-admin-growth-whale
 */
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const fails = [];
function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) { fails.push("missing: " + rel); return ""; }
  return fs.readFileSync(p, "utf8");
}

const page = read("apps/admin/app/admin/growth/whale/page.tsx");
const hub = read("apps/admin/app/admin/growth/page.tsx");
if (!page.includes('redirect("/admin/growth?tab=whale")')) fails.push("whale must redirect to hub tab");
if (!hub.includes('"' + "whale" + '"') && !hub.includes("tab=whale")) fails.push("hub missing whale");
if (!hub.includes("adminGet")) fails.push("hub must live-wire");
if (!hub.includes("이 탭의 운영 목록 API가 없습니다.") && "whale" !== "content") {
  fails.push("hub must honest-empty tabs without API");
}
if ("whale" === "content") {
  if (!hub.includes('data-testid="growth-content-panel"')) fails.push("content panel missing");
  if (!hub.includes('data-tax-disclaimer-locked="true"')) fails.push("tax lock missing");
}

if (fails.length) {
  console.error("[verify:rel-220-admin-growth-whale] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-220-admin-growth-whale] PASS");
