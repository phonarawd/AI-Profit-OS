/**
 * verify:deposit-ai-template-path — UI §51.21 PART8b
 * First Deposit 60s Consult · Q2/Q4 = template not raw LLM
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
  "packages/ui/components/trust/DepositConsult.tsx",
  "packages/ui/copy/ko/trust.ts",
  "packages/ui/copy/ko/objections.ts",
  "apps/web/app/wallet/deposit/page.tsx",
  "packages/ui/canon/surfaces/wallet-deposit.wire.json",
];
for (const f of files) mustExist(f);

const consult = read("packages/ui/components/trust/DepositConsult.tsx");
for (const needle of [
  'data-testid="deposit-consult"',
  'data-template-path="true"',
  'data-llm="false"',
  'data-lane="P"',
  "T.objections.q2",
  "T.objections.q4",
  'data-testid="deposit-consult-q2"',
  'data-testid="deposit-consult-q4"',
  "peotteok_deposit_consult_ack",
]) {
  if (!consult.includes(needle)) {
    fails.push(`DepositConsult missing ${needle}`);
  }
}

// Must not call LLM / fetch chat completions
const llmBans = [
  "openai",
  "anthropic",
  "chat/completions",
  "CoachOrchestrator",
  "fetch(",
  "useChat",
  "streamText",
];
for (const ban of llmBans) {
  if (consult.includes(ban)) {
    fails.push(`DepositConsult must be template-only (found ${ban})`);
  }
}

const deposit = read("apps/web/app/wallet/deposit/page.tsx");
if (!deposit.includes("DepositConsult")) {
  fails.push("deposit page must mount DepositConsult");
}

const trust = read("packages/ui/copy/ko/trust.ts");
if (!trust.includes("depositConsult:")) {
  fails.push("trust.ts missing depositConsult copy");
}

const wire = JSON.parse(
  read("packages/ui/canon/surfaces/wallet-deposit.wire.json") || "{}",
);
const blocks = (wire.blocks || []).map((b) => b.id);
if (!blocks.includes("depositConsult")) {
  fails.push("wallet-deposit wire missing depositConsult block");
}

const objections = read("packages/ui/copy/ko/objections.ts");
if (!objections.includes("q2:") || !objections.includes("q4:")) {
  fails.push("objections Q2/Q4 template SSOT required");
}

if (fails.length) {
  console.error(
    "[verify:deposit-ai-template-path] FAIL\n- " + fails.join("\n- "),
  );
  process.exit(1);
}
console.log(
  "[verify:deposit-ai-template-path] PASS (Q2/Q4 template · LLM 0 · P레인)",
);
