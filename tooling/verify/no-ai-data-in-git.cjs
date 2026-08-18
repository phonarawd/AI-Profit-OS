/**
 * verify:no-ai-data-in-git — Engine §47.9
 * GitHub = code/prompts/rules only · PII · 대화원문 · AI_LOG dumps · 학습셋 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const DENY_GLOBS = [
  // committed conversation / training dumps
  /^data\/ai\//i,
  /^datasets?\//i,
  /^training\//i,
  /^ai_logs?\//i,
  /^exports\/ai_logs?/i,
  /\.ai-log(s)?\.jsonl$/i,
  /conversation(s)?\.jsonl$/i,
  /chat[-_]export/i,
  /pii[-_]dump/i,
  /learning[-_]set/i,
  /train(ing)?[-_]set/i,
];

const DENY_PATH_SNIPPETS = [
  "ai_logs_export",
  "user_conversations",
  "prod_chat_dump",
];

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ent.name === "node_modules" ||
      ent.name === ".git" ||
      ent.name === "dist" ||
      ent.name === ".next" ||
      ent.name === "target" ||
      ent.name === "coverage" ||
      ent.name === ".wrangler"
    ) {
      continue;
    }
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, onFile);
    else onFile(p);
  }
}

const hits = [];
walk(root, (abs) => {
  const rel = path.relative(root, abs).replace(/\\/g, "/");
  // allow schemas / services code / eval fixture stubs under services
  if (rel.startsWith("schemas/")) return;
  if (rel.startsWith("services/")) return;
  if (rel.startsWith("tooling/")) return;
  if (rel.startsWith("packages/")) return;
  if (rel.startsWith("apps/")) return;
  if (rel.startsWith("supabase/")) return;
  if (rel.startsWith(".cursor/")) return;
  if (rel.startsWith("docs/")) return;
  if (rel.startsWith("CONSTITUTION/")) return;
  if (rel.startsWith("infra/")) return;
  if (rel.startsWith("workers/")) return;

  for (const re of DENY_GLOBS) {
    if (re.test(rel)) hits.push(rel);
  }
  for (const snip of DENY_PATH_SNIPPETS) {
    if (rel.toLowerCase().includes(snip)) hits.push(rel);
  }
});

if (hits.length) {
  fails.push("forbidden AI data paths in git tree:\n  - " + hits.join("\n  - "));
}

// Golden traces under shadow-replay are synthetic fixtures — OK
// Ensure no real-looking email/phone dumps in those goldens
const goldenDir = path.join(
  root,
  "services/shadow-replay-engine/testdata/golden",
);
if (fs.existsSync(goldenDir)) {
  for (const f of fs.readdirSync(goldenDir)) {
    if (!f.endsWith(".json")) continue;
    const t = fs.readFileSync(path.join(goldenDir, f), "utf8");
    if (/@[a-z0-9.-]+\.[a-z]{2,}/i.test(t) && /email/i.test(t)) {
      fails.push(`golden ${f} looks like PII email dump`);
    }
    if (/\b01[016-9]-?\d{3,4}-?\d{4}\b/.test(t)) {
      fails.push(`golden ${f} looks like KR phone PII`);
    }
  }
}

// Lock statement in ai-platform / eval
const evalSrc = fs.readFileSync(
  path.join(root, "services/ai-platform/src/eval-gate.cjs"),
  "utf8",
);
if (!/AUTO_LEARNING_ENABLED\s*=\s*false/.test(evalSrc)) {
  fails.push("eval-gate must lock AUTO_LEARNING_ENABLED=false");
}

const rootPkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
if (!rootPkg.includes("verify:no-ai-data-in-git")) {
  fails.push("package.json missing verify:no-ai-data-in-git");
}

if (fails.length) {
  console.error("[verify:no-ai-data-in-git] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:no-ai-data-in-git] PASS");
