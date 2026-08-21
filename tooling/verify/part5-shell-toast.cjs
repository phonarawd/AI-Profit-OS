/**
 * verify:part5-shell-toast — PART5b/e shell + toast host + nested routes lock
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const layout = read("apps/web/app/layout.tsx");
const shellRoot = read("packages/ui/components/shell/AppShellRoot.tsx");
for (const needle of ["ToastHost", "theme-peotteok-light"]) {
  if (!layout.includes(needle)) fails.push(`layout missing ${needle}`);
}
if (layout.includes("AppShellRoot") || layout.includes("USER_TABS")) {
  fails.push("root layout must not globally mount AppShellRoot / USER_TABS");
}
const walletLayout = read("apps/web/app/wallet/layout.tsx");
const meLayout = read("apps/web/app/me/layout.tsx");
if (walletLayout.includes("LegacyAppShell") || walletLayout.includes("AppShellRoot")) {
  fails.push("wallet layout must not remount leftover 5-tab chrome");
}
if (meLayout.includes("LegacyAppShell") || meLayout.includes("AppShellRoot")) {
  fails.push("me layout must not remount leftover 5-tab chrome");
}
for (const needle of ["BottomNav5", "SiteFooter", "AppHeader", "HomeChromeProvider"]) {
  if (!shellRoot.includes(needle)) {
    fails.push(`AppShellRoot missing ${needle}`);
  }
}

const nav = read("packages/ui/components/shell/BottomNav5.tsx");
if (!nav.includes('data-testid="bottom-nav-5"')) {
  fails.push("BottomNav5 missing test id");
}

const toastHost = read("packages/ui/components/toast/ToastHost.tsx");
for (const needle of [
  "resolveToastDetail",
  "shouldShowToast",
  'data-testid="toast-host"',
]) {
  if (!toastHost.includes(needle)) fails.push(`ToastHost missing ${needle}`);
}

const dedup = read("packages/ui/components/toast/pushDedup.ts");
if (!dedup.includes("sourceEventId") || !dedup.includes("shouldShowToast")) {
  fails.push("pushDedup must key on sourceEventId");
}

const routes = read("apps/web/routes.ts");
for (const r of [
  "/me/benefits",
  "/me/guide/partners",
  "/me/guide/market-weekly",
]) {
  if (!routes.includes(`"${r}"`)) fails.push(`USER_NESTED_ROUTES missing ${r}`);
}

for (const page of [
  "apps/web/app/me/benefits/page.tsx",
  "apps/web/app/me/page.tsx",
  "apps/web/app/wallet/history/page.tsx",
  "apps/web/app/profits/page.tsx",
  "apps/web/app/trades/page.tsx",
]) {
  if (!fs.existsSync(path.join(root, page))) fails.push(`missing ${page}`);
}

const me =
  read("apps/web/app/me/page.tsx") + read("apps/web/app/me/ProfileClient.tsx");
if (!me.includes("/me/benefits") || !me.includes("/me/settings")) {
  fails.push("me hub must link benefits + settings");
}

// retired brands
for (const banned of ["오늘수익", "바로번다"]) {
  if (me.includes(banned) || layout.includes(banned)) {
    fails.push(`retired brand ${banned}`);
  }
}

if (fails.length) {
  console.error("[verify:part5-shell-toast] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:part5-shell-toast] PASS (root chrome 0 · leftover /me chrome 0 · toast · nested routes)");
