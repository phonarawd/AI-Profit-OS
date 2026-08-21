/**
 * Locked visual authority must have production route + runtime evidence.
 * Home screenshot-freeze는 기존 Home verifier가 소유한다.
 * Candidate/NO_FIGMA는 이 가드의 대상이 아니다.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const registry = JSON.parse(
  fs.readFileSync(
    path.join(root, "governance/figma/PUTDUK_FIGMA_PROJECT_REGISTRY.json"),
    "utf8",
  ),
);

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const home = registry.home || {};
if (home.visualAuthority !== "SCREENSHOT_FREEZE") {
  fails.push("Home visualAuthority must remain SCREENSHOT_FREEZE");
}
if (!exists("governance/consumer-home-approval/baselines/approved-home-desktop-1440.png")) {
  fails.push("Home freeze desktop baseline missing");
}
if (!exists("governance/consumer-home-approval/baselines/approved-home-mobile-390.png")) {
  fails.push("Home freeze mobile baseline missing");
}

const locked = [];
for (const [key, frame] of Object.entries(registry.candidateFrames || {})) {
  if (frame.classification !== "FOUNDER_APPROVED_LOCKED") continue;
  if (frame.authority !== true) {
    fails.push(`${key} locked but authority != true`);
    continue;
  }
  locked.push({ key, frame });
}

const bindings = registry.screenBindings || [];
for (const item of locked) {
  const binding = bindings.find(
    (b) => Array.isArray(b.frameKeys) && b.frameKeys.includes(item.key),
  );
  if (!binding) {
    fails.push(`${item.key}: no screenBinding`);
    continue;
  }
  if (binding.deferredByMaster === true) {
    if (!binding.targetRel) fails.push(`${item.key}: DEFERRED_BY_MASTER needs targetRel`);
    continue;
  }
  const route = String(binding.route || "");
  if (route === "/") continue;
  if (!route.startsWith("/")) {
    fails.push(`${item.key}: production route missing`);
    continue;
  }
  const appFile = path.join(
    root,
    "apps/web/app",
    route === "/me" ? "me/page.tsx" : `${route.replace(/^\//, "")}/page.tsx`,
  );
  if (!fs.existsSync(appFile)) {
    fails.push(`${item.key}: production page missing for ${route}`);
  }
  const evidenceDir = path.join(
    root,
    "governance/visual-reconciliation/account",
  );
  const needed = [
    "REFERENCE_DESKTOP.png",
    "REFERENCE_MOBILE.png",
    "RUNTIME_DESKTOP.png",
    "RUNTIME_MOBILE.png",
    "QA.md",
  ];
  for (const name of needed) {
    if (!fs.existsSync(path.join(evidenceDir, name))) {
      fails.push(`${item.key}: missing reconciliation evidence ${name}`);
    }
  }
  if (route === "/me") {
    const hub = fs.readFileSync(
      path.join(root, "apps/web/app/me/AccountHub.tsx"),
      "utf8",
    );
    if (!hub.includes("192") && !hub.includes("v2.1") && !hub.includes("계정")) {
      fails.push("/me AccountHub missing locked presentation markers");
    }
    if (!hub.includes("data-account-hub")) {
      fails.push("/me must mark locked hub presentation");
    }
  }
}

if (!exists("apps/web/app/me/AccountHub.tsx")) {
  fails.push("Account Hub production component missing");
}
if (!exists("apps/web/public/account-hub/inbox.svg")) {
  fails.push("Account Hub Figma glyphs missing from public/account-hub");
}

const pkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
const catalog = fs.readFileSync(path.join(root, "tooling/verify/CATALOG.md"), "utf8");
if (!pkg.includes('"verify:locked-visual-reconciliation"')) {
  fails.push("package.json missing verify:locked-visual-reconciliation");
}
if (!catalog.includes("locked-visual-reconciliation")) {
  fails.push("CATALOG.md must list locked-visual-reconciliation");
}

if (fails.length) {
  console.error("[verify:locked-visual-reconciliation] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:locked-visual-reconciliation] PASS (locked /me evidence + Home freeze exemption)",
);
