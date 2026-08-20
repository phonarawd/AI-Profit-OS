/**
 * verify:user-opportunity-feed-policy — B-FEED-001
 * 참여 성공/진행중 → 그 유저 main feed 제거 · 다른 유저 유지 · 새 Opportunity 재노출
 * cooldown/diversity · 완전 랜덤 금지 · Admin UI 0 (Track D overlay)
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function readJson(rel) {
  const raw = read(rel);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    fail(`${rel} invalid JSON`);
    return null;
  }
}

const files = [
  "schemas/user-opportunity-feed-policy.v1.json",
  "governance/consumer-loop/user-opportunity-feed-policy.v1.json",
  "services/market-intelligence/src/user-opportunity-feed-policy.cjs",
  "services/api-nest/src/opportunities/user-opportunity-feed-policy.ts",
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
  "tooling/verify/user-opportunity-feed-policy.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const engineSrc = read(
  "services/market-intelligence/src/user-opportunity-feed-policy.cjs",
);
const nestSrc = read(
  "services/api-nest/src/opportunities/user-opportunity-feed-policy.ts",
);
const svc = read(
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
);
const idx = read("services/api-nest/src/opportunities/index.ts");
const miPkg = readJson("services/market-intelligence/package.json");
const pkg = readJson("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const schema = readJson("schemas/user-opportunity-feed-policy.v1.json");
const gov = readJson("governance/consumer-loop/user-opportunity-feed-policy.v1.json");

for (const src of [engineSrc, nestSrc]) {
  if (/Math\.random\s*\(/.test(src)) fail("feed policy must not use Math.random");
  if (/\.shuffle\s*\(/.test(src)) fail("feed policy must not shuffle");
}

if (/Date\.now\s*\(/.test(engineSrc.replace(/\/\*[\s\S]*?\*\//g, ""))) {
  fail("policy engine must take nowMs (Date.now 금지)");
}

if (!svc.includes("excludeParticipatedFromFeed")) {
  fail("listFeed owner must call excludeParticipatedFromFeed");
}
if (!svc.includes("applyStableFeedCaps")) {
  fail("listFeed owner must call applyStableFeedCaps after classification");
}
if (!svc.includes("loadUserParticipations")) {
  fail("listFeed must load session user participations");
}
if (!svc.includes("trade_executions")) {
  fail("participations must read trade_executions (user_id scoped)");
}
if (!/user_id = \$1::uuid/.test(svc) && !/user_id = \$1/.test(svc)) {
  fail("participation query must bind session user_id");
}

{
  const listSlice = svc.match(/async listFeed\([\s\S]*?async getById/);
  if (!listSlice) {
    fail("listFeed block must be locatable before getById");
  } else {
    if (!/excludeParticipatedFromFeed/.test(listSlice[0])) {
      fail("listFeed must apply participation hide before/around classification");
    }
    if (!/applyStableFeedCaps/.test(listSlice[0])) {
      fail("listFeed must apply stable caps after classification");
    }
    if (/Math\.random/.test(listSlice[0])) {
      fail("listFeed must not randomly refresh");
    }
  }
}

if (!idx.includes("excludeParticipatedFromFeed")) {
  fail("opportunities/index.ts must export feed policy symbols");
}

if (
  !miPkg?.exports?.["./user-opportunity-feed-policy"]?.includes(
    "user-opportunity-feed-policy.cjs",
  )
) {
  fail("market-intelligence must export ./user-opportunity-feed-policy");
}

if (
  pkg?.scripts?.["verify:user-opportunity-feed-policy"] !==
  "node tooling/verify/user-opportunity-feed-policy.cjs"
) {
  fail("package.json missing verify:user-opportunity-feed-policy");
}
if (catalog && !catalog.includes("user-opportunity-feed-policy")) {
  fail("CATALOG.md must list user-opportunity-feed-policy");
}

if (!schema) {
  fail("policy schema unreadable");
} else {
  for (const req of [
    "hideSuccess",
    "hideInProgress",
    "cooldownSec",
    "diversityMaxPerIdentity",
    "maxFeedSlots",
  ]) {
    if (!(schema.required || []).includes(req)) {
      fail(`schema must require ${req}`);
    }
  }
  if (schema.additionalProperties !== false) {
    fail("schema additionalProperties must be false");
  }
}

if (!gov) {
  fail("governance json unreadable");
} else {
  if (gov.task !== "B-FEED-001") fail("gov.task must be B-FEED-001");
  if (gov.rules?.RANDOM_REFRESH !== false) {
    fail("gov.rules.RANDOM_REFRESH must be false");
  }
  if (gov.rules?.OTHER_USERS_KEEP_VISIBILITY !== true) {
    fail("gov.rules.OTHER_USERS_KEEP_VISIBILITY must be true");
  }
  if (gov.rules?.REEXPOSE_ON_NEW_OPPORTUNITY !== true) {
    fail("gov.rules.REEXPOSE_ON_NEW_OPPORTUNITY must be true");
  }
  if (gov.rules?.HIDE_KEY !== "opportunities.id") {
    fail("hide key must be opportunities.id (not CanonicalProduct)");
  }
  if (gov.adminControl?.ownerTrack !== "D") {
    fail("Admin value control pointer must stay Track D");
  }
  if (gov.adminControl?.ui !== "NOT_THIS_SLICE") {
    fail("this slice must not claim Admin UI");
  }
}

const policy = require(path.join(
  root,
  "services/market-intelligence/src/user-opportunity-feed-policy.cjs",
));

if (policy.POLICY_VERSION !== "user-opportunity-feed-policy.v1") {
  fail("POLICY_VERSION");
}
if (policy.feedIdentityKey({ canonicalProductId: "cp_1", assetId: "a1" }) !== "cp:cp_1") {
  fail("identity must prefer canonicalProductId");
}
if (policy.feedIdentityKey({ assetId: "sku-9" }) !== "asset:sku-9") {
  fail("identity fallback is assetId");
}

const ranked = [
  { id: "opp-1", identityKey: "asset:A" },
  { id: "opp-2", identityKey: "asset:B" },
  { id: "opp-3", identityKey: "asset:A" },
];
const now = 1_700_000_000_000;

{
  const a = policy.excludeParticipatedFromFeed({
    candidates: ranked,
    participations: [
      {
        opportunityId: "opp-1",
        identityKey: "asset:A",
        status: "success",
        updatedAtMs: now,
      },
    ],
    nowMs: now,
    policy: policy.DEFAULT_USER_OPPORTUNITY_FEED_POLICY,
  });
  const ids = a.items.map((x) => x.id);
  if (ids.includes("opp-1")) fail("success must hide that opportunity from the same user");
  if (!ids.includes("opp-2") || !ids.includes("opp-3")) {
    fail("next eligible + new Opportunity of same identity must remain (cooldown 0)");
  }
  if (!a.excluded.some((e) => e.id === "opp-1" && e.reason === "PARTICIPATED_ACTIVE")) {
    fail("success exclude reason must be PARTICIPATED_ACTIVE");
  }
}

{
  const running = policy.excludeParticipatedFromFeed({
    candidates: ranked,
    participations: [
      {
        opportunityId: "opp-1",
        identityKey: "asset:A",
        status: "running",
        updatedAtMs: now,
      },
    ],
    nowMs: now,
  });
  if (running.items.some((x) => x.id === "opp-1")) {
    fail("running must hide that opportunity");
  }
  const requeue = policy.excludeParticipatedFromFeed({
    candidates: ranked,
    participations: [
      {
        opportunityId: "opp-1",
        identityKey: "asset:A",
        status: "requeue",
        updatedAtMs: now,
      },
    ],
    nowMs: now,
  });
  if (requeue.items.some((x) => x.id === "opp-1")) {
    fail("requeue must hide that opportunity");
  }
}

{
  const b = policy.excludeParticipatedFromFeed({
    candidates: ranked,
    participations: [],
    nowMs: now,
  });
  if (b.items.map((x) => x.id).join(",") !== "opp-1,opp-2,opp-3") {
    fail("other user (no participations) must keep the full ranked list");
  }
}

for (const status of ["safe_stop", "cancelled", "failed"]) {
  const retry = policy.excludeParticipatedFromFeed({
    candidates: ranked,
    participations: [
      {
        opportunityId: "opp-1",
        identityKey: "asset:A",
        status,
        updatedAtMs: now,
      },
    ],
    nowMs: now,
  });
  if (!retry.items.some((x) => x.id === "opp-1")) {
    fail(`${status} must not hide the same opportunity (재시도 가능)`);
  }
}

{
  const cooled = policy.excludeParticipatedFromFeed({
    candidates: ranked,
    participations: [
      {
        opportunityId: "opp-1",
        identityKey: "asset:A",
        status: "success",
        updatedAtMs: now,
      },
    ],
    nowMs: now + 30_000,
    policy: { cooldownSec: 60 },
  });
  if (cooled.items.some((x) => x.id === "opp-3")) {
    fail("cooldown must delay same-identity *new* Opportunity");
  }
  if (!cooled.excluded.some((e) => e.id === "opp-3" && e.reason === "IDENTITY_COOLDOWN")) {
    fail("cooldown exclude reason must be IDENTITY_COOLDOWN");
  }
  const after = policy.excludeParticipatedFromFeed({
    candidates: ranked,
    participations: [
      {
        opportunityId: "opp-1",
        identityKey: "asset:A",
        status: "success",
        updatedAtMs: now,
      },
    ],
    nowMs: now + 61_000,
    policy: { cooldownSec: 60 },
  });
  if (!after.items.some((x) => x.id === "opp-3")) {
    fail("after cooldown, new Opportunity of same identity must re-expose");
  }
}

{
  const diverse = policy.applyStableFeedCaps({
    candidates: ranked,
    policy: { diversityMaxPerIdentity: 1 },
  });
  const ids = diverse.items.map((x) => x.id);
  if (ids.join(",") !== "opp-1,opp-2") {
    fail("diversity must keep rank order and fill next eligible (opp-3 skipped)");
  }
  if (!diverse.excluded.some((e) => e.id === "opp-3" && e.reason === "DIVERSITY_CAP")) {
    fail("diversity exclude reason");
  }
}

{
  const slots = policy.applyStableFeedCaps({
    candidates: ranked,
    policy: { maxFeedSlots: 2 },
  });
  if (slots.items.map((x) => x.id).join(",") !== "opp-1,opp-2") {
    fail("allocation must cap after stable rank");
  }
  if (!slots.excluded.some((e) => e.id === "opp-3" && e.reason === "ALLOCATION_CAP")) {
    fail("allocation exclude reason");
  }
}

{
  const once = policy.applyUserOpportunityFeedPolicy({
    candidates: ranked,
    participations: [
      {
        opportunityId: "opp-1",
        identityKey: "asset:A",
        status: "success",
        updatedAtMs: now,
      },
    ],
    nowMs: now,
    policy: { diversityMaxPerIdentity: 1, maxFeedSlots: 2 },
  });
  const twice = policy.applyUserOpportunityFeedPolicy({
    candidates: ranked,
    participations: [
      {
        opportunityId: "opp-1",
        identityKey: "asset:A",
        status: "success",
        updatedAtMs: now,
      },
    ],
    nowMs: now,
    policy: { diversityMaxPerIdentity: 1, maxFeedSlots: 2 },
  });
  if (once.items.map((x) => x.id).join(",") !== twice.items.map((x) => x.id).join(",")) {
    fail("same input must yield the same feed (stable, not random)");
  }
}

if (fails.length) {
  console.error("[verify:user-opportunity-feed-policy] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:user-opportunity-feed-policy] PASS (참여 hide · 타유저 유지 · 새 Opportunity 재노출 · cooldown/diversity · random 0)",
);
