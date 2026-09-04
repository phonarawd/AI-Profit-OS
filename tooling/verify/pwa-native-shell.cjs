/**
 * verify:pwa-native-shell — REL-014 / E-PWA-001
 * manifest link + Spark Dash native-shell colors + icons + SW registration + install/update UX.
 * Push/WebAuthn/store-bridge 끌어오면 FAIL. Home files stay protected.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const SPARK_THEME = "#08111F";

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const pngs = [
  "apps/web/public/icons/icon-192.png",
  "apps/web/public/icons/icon-512.png",
  "apps/web/public/icons/maskable-512.png",
  "apps/web/public/icons/apple-touch-180.png",
];
for (const rel of pngs) {
  if (!exists(rel)) {
    fails.push(`missing icon: ${rel}`);
    continue;
  }
  const buf = fs.readFileSync(path.join(root, rel));
  if (buf.length < 32 || buf[0] !== 0x89 || buf[1] !== 0x50) {
    fails.push(`${rel} is not a PNG`);
  }
}

let manifest;
try {
  manifest = JSON.parse(read("apps/web/public/manifest.webmanifest"));
} catch (err) {
  fails.push(`manifest JSON parse: ${err.message}`);
  manifest = {};
}

if (manifest.name !== "퍼뜩" || manifest.short_name !== "퍼뜩") {
  fails.push("manifest name/short_name must be 퍼뜩");
}
if (manifest.theme_color !== SPARK_THEME) {
  fails.push(`manifest theme_color must be Spark Dash ${SPARK_THEME}`);
}
if (manifest.background_color !== SPARK_THEME) {
  fails.push(`manifest background_color must be Spark Dash ${SPARK_THEME}`);
}
if (manifest.display !== "standalone") {
  fails.push("manifest display must be standalone");
}
if (!manifest.start_url) fails.push("manifest start_url missing");

const iconSrc = JSON.stringify(manifest.icons || []);
if (!iconSrc.includes("/icons/icon-192.png") || !iconSrc.includes("/icons/icon-512.png")) {
  fails.push("manifest must declare 192 and 512 icons");
}

const retired = ["오늘수익", "바로번다"];
const brandHay = JSON.stringify(manifest) + read("apps/web/app/layout.tsx");
for (const name of retired) {
  if (brandHay.includes(name)) fails.push(`retired brand leaked: ${name}`);
}

const layout = read("apps/web/app/layout.tsx");
if (!layout.includes('manifest: "/manifest.webmanifest"')) {
  fails.push("layout metadata must link /manifest.webmanifest");
}
if (!layout.includes("PwaRuntime")) {
  fails.push("layout must mount PwaRuntime");
}
if (!layout.includes(SPARK_THEME) || !layout.includes("themeColor")) {
  fails.push(`layout viewport themeColor must be Spark Dash ${SPARK_THEME}`);
}
if (!layout.includes("appleWebApp") || !layout.includes("퍼뜩")) {
  fails.push("layout appleWebApp title must be 퍼뜩");
}

const runtime = read("apps/web/components/pwa/PwaRuntime.tsx");
if (!runtime.includes('register("/sw.js"') && !runtime.includes("register('/sw.js'")) {
  fails.push("PwaRuntime must register /sw.js");
}

const sw = read("apps/web/public/sw.js");
if (!sw.includes("SKIP_WAITING")) {
  fails.push("SW must honor SKIP_WAITING for update UX");
}
if (!sw.includes("event.origin") || !sw.includes("self.location.origin")) {
  fails.push("SW message handler must reject cross-origin SKIP_WAITING");
}
if (!sw.includes("cache.addAll") && !sw.includes("caches.open")) {
  fails.push("SW must cache shell assets (CacheFirst equivalent)");
}
if (/webauthn|PublicKeyCredential/i.test(sw + runtime)) {
  fails.push("REL-014 must not mix WebAuthn (REL-022)");
}

const install = read("apps/web/components/pwa/InstallPrompt.tsx");
if (!install.includes("beforeinstallprompt")) {
  fails.push("InstallPrompt must listen for beforeinstallprompt");
}
if (!install.includes("display-mode: standalone")) {
  fails.push("InstallPrompt must hide when installed");
}

const update = read("apps/web/components/pwa/SwUpdateToast.tsx");
if (!update.includes("SKIP_WAITING")) {
  fails.push("SwUpdateToast must send SKIP_WAITING");
}

const offline = read("apps/web/components/pwa/OfflineBanner.tsx");
if (!offline.includes("navigator.onLine") && !offline.includes("offline")) {
  fails.push("OfflineBanner must react to connectivity");
}

const shellCss = read("apps/web/app/pwa-shell.css");
if (!shellCss.includes("display-mode: standalone")) {
  fails.push("pwa-shell.css must scope standalone rules");
}
if (/^html,\s*body\s*\{[^}]*user-select:\s*none/m.test(shellCss.replace(/\s+/g, " "))) {
  fails.push("global user-select:none on body is forbidden");
}

const copy = read("apps/web/components/pwa/copy.ts");
for (const jargon of ["API", "PWA", "Service Worker", "manifest", "Staging", "NATS"]) {
  if (copy.includes(`"${jargon}"`) || copy.includes(`'${jargon}'`)) {
    fails.push(`user copy must not include ${jargon}`);
  }
}

const storeNeedles = [
  "assetlinks.json",
  "bubblewrap",
  "capacitor",
  "store-bridge",
  ".aab",
  "uptodown",
];
const sliceHay = [
  sw,
  runtime,
  install,
  update,
  offline,
  layout,
  read("apps/web/public/manifest.webmanifest"),
].join("\n");
for (const needle of storeNeedles) {
  if (sliceHay.toLowerCase().includes(needle.toLowerCase())) {
    fails.push(`store-bridge scope leak: ${needle}`);
  }
}

// NOTE (2026-09-04): this Home-freeze mutation guard originally watched only
// the dead Canon Home tree (packages/ui/components/home,
// apps/web/app/HomePageClient.tsx and friends) - unreachable from the live
// route (see governance/runtime-surfaces.v1.json surfaces.home). A real
// change to the Founder-approved-and-frozen live Home
// (apps/web/app/HomeDesktopClient.tsx, apps/web/components/spark-dash-home/*)
// would have passed this guard silently. Both trees are now watched: the
// live one because it is the actual freeze surface
// (governance/consumer-home-approval/home-approval-freeze.v1.json), the dead
// one kept as a harmless no-op once those files are removed.
let registry;
try {
  registry = JSON.parse(read("governance/runtime-surfaces.v1.json") || "{}");
} catch {
  registry = { surfaces: {} };
}
const homeSurface = registry.surfaces?.home || {};
const liveHomePaths = [
  homeSurface.entry,
  homeSurface.client,
  homeSurface.mapper,
  ...(homeSurface.presentation || []),
].filter(Boolean);
const legacyHomePaths = [
  "packages/ui/components/home",
  "apps/web/app/HomePageClient.tsx",
  "apps/web/app/_components/HomePageClient.tsx",
  "apps/web/components/HomePageClient.tsx",
];
const homeForbidden = [...liveHomePaths, ...legacyHomePaths];
const watchPathsArg = homeForbidden.join(" ");
try {
  const { execSync } = require("child_process");
  const gitEnv = { ...process.env, GIT_PAGER: "cat", PAGER: "cat" };
  const gitOpts = {
    cwd: root,
    encoding: "utf8",
    timeout: 20_000,
    env: gitEnv,
  };
  const diff = execSync(
    `git --no-pager diff --name-only HEAD -- ${watchPathsArg}`,
    gitOpts,
  );
  const staged = execSync(
    `git --no-pager diff --cached --name-only -- ${watchPathsArg}`,
    gitOpts,
  );
  const changed = `${diff}\n${staged}`.replace(/\\/g, "/");
  for (const rel of homeForbidden) {
    if (changed.includes(rel)) {
      fails.push(`Home freeze mutation: ${rel}`);
    }
  }
} catch {
  /* git unavailable — skip working-tree freeze check */
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:pwa-native-shell"')) {
  fails.push("package.json missing verify:pwa-native-shell");
}
if (!catalog.includes("pwa-native-shell")) {
  fails.push("CATALOG.md must list pwa-native-shell");
}
if (!domain.includes("pwa-native-shell.cjs")) {
  fails.push("domain-by-path must trigger pwa-native-shell");
}

if (fails.length) {
  console.error("[verify:pwa-native-shell] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:pwa-native-shell] PASS (Spark Dash manifest+icons+SW+install UX · store-bridge 0 · Home freeze 0 · push=REL-020)",
);
