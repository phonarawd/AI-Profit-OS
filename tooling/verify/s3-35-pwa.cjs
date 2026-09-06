/**
 * verify:s3-35-pwa — S3 / 3.5 Phase F (code slice)
 * F1 cache safety · F2 install/update · F3 offline/push authority
 * Live browser / Home visual stay S6. launchYes must stay false.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail("missing: " + rel);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const matrixRel = "governance/pwa/s3-35-connection-matrix.v1.json";
let matrix;
try {
  matrix = JSON.parse(read(matrixRel));
} catch (err) {
  fail("matrix JSON invalid: " + err.message);
  matrix = { checks: {} };
}

if (matrix.liveE2e !== "NOT_RUN") fail("matrix.liveE2e must stay NOT_RUN until S6");
if (matrix.productionDbApply !== false) fail("matrix must not claim production DB apply");
if (matrix.launchYes !== false) fail("matrix.launchYes must stay false");
if (matrix.stagingBrowser !== "NOT_RUN") fail("matrix.stagingBrowser must stay NOT_RUN");
for (const key of ["F3_live_browser", "F3_visual_home"]) {
  if (matrix.checks && matrix.checks[key] !== "NOT_RUN") {
    fail("matrix." + key + " must stay NOT_RUN");
  }
}

const sw = read("apps/web/public/sw.js");
if (!sw.includes('PUTDUK_CACHE_PREFIX = "putduk-"')) {
  fail("SW must only manage putduk- caches");
}
if (!sw.includes("isPutdukCache") || !sw.includes("isSensitivePath")) {
  fail("SW must isolate putduk caches and sensitive navigations");
}
if (!sw.includes("/offline.html")) {
  fail("SW must use branded offline page");
}
if (sw.includes('text/plain')) {
  fail("SW must not use plain-text offline fallback");
}
if (!sw.includes("/api/") || !sw.includes("return;")) {
  fail("SW must not cache /api/");
}
if (!/filter\(\(key\) => isPutdukCache\(key\)/.test(sw) && !sw.includes("isPutdukCache(key) && key !== SHELL_CACHE")) {
  fail("activate must not delete foreign caches");
}
if (sw.includes("cache.addAll(SHELL_URLS)") && !sw.includes("cacheAddAllSafe")) {
  fail("optional shell assets must not fail the whole install");
}

const offlinePage = read("apps/web/public/offline.html");
if (!offlinePage.includes("퍼뜩") && !offlinePage.includes("\uD37C\uB5A1")) {
  fail("offline.html must stay branded");
}

const install = read("apps/web/components/pwa/InstallPrompt.tsx");
if (!install.includes("beforeinstallprompt")) {
  fail("InstallPrompt must listen for beforeinstallprompt");
}
if (!install.includes("!ios && !deferred")) {
  fail("Android/Chromium CTA must require a real beforeinstallprompt event");
}

const update = read("apps/web/components/pwa/SwUpdateToast.tsx");
if (!update.includes("shouldSuppressPwaChrome")) {
  fail("SW update must not force reload on money/onboarding paths");
}

const offline = read("apps/web/components/pwa/OfflineBanner.tsx");
if (!offline.includes("probeReachable") && !offline.includes("/manifest.webmanifest")) {
  fail("OfflineBanner must probe reachability, not only navigator.onLine");
}
if (!offline.includes("offlineMoneyOff")) {
  fail("offline copy must disable money while disconnected");
}

const push = read("apps/web/components/pwa/PushOptIn.tsx");
if (!push.includes("fetchServerPushEnabled") || !push.includes("isPushOverlayAllowed")) {
  fail("PushOptIn must keep server PUSH_ENABLED authority");
}

const runtime = read("apps/web/components/pwa/PwaRuntime.tsx");
if (!runtime.includes('register("/sw.js"')) {
  fail("PwaRuntime must still register /sw.js");
}

const copy = read("apps/web/components/pwa/copy.ts");
for (const jargon of ["API", "PWA", "Service Worker", "manifest", "SSE"]) {
  if (copy.includes('"' + jargon + '"') || copy.includes("'" + jargon + "'")) {
    fail("pwa copy must not include " + jargon);
  }
}

const pkg = read("package.json");
if (!pkg.includes('"verify:s3-35-pwa"')) fail("package.json missing verify:s3-35-pwa");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("s3-35-pwa.cjs")) fail("domain-by-path must trigger s3-35-pwa.cjs");

const native = spawnSync(
  process.execPath,
  ["tooling/verify/pwa-native-shell.cjs"],
  { cwd: root, encoding: "utf8", timeout: 30_000 },
);
process.stdout.write(native.stdout || "");
process.stderr.write(native.stderr || "");
if (native.status !== 0) fail("pwa-native-shell failed");

if (fails.length) {
  console.error("[verify:s3-35-pwa] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:s3-35-pwa] PASS (F1-F3 code · LIVE_E2E=NOT_RUN · Home visual NOT_RUN)",
);
