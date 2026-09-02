/**
 * leftover-shared-states — error/offline/permission/retry live wiring.
 * ExecutionSuccessReceipt on execute remains banned by execute-web-wire.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const errorPage = read("apps/web/app/error.tsx");
const retry = read("packages/ui/components/primitives/RecoveryRetry.tsx");
const skeleton = read("packages/ui/components/primitives/SurfaceSkeleton.tsx");
const permission = read("packages/ui/components/primitives/PermissionDenied.tsx");
const offline = read("apps/web/components/pwa/OfflineBanner.tsx");
const hub = read("apps/web/app/me/AccountHub.tsx");
const execute = read("apps/web/app/trades/[id]/execute/TradeExecuteClient.tsx");
const executeWire = read("tooling/verify/execute-web-wire.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
const uiPkg = read("packages/ui/package.json");

if (!errorPage.includes("data-testid=\"app-error\"")) {
  fails.push("error.tsx must expose app-error");
}
if (!errorPage.includes("RecoveryRetry") || !errorPage.includes("T.common.errorGeneric")) {
  fails.push("error.tsx must use RecoveryRetry and common.errorGeneric");
}
if (/error\.message|error\.digest|error\.stack/.test(errorPage)) {
  fails.push("error.tsx must not render digest/message/stack");
}
if (!retry.includes("data-copy-key=\"common.retry\"")) {
  fails.push("RecoveryRetry must bind common.retry");
}
if (!skeleton.includes("data-canon=\"surface-skeleton\"")) {
  fails.push("SurfaceSkeleton must keep canon marker");
}
if (!permission.includes("data-canon=\"permission-denied\"")) {
  fails.push("PermissionDenied must keep canon marker");
}
if (!offline.includes("RecoveryRetry") || !offline.includes("data-canon=\"offline\"")) {
  fails.push("OfflineBanner must use RecoveryRetry and offline canon");
}
if (!hub.includes("RecoveryRetry") || !hub.includes("SurfaceSkeleton")) {
  fails.push("AccountHub must use RecoveryRetry and SurfaceSkeleton");
}
if (!hub.includes("PermissionDenied")) {
  fails.push("AccountHub unauthorized must use PermissionDenied");
}
if (!execute.includes("PermissionDenied")) {
  fails.push("execute AUTH_REQUIRED must wrap PermissionDenied");
}
if (execute.includes("ExecutionSuccessReceipt") || execute.includes("@aipo/ui/components/execution")) {
  fails.push("execute must not recover ExecutionSuccessReceipt (execute-web-wire KEEP)");
}
if (!execute.includes("data-sdr-settled")) {
  fails.push("live execute must keep settled receipt owner data-sdr-settled");
}
if (!executeWire.includes("ExecutionSuccessReceipt")) {
  fails.push("execute-web-wire must keep ExecutionSuccessReceipt ban");
}
if (!pkg.includes("verify:leftover-shared-states")) {
  fails.push("package.json missing leftover-shared-states script");
}
if (!catalog.includes("leftover-shared-states")) {
  fails.push("CATALOG.md must list leftover-shared-states");
}
if (!domain.includes("leftover-shared-states.cjs")) {
  fails.push("domain-by-path must trigger leftover-shared-states");
}
if (!uiPkg.includes("./components/primitives")) {
  fails.push("ui package must export primitives");
}

if (fails.length) {
  console.error("[verify:leftover-shared-states] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:leftover-shared-states] PASS (error/offline/permission/retry · receipt KEEP)",
);
