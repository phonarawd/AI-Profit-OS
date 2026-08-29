const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const fails = [];
function must(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push("missing " + rel);
}
[
  "packages/ui/tokens/putduk.ts",
  "packages/ui/tokens/putduk-theme.css",
  "packages/ui/foundation/index.css",
  "packages/ui/foundation/colors.css",
  "packages/ui/navigation/consumer-navigation.ts",
  "packages/ui/primitives/Button.tsx",
  "packages/ui/primitives/Badge.tsx",
  "packages/ui/primitives/Skeleton.tsx",
  "packages/ui/primitives/PrimaryCta.tsx",
  "packages/ui/performance/VirtualList.tsx",
  "packages/ui/performance/ppe-ladder.ts",
  "packages/ui/tokens/breakpoints.ts",
  "packages/ui/tokens/font-scale.ts",
  "governance/ui/PUTDUK_UI_AUTHORITY_V1.md",
].forEach(must);
const theme = fs.readFileSync(path.join(root, "packages/ui/tokens/putduk-theme.css"), "utf8");
if (!theme.includes("foundation/index.css")) fails.push("putduk-theme must import foundation");
if (!theme.includes("--color-pd-accent")) fails.push("putduk-theme missing --color-pd-accent");
if (theme.includes("#6b3cff") || theme.includes("#6B3CFF")) fails.push("purple authority must stay 0");
const motion = fs.readFileSync(path.join(root, "packages/ui/tokens/motion.css"), "utf8");
if (!motion.includes("prefers-reduced-motion")) fails.push("motion.css reduced-motion missing");
const tokens = fs.readFileSync(path.join(root, "packages/ui/tokens/putduk.ts"), "utf8");
if (!tokens.includes("#FF2D6B")) fails.push("putduk accent must be Spark #FF2D6B");
const cta = fs.readFileSync(path.join(root, "packages/ui/primitives/PrimaryCta.tsx"), "utf8");
if (!cta.includes("ctaEarn")) fails.push("PrimaryCta default label SSOT missing");
if (fails.length) {
  console.error("[verify:putduk-design-system] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:putduk-design-system] PASS");
