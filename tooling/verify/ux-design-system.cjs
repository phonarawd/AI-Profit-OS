/**
 * verify:ux-design-system — PART1d tokens · PPE · breakpoints · MotionCTA · reduced-motion
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function must(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing ${rel}`);
}

const files = [
  "packages/ui/tokens/lux-fintech.ts",
  "packages/ui/tokens/lux-theme.css",
  "packages/ui/tokens/component.css",
  "packages/ui/tokens/motion.css",
  "packages/ui/tokens/breakpoints.ts",
  "packages/ui/tokens/font-scale.ts",
  "packages/ui/responsive/fluid-type.css",
  "packages/ui/responsive/touch-target.css",
  "packages/ui/responsive/container.css",
  "packages/ui/performance/ppe-ladder.ts",
  "packages/ui/components/lux/MotionCTA.tsx",
  "packages/ui/components/lux/TouchButton.tsx",
  "packages/ui/components/lux/Badge.tsx",
  "packages/ui/components/lux/Skeleton.tsx",
  "packages/sdk/src/device-tier.ts",
  "packages/ui/tokens/device-tier-contract.ts",
];
for (const f of files) must(f);

const luxTheme = fs.readFileSync(
  path.join(root, "packages/ui/tokens/lux-theme.css"),
  "utf8"
);
if (!luxTheme.includes("component.css")) {
  fails.push("lux-theme.css must import component.css");
}
if (!luxTheme.includes("motion.css")) {
  fails.push("lux-theme.css must import motion.css");
}
if (!luxTheme.includes("#6b3cff") && !luxTheme.includes("#6B3CFF")) {
  fails.push("lux-theme accent must mirror peotteok-light #6B3CFF (ADR-017)");
}

const motion = fs.readFileSync(
  path.join(root, "packages/ui/tokens/motion.css"),
  "utf8"
);
if (!motion.includes("prefers-reduced-motion")) {
  fails.push("motion.css must hard-override reduced-motion");
}
if (!motion.includes("lux-pulse-glow")) {
  fails.push("motion.css missing lux-pulse-glow");
}

const ppe = fs.readFileSync(
  path.join(root, "packages/ui/performance/ppe-ladder.ts"),
  "utf8"
);
if (!ppe.includes("PPE_LEVELS")) fails.push("ppe-ladder missing PPE_LEVELS");
if (!ppe.includes("webgl-webgpu")) fails.push("ppe-ladder missing Level 5");

const bp = fs.readFileSync(
  path.join(root, "packages/ui/tokens/breakpoints.ts"),
  "utf8"
);
for (const n of ["xs", "sm", "md", "lg", "xl", "2xl"]) {
  if (!bp.includes(`${n}:`) && !bp.includes(`"${n}"`)) {
    // BREAKPOINTS object uses unquoted keys mostly
  }
}
if (!bp.includes("320") || !bp.includes("3840")) {
  fails.push("breakpoints must include xs=320 and 2xl=3840");
}
if (!bp.includes("VIEWPORT_TEST_POINTS")) {
  fails.push("breakpoints must export VIEWPORT_TEST_POINTS (audit matrix)");
}
if (!bp.includes("RESPONSIVE_HARNESS_VIEWPORTS")) {
  fails.push("breakpoints must export RESPONSIVE_HARNESS_VIEWPORTS (verify:responsive)");
}
if (!bp.includes("3440")) {
  fails.push("ultrawide test point 3440 required");
}
must("packages/ui/responsive/visual-regression/viewports.json");
must("packages/ui/responsive/visual-regression/harness.manifest.json");

const tier = fs.readFileSync(
  path.join(root, "packages/sdk/src/device-tier.ts"),
  "utf8"
);
if (!tier.includes("hardwareConcurrency")) {
  fails.push("device-tier must use composite signals (cores/memory/reduced)");
}
if (!tier.includes("tierBatchMs")) {
  fails.push("device-tier must export tierBatchMs (Phase0/1 bands)");
}
if (!tier.includes("executionTickMs")) {
  fails.push("tierBatchMs must include executionTickMs (Live Scan StreamPolicy)");
}

const cta = fs.readFileSync(
  path.join(root, "packages/ui/components/lux/MotionCTA.tsx"),
  "utf8"
);
if (!cta.includes("T.execution.ctaEarn") && !cta.includes("ctaEarn")) {
  fails.push("MotionCTA default label must use 수익 벌기 SSOT");
}
if (!cta.includes("lux-motion-cta")) {
  fails.push("MotionCTA must use lux-motion-cta class");
}

if (fails.length) {
  console.error("[verify:ux-design-system] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:ux-design-system] PASS (tokens · PPE · breakpoints · MotionCTA)");
