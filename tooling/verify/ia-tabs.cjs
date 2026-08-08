/**
 * verify:ia-tabs — User 5탭 IA lock (UI §5.1)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const routesPath = path.join(root, "apps/web/routes.ts");

if (!fs.existsSync(routesPath)) {
  console.error("[verify:ia-tabs] FAIL missing apps/web/routes.ts");
  process.exit(1);
}

const src = fs.readFileSync(routesPath, "utf8");
const expected = [
  { label: "홈", href: "/" },
  { label: "수익", href: "/profits" },
  { label: "내거래", href: "/trades" },
  { label: "지갑", href: "/wallet" },
  { label: "내정보", href: "/me" },
];

const tabBlock = src.match(/export const USER_TABS\s*=\s*\[([\s\S]*?)\]\s*as const/);
if (!tabBlock) {
  fails.push("USER_TABS export missing or malformed");
} else {
  const body = tabBlock[1];
  const hrefs = [...body.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]);
  const labels = [...body.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  if (hrefs.length !== 5) fails.push(`USER_TABS must have exactly 5 entries (got ${hrefs.length})`);
  expected.forEach((e, i) => {
    if (hrefs[i] !== e.href) fails.push(`tab[${i}] href want ${e.href} got ${hrefs[i]}`);
    if (labels[i] !== e.label) fails.push(`tab[${i}] label want ${e.label} got ${labels[i]}`);
  });
}

for (const href of ["/", "/profits", "/trades", "/wallet", "/me"]) {
  const page =
    href === "/"
      ? path.join(root, "apps/web/app/page.tsx")
      : path.join(root, "apps/web/app", href.slice(1), "page.tsx");
  if (!fs.existsSync(page)) fails.push(`missing page for ${href}: ${path.relative(root, page)}`);
}

if (fails.length) {
  console.error("[verify:ia-tabs] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:ia-tabs] PASS (5 tabs locked)");
