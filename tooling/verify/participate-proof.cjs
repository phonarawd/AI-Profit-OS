/**
 * verify:participate-proof — UI §51.16 PART8b
 * every participate stores proof · success/safe_stop UI shows match
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
  "schemas/participate-proof.v1.json",
  "packages/ui/components/trust/ParticipateProofPanel.tsx",
  "packages/ui/components/execution/ExecutionSuccessReceipt.tsx",
  "packages/ui/components/execution/ExecutionSafeStop.tsx",
  "packages/ui/copy/ko/trust.ts",
  "services/api-nest/src/opportunities/participate.service.ts",
];
for (const f of files) mustExist(f);

const schema = JSON.parse(read("schemas/participate-proof.v1.json") || "{}");
for (const req of [
  "tradeId",
  "pricingVersion",
  "buyPriceUsdt",
  "sellPriceUsdt",
  "expectedProfitUsdt",
  "fxSnapshotId",
  "proofHash",
  "capturedAt",
]) {
  if (!(schema.required || []).includes(req)) {
    fails.push(`participate-proof schema missing required ${req}`);
  }
}

const panel = read("packages/ui/components/trust/ParticipateProofPanel.tsx");
for (const needle of [
  'data-testid="participate-proof-panel"',
  'data-testid="participate-proof-copy"',
  "proofHash",
  "T.trust.proof",
]) {
  if (!panel.includes(needle)) {
    fails.push(`ParticipateProofPanel missing ${needle}`);
  }
}
if (!read("packages/ui/copy/ko/trust.ts").includes("proof:")) {
  fails.push("trust.ts missing proof copy");
}
if (!read("packages/ui/copy/ko/trust.ts").includes("참여할 때 본 조건")) {
  fails.push("trust.proof.title must lock 참여할 때 본 조건");
}

const success = read(
  "packages/ui/components/execution/ExecutionSuccessReceipt.tsx",
);
const safe = read("packages/ui/components/execution/ExecutionSafeStop.tsx");
if (!success.includes("ParticipateProofPanel")) {
  fails.push("ExecutionSuccessReceipt must mount ParticipateProofPanel");
}
if (!safe.includes("ParticipateProofPanel")) {
  fails.push("ExecutionSafeStop must mount ParticipateProofPanel");
}

const svc = read(
  "services/api-nest/src/opportunities/participate.service.ts",
);
for (const needle of [
  "buildParticipateProof",
  "proofHash",
  "createHash",
  "participateProof",
  "sha256",
]) {
  if (!svc.includes(needle)) {
    fails.push(`participate.service must store proof (${needle})`);
  }
}

// Companion PART8b surfaces (SafeStop / Journey / AdapterHealth)
for (const rel of [
  "packages/ui/components/trust/SafeStopTrustMetric.tsx",
  "packages/ui/components/trust/CapitalBandJourney.tsx",
  "packages/ui/components/trust/AdapterHealthChip.tsx",
]) {
  mustExist(rel);
}

const chip = read("packages/ui/components/trust/AdapterHealthChip.tsx");
if (!chip.includes('data-testid="adapter-health-chip"')) {
  fails.push("AdapterHealthChip missing testid");
}
const card = read("packages/ui/components/opportunity/OpportunityCard.tsx");
if (!card.includes("AdapterHealthChip")) {
  fails.push("OpportunityCard must mount AdapterHealthChip");
}

const me =
  read("apps/web/app/me/page.tsx") +
  (fs.existsSync(path.join(root, "apps/web/app/me/ProfileClient.tsx"))
    ? read("apps/web/app/me/ProfileClient.tsx")
    : "");
if (me.includes("SafeStopTrustMetric") || me.includes("CapitalBandJourney")) {
  fails.push(
    "/me must not remount SafeStop/CapitalBand without a real account owner",
  );
}

const safeMetric = read(
  "packages/ui/components/trust/SafeStopTrustMetric.tsx",
);
if (
  /낙첨|실패했어요|당첨 실패/.test(safeMetric) ||
  /낙첨|당첨 실패/.test(read("packages/ui/copy/ko/trust.ts"))
) {
  fails.push("safe_stop must not use 낙첨/실패 framing");
}

if (fails.length) {
  console.error("[verify:participate-proof] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:participate-proof] PASS (store+UI · SafeStop/Journey/AdapterHealth)",
);
