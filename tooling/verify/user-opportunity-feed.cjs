/**
 * verify:user-opportunity-feed — Engine §0.9 E-R3
 * GET /api/v1/opportunities(+/:id) · OpportunitiesUserController
 * OPPORTUNITY_USER_ROUTES · buildBalanceAwareFeedWithOverrides
 * executionPlatforms 유저0 · arbitrageTypeKo pass-through · admin 분리
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "schemas/opportunity-card.v1.json",
  "services/api-nest/src/opportunities/opportunities.user.routes.ts",
  "services/api-nest/src/opportunities/opportunities.user.controller.ts",
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
  "services/api-nest/src/opportunities/balance-aware-feed.ts",
  "services/api-nest/src/opportunities/opportunities.module.ts",
  "services/market-intelligence/src/capital-provider-projection.cjs",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:user-opportunity-feed] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const routes = read(
  "services/api-nest/src/opportunities/opportunities.user.routes.ts",
);
const ctrl = read(
  "services/api-nest/src/opportunities/opportunities.user.controller.ts",
);
const svc = read(
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
);
const mod = read("services/api-nest/src/opportunities/opportunities.module.ts");
const adminCtrl = read(
  "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
);
const idx = read("services/api-nest/src/opportunities/index.ts");
const schema = JSON.parse(read("schemas/opportunity-card.v1.json"));

// --- routes SSOT ---
if (!/export const OPPORTUNITY_USER_ROUTES\s*=\s*\{/.test(routes)) {
  fails.push("OPPORTUNITY_USER_ROUTES must be exported as const object");
}
if (!routes.includes('list: "opportunities"')) {
  fails.push('OPPORTUNITY_USER_ROUTES.list must be "opportunities"');
}
if (!routes.includes('get: "opportunities/:id"')) {
  fails.push('OPPORTUNITY_USER_ROUTES.get must be "opportunities/:id"');
}
if (!/as const/.test(routes)) {
  fails.push("OPPORTUNITY_USER_ROUTES must use as const");
}
if (routes.includes("OPPORTUNITY_ADMIN_ROUTES")) {
  fails.push("user routes must not import/share OPPORTUNITY_ADMIN_ROUTES");
}

// --- controller separation ---
if (!ctrl.includes("export class OpportunitiesUserController")) {
  fails.push("OpportunitiesUserController class missing");
}
if (!ctrl.includes("OPPORTUNITY_USER_ROUTES")) {
  fails.push("user controller must use OPPORTUNITY_USER_ROUTES");
}
if (!ctrl.includes("@Get(OPPORTUNITY_USER_ROUTES.list)")) {
  fails.push("GET list must bind OPPORTUNITY_USER_ROUTES.list");
}
if (!ctrl.includes("@Get(OPPORTUNITY_USER_ROUTES.get)")) {
  fails.push("GET :id must bind OPPORTUNITY_USER_ROUTES.get");
}
if (/@Controller\(\s*["']admin["']\s*\)/.test(ctrl)) {
  fails.push("OpportunitiesUserController must not be under admin");
}
if (adminCtrl.includes("OpportunitiesUserController")) {
  fails.push("admin controller must stay separate from user controller");
}
if (adminCtrl.includes("OPPORTUNITY_USER_ROUTES")) {
  fails.push("admin controller must not use OPPORTUNITY_USER_ROUTES");
}

// §0.9.3 — JWT session only · query/body userId FORBIDDEN
if (/@Query\(\s*["']userId["']\s*\)/.test(ctrl)) {
  fails.push("user controller must not take @Query('userId')");
}
if (/body\.userId/.test(ctrl)) {
  fails.push("user controller must not trust body.userId");
}
if (!ctrl.includes("req.user")) {
  fails.push("user controller must derive userId from JWT req.user");
}
if (!ctrl.includes("AUTH_REQUIRED") && !ctrl.includes("UnauthorizedException")) {
  fails.push("missing session UnauthorizedException / AUTH_REQUIRED");
}

// --- service wiring ---
if (!svc.includes("buildBalanceAwareFeedWithOverrides")) {
  fails.push("user service must call buildBalanceAwareFeedWithOverrides");
}
if (!svc.includes("projectCapitalProviderUserSurface")) {
  fails.push("user service must project via projectCapitalProviderUserSurface");
}
if (!svc.includes("arbitrage_type_ko") && !svc.includes("arbitrageTypeKo")) {
  fails.push("user service must pass-through arbitrageTypeKo");
}
if (!/arbitrageTypeKo:\s*row\.arbitrage_type_ko/.test(svc)) {
  fails.push("arbitrageTypeKo must be DB pass-through (row.arbitrage_type_ko)");
}
if (!svc.includes("executionPlatforms")) {
  fails.push("service must load executionPlatforms before strip (INTERNAL)");
}
if (!svc.includes('audience: "user"') && !svc.includes("audience: 'user'")) {
  fails.push("projectCapitalProviderUserSurface audience must be user");
}

// --- module registration ---
if (!mod.includes("OpportunitiesUserController")) {
  fails.push("OpportunitiesModule must register OpportunitiesUserController");
}
if (!mod.includes("OpportunitiesUserService")) {
  fails.push("OpportunitiesModule must provide OpportunitiesUserService");
}
if (!mod.includes("LedgerModule")) {
  fails.push("OpportunitiesModule must import LedgerModule (principal)");
}
if (!mod.includes("ExecutionPolicyModule")) {
  fails.push("OpportunitiesModule must import ExecutionPolicyModule (nearMissCap)");
}
if (!idx.includes("OPPORTUNITY_USER_ROUTES")) {
  fails.push("opportunities/index.ts must export OPPORTUNITY_USER_ROUTES");
}

// --- schema contract ---
for (const req of [
  "id",
  "arbitrageType",
  "arbitrageTypeKo",
  "executionMode",
  "assetImageUrl",
  "requiredCapitalUsdt",
  "expectedProfitUsdt",
  "status",
]) {
  if (!(schema.required || []).includes(req)) {
    fails.push(`opportunity-card.v1 must require ${req}`);
  }
}
if (!schema.properties?.executionPlatforms) {
  fails.push("schema must document executionPlatforms (INTERNAL)");
}
if (!String(schema.properties.executionPlatforms.description || "").includes("user UI 0")) {
  fails.push("executionPlatforms description must lock user UI 0");
}

// --- package script ---
const pkg = JSON.parse(read("package.json"));
if (pkg.scripts?.["verify:user-opportunity-feed"] !== "node tooling/verify/user-opportunity-feed.cjs") {
  fails.push("package.json missing verify:user-opportunity-feed script");
}

const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("user-opportunity-feed")) {
  fails.push("CATALOG.md must list user-opportunity-feed");
}

// --- MI strip invariant (runtime) ---
const mi = require(path.join(
  root,
  "services/market-intelligence/src/capital-provider-projection.cjs",
));
const projected = mi.projectCapitalProviderUserSurface(
  {
    id: "opp-1",
    arbitrageType: "price",
    arbitrageTypeKo: "시세차익",
    executionMode: "orchestrate",
    executionPlatforms: ["ebay_us", "admin"],
    expectedSellDays: 3,
    requiredCapitalUsdt: "50",
  },
  { audience: "user" },
);
if ("executionPlatforms" in projected) {
  fails.push("user projection must strip executionPlatforms");
}
if ("expectedSellDays" in projected) {
  fails.push("user projection must strip expectedSellDays");
}
if (projected.arbitrageTypeKo !== "시세차익") {
  fails.push("arbitrageTypeKo must pass through projection");
}

if (fails.length) {
  console.error("[verify:user-opportunity-feed] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:user-opportunity-feed] PASS (OpportunitiesUserController · feed+get · strip platforms · arbitrageTypeKo)",
);
