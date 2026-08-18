/**
 * verify:ai-feature-platform — Engine feature + ai-platform L1/L2
 * AI PICK · AI_LOG · Eval Gate · L3 money 0 · Admin override 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "services/feature-platform/package.json",
  "services/feature-platform/src/index.cjs",
  "services/feature-platform/src/features.cjs",
  "services/feature-platform/src/vector.cjs",
  "services/ai-platform/package.json",
  "services/ai-platform/src/index.cjs",
  "services/ai-platform/src/ai-pick.cjs",
  "services/ai-platform/src/ai-log.cjs",
  "services/ai-platform/src/eval-gate.cjs",
  "services/ai-platform/src/levels.cjs",
  "services/shadow-replay-engine/package.json",
  "services/shadow-replay-engine/src/index.cjs",
  "services/api-nest/src/ai/ai.module.ts",
  "services/api-nest/src/ai/ai.engine.ts",
  "services/api-nest/src/ai/ai-pick.admin.service.ts",
  "services/api-nest/src/ai/ai-logs.admin.service.ts",
  "services/api-nest/src/ai/shadow-replay.admin.service.ts",
  "services/api-nest/src/ai/ai.routes.ts",
  "schemas/feature-vector.v1.json",
  "schemas/ai-pick-score.v1.json",
  "schemas/ai-eval-gate.v1.json",
  "schemas/shadow-replay-report.v1.json",
  "schemas/ai-answer-trace.v1.json",
  "supabase/migrations/20260809103208_ai_feature_platform_pick_eval_shadow.sql",
  "packages/ui/canon/surfaces/admin-ai-logs.wire.json",
  "apps/admin/app/admin/ai-logs/page.tsx",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:ai-feature-platform] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const featPkg = JSON.parse(read("services/feature-platform/package.json"));
if (featPkg.name !== "@aipo/feature-platform") {
  fails.push("feature-platform package name");
}
const aiPkg = JSON.parse(read("services/ai-platform/package.json"));
if (aiPkg.name !== "@aipo/ai-platform") {
  fails.push("ai-platform package name");
}

const feat = require(path.join(root, "services/feature-platform/src/index.cjs"));
const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));

if (feat.FEATURE_FORMULA_ID !== "feat_ai_pick_v1") {
  fails.push("FEATURE_FORMULA_ID lock");
}
if (!feat.FORBIDDEN_PICK_KEYS.includes("sellSuccessRate")) {
  fails.push("FORBIDDEN_PICK_KEYS must include sellSuccessRate");
}
if (!feat.FORBIDDEN_PICK_KEYS.includes("successRatePercent")) {
  fails.push("FORBIDDEN_PICK_KEYS must include successRatePercent");
}

// Twin money keys forbidden on user features
try {
  feat.extractUserFeatures({ balanceUsdt: "1" });
  fails.push("user features must reject balanceUsdt");
} catch {
  /* expected */
}

// Opportunity may use expectedProfitUsdt for scoring
try {
  feat.extractOpportunityFeatures({
    opportunityId: "o1",
    expectedProfitUsdt: "10",
    minProfitUsdt: "1",
  });
} catch (e) {
  fails.push(`opportunity expectedProfitUsdt must be allowed: ${e.message}`);
}

// sellSuccessRate forbidden on opportunity
try {
  feat.extractOpportunityFeatures({ sellSuccessRate: 0.9 });
  fails.push("opportunity must reject sellSuccessRate");
} catch {
  /* expected */
}

const now = "2026-08-09T12:00:00.000Z";
const pick = ai.scoreAiPick({
  now,
  user: {
    preferredCapitalBand: "micro",
    categoryInterest: ["watch"],
    aiPerkFlags: ["ai_pick_boost"],
  },
  market: {
    compareReady: true,
    staleAt: "2026-08-09T14:00:00.000Z",
    capitalBand: "micro",
    category: "watch",
    adapterFreshness01: 1,
  },
  opportunity: {
    opportunityId: "opp_v",
    expectedProfitUsdt: "30",
    minProfitUsdt: "5",
    capitalBand: "micro",
    compareReady: true,
  },
});
if (pick.level !== "L2") fails.push("AI PICK level must be L2");
if (pick.aiConfidenceScore !== 100) {
  fails.push(`high pick score want 100 got ${pick.aiConfidenceScore}`);
}
if (!pick.isAiPick || !pick.tags.includes("ai_pick")) {
  fails.push("high pick must tag ai_pick");
}

try {
  ai.scoreAiPick({
    opportunity: { sellSuccessRate: 0.5, expectedProfitUsdt: "1" },
  });
  fails.push("scoreAiPick must reject sellSuccessRate");
} catch {
  /* expected */
}

try {
  ai.assertNoL3Money("withdraw", "L2");
  fails.push("assertNoL3Money must throw on withdraw");
} catch (e) {
  if (e.code !== "L3_MONEY_FORBIDDEN") {
    fails.push("L3 money error code");
  }
}

if (ai.AUTO_LEARNING_ENABLED !== false) {
  fails.push("AUTO_LEARNING_ENABLED must be false");
}
const evalPass = ai.evaluateModelCandidate({
  accuracy: 0.95,
  piiLeakRate: 0,
  moneyHallucinationRate: 0,
  l3MoneyActionRate: 0,
});
if (!evalPass.pass) fails.push("eval should pass clean metrics");
const evalFail = ai.evaluateModelCandidate({
  accuracy: 0.5,
  l3MoneyActionRate: 0.1,
});
if (evalFail.pass) fails.push("eval must fail low accuracy / l3 money");
try {
  ai.promoteToProd(evalFail, { modelId: "m", version: "1" });
  fails.push("promoteToProd must reject FAIL");
} catch {
  /* expected */
}

const log = ai.buildAiLogRecord({
  intent: "balance",
  lane: "P",
  provider_id: "none",
  answer_path: "fact",
  tools_called: ["getBalance"],
  guard_result: { status: "pass" },
});
if (log.lane !== "P") fails.push("ai log lane");
try {
  ai.buildAiLogRecord({
    intent: "chat",
    lane: "G",
    provider_id: "none",
    answer_path: "llm_g",
    tools_called: ["getBalance"],
    guard_result: { status: "pass" },
  });
  fails.push("G-lane must reject money tools");
} catch {
  /* expected */
}

// Nest wiring
const appMod = read("services/api-nest/src/app.module.ts");
if (!appMod.includes("AiModule")) fails.push("app.module must import AiModule");
const apiPkg = read("services/api-nest/package.json");
for (const dep of [
  "@aipo/feature-platform",
  "@aipo/ai-platform",
  "@aipo/shadow-replay-engine",
]) {
  if (!apiPkg.includes(dep)) fails.push(`api-nest missing dep ${dep}`);
}

const routes = read("services/api-nest/src/ai/ai.routes.ts");
for (const needle of [
  "ai-logs",
  "ai-logs/eval/status",
  "ai-pick/score",
  "shadow-replay/run",
]) {
  if (!routes.includes(needle)) fails.push(`routes missing ${needle}`);
}

const pickSvc = read(
  "services/api-nest/src/ai/ai-pick.admin.service.ts",
);
for (const needle of [
  "AI_PICK_FORBIDDEN_FIELD",
  "adminOverride",
  "sellSuccessRate",
  "scoreAiPick",
]) {
  if (!pickSvc.includes(needle)) {
    fails.push(`ai-pick.admin.service missing ${needle}`);
  }
}

const mig = read(
  "supabase/migrations/20260809103208_ai_feature_platform_pick_eval_shadow.sql",
);
for (const needle of [
  "ai_model_registry",
  "ai_pick_scores",
  "shadow_replay_runs",
  "auto_learning boolean NOT NULL DEFAULT false",
  "adminOverride",
  "block_settlement",
  "ENABLE ROW LEVEL SECURITY",
]) {
  if (!mig.includes(needle)) fails.push(`migration missing ${needle}`);
}

const wire = read("packages/ui/canon/surfaces/admin-ai-logs.wire.json");
for (const f of [
  "ai_score_admin_override",
  "l3_money_execute",
  "auto_learning_on",
  "feature_platform_sidebar_module",
]) {
  if (!wire.includes(f)) fails.push(`canon forbidden missing ${f}`);
}

const adminPage = read("apps/admin/app/admin/ai-logs/page.tsx");
if (!adminPage.includes('data-forbid="ai_score_admin_override"')) {
  fails.push("admin ai-logs must forbid score override");
}
if (!adminPage.includes('data-auto-learning="false"')) {
  fails.push("admin ai-logs must lock auto learning false");
}

const adminRoutes = read("apps/admin/routes.ts");
if (!adminRoutes.includes("/admin/ai-logs?tab=pick")) {
  fails.push("admin routes missing ai-logs?tab=pick");
}
if (!adminRoutes.includes("/admin/ai-logs?tab=eval")) {
  fails.push("admin routes missing ai-logs?tab=eval");
}
// No 13th sidebar module named feature-platform
if (/feature-platform/.test(adminRoutes) && /ADMIN_MODULES/.test(adminRoutes)) {
  const modulesBlock = adminRoutes.slice(
    adminRoutes.indexOf("ADMIN_MODULES"),
    adminRoutes.indexOf("ADMIN_TOP_LEVEL_COUNT"),
  );
  if (modulesBlock.includes("feature-platform")) {
    fails.push("sidebar must not add feature-platform module");
  }
}

const rootPkg = read("package.json");
if (!rootPkg.includes("verify:ai-feature-platform")) {
  fails.push("package.json missing verify:ai-feature-platform");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("ai-feature-platform")) {
  fails.push("CATALOG must mention ai-feature-platform");
}

// No Math.random in AI PICK path (comments may mention the forbid)
const pickSrc = read("services/ai-platform/src/ai-pick.cjs");
const pickCode = pickSrc
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
if (/Math\.random/.test(pickCode)) {
  fails.push("ai-pick must not use Math.random");
}

if (fails.length) {
  console.error("[verify:ai-feature-platform] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:ai-feature-platform] PASS");
