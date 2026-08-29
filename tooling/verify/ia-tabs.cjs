const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const fails = [];
const navPath = path.join(root, "packages/ui/navigation/consumer-navigation.ts");
if (!fs.existsSync(navPath)) {
  console.error("[verify:ia-tabs] FAIL missing consumer-navigation.ts");
  process.exit(1);
}
const src = fs.readFileSync(navPath, "utf8");
const need = [
  ['home', '"/"'],
  ['opportunities', '"/profits"'],
  ['assets', '"/wallet"'],
  ['activity', '"/trades"'],
  ['inbox', '"/me/inbox"'],
  ['profile', '"/me"'],
];
for (const [id, href] of need) {
  if (!src.includes(id) || !src.includes(href)) {
    fails.push("missing destination " + id + " " + href);
  }
}
if (!src.includes("MOBILE_PRIMARY_IDS") || !src.includes("DESKTOP_SIDEBAR_IDS")) {
  fails.push("mobile/desktop projections missing");
}
const routes = fs.readFileSync(path.join(root, "apps/web/routes.ts"), "utf8");
if (!routes.includes("@aipo/ui/navigation/consumer-navigation")) {
  fails.push("apps/web/routes.ts must import consumer-navigation");
}
for (const href of ["/", "/profits", "/trades", "/wallet", "/me"]) {
  const page =
    href === "/"
      ? path.join(root, "apps/web/app/page.tsx")
      : path.join(root, "apps/web/app", href.slice(1), "page.tsx");
  if (!fs.existsSync(page)) fails.push("missing page " + href);
}
if (fails.length) {
  console.error("[verify:ia-tabs] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:ia-tabs] PASS (consumer-navigation SSOT)");
