/**
 * REL-023 Day-1 PWA certification harness.
 * store-bridge / POST-017 포함 금지.
 */
const {
  assertQaIsolation,
} = require("../e2e/lib/qa-env-isolation-guard.cjs");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function runDay1CertCases() {
  assertQaIsolation({ purpose: "qa", host: "localhost" });

  const checklist = JSON.parse(read("governance/pwa/day1-checklist.v1.json"));
  const evidence = {
    "REL-014": exists("governance/release-master/REL-014-PWA-NATIVE-SHELL.md"),
    "REL-020": exists("governance/release-master/REL-020-PUSH-BADGE.md"),
    "REL-021": exists("governance/release-master/REL-021-PUSH-CHANNEL-FILTER.md"),
    "REL-022": exists("governance/release-master/REL-022-WEBAUTHN-UX.md"),
  };

  const manifest = JSON.parse(read("apps/web/public/manifest.webmanifest"));
  const sw = read("apps/web/public/sw.js");
  const runtime = read("apps/web/components/pwa/PwaRuntime.tsx");
  const dedup = read("packages/ui/components/toast/pushDedup.ts");
  const haptic = read("packages/ui/components/auth/webauthn-ready.ts");
  const kill = read("workers/push-dispatcher/src/lib/dispatch.cjs");

  const items = {
    manifest:
      manifest.name === "퍼뜩" &&
      manifest.display === "standalone" &&
      Array.isArray(manifest.icons) &&
      manifest.icons.length >= 2,
    install: runtime.includes("InstallPrompt") && runtime.includes("serviceWorker"),
    offline:
      sw.includes("연결이 끊겼어요") &&
      sw.includes("cacheFirst") &&
      sw.includes('startsWith("/api/")'),
    push_dedup:
      dedup.includes("shouldShowToast") &&
      sw.includes("sourceEventId") &&
      sw.includes("tag:"),
    webauthn:
      exists("governance/pwa/webauthn-rp.v1.json") &&
      read("packages/ui/components/auth/AuthLogin.tsx").includes(
        "auth-passkey-fallback",
      ),
    reduced_motion: haptic.includes("prefers-reduced-motion"),
    badge: sw.includes("setAppBadge"),
    kill: kill.includes('status: "killed"') && kill.includes("sendAttempted: false"),
  };

  const storeBridgeLeak =
    checklist.storeBridge !== 0 || checklist.post017 !== 0;

  return {
    checklist,
    evidence,
    items,
    storeBridge: checklist.storeBridge,
    post017: checklist.post017,
    storeBridgeLeak,
  };
}

module.exports = { runDay1CertCases };
