/**
 * verify:no-success-rate-as-rule — Engine §51.3
 * sellSuccessRate / successRatePercent MUST NOT feed §48 Rule or AI PICK
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const feat = require(path.join(root, "services/feature-platform/src/index.cjs"));
const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));

if (!feat.FORBIDDEN_PICK_KEYS.includes("sellSuccessRate")) {
  fails.push("feature-platform FORBIDDEN_PICK_KEYS missing sellSuccessRate");
}
if (!feat.FORBIDDEN_PICK_KEYS.includes("successRatePercent")) {
  fails.push("feature-platform FORBIDDEN_PICK_KEYS missing successRatePercent");
}

try {
  feat.buildFeatureVector({
    opportunity: { sellSuccessRate: 0.92, expectedProfitUsdt: "10" },
  });
  fails.push("buildFeatureVector must reject sellSuccessRate");
} catch {
  /* expected */
}

try {
  ai.scoreAiPick({
    opportunity: { successRatePercent: 88, expectedProfitUsdt: "10" },
  });
  fails.push("scoreAiPick must reject successRatePercent");
} catch {
  /* expected */
}

// Settlement rule path — no sellSuccessRate / successRatePercent usage
const rulePaths = [
  "services/engine-rust/src/settlement_rule.rs",
  "services/engine-rust/settlement_rule.cjs",
];
for (const rel of rulePaths) {
  const src = read(rel);
  if (/sellSuccessRate/.test(src)) {
    fails.push(`${rel} must not reference sellSuccessRate`);
  }
  // successRatePercent already gated elsewhere; keep dual check
  if (/successRatePercent/.test(src.replace(/FORBIDDEN[^\n]*/g, ""))) {
    // allow comments that forbid it
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    if (/successRatePercent/.test(stripped)) {
      fails.push(`${rel} must not use successRatePercent`);
    }
  }
}

const pickSrc = read("services/ai-platform/src/ai-pick.cjs");
const weightsMatch = pickSrc.match(
  /const SCORE_WEIGHTS\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\)/,
);
if (!weightsMatch) {
  fails.push("SCORE_WEIGHTS block missing");
} else if (
  /sellSuccessRate|successRatePercent|adminOverride/.test(weightsMatch[1])
) {
  fails.push("SCORE_WEIGHTS must not include sellSuccessRate/successRatePercent");
}
if (!pickSrc.includes("AI_PICK_FORBIDDEN_INPUT")) {
  fails.push("ai-pick must hard-reject forbidden inputs");
}

const mig = read(
  "supabase/migrations/20260809103208_ai_feature_platform_pick_eval_shadow.sql",
);
if (!mig.includes("sellSuccessRate")) {
  fails.push("ai_pick_scores CHECK must forbid sellSuccessRate");
}

const rootPkg = read("package.json");
if (!rootPkg.includes("verify:no-success-rate-as-rule")) {
  fails.push("package.json missing verify:no-success-rate-as-rule");
}

if (fails.length) {
  console.error("[verify:no-success-rate-as-rule] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:no-success-rate-as-rule] PASS");
