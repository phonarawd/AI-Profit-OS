/**
 * verify:asset-production-pipeline — REL-018
 * 표준 엔트리 + 해시 훅 + 파트너 로고 AI 경로 0 + Home 잠금 에셋 교체 0
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function sha256File(abs) {
  return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
}

const required = [
  "apps/web/scripts/asset-pipeline/run.mjs",
  "apps/web/scripts/asset-pipeline/README.md",
  "apps/web/scripts/asset-pipeline/lib/policy.cjs",
  "apps/web/scripts/asset-pipeline/inventory.v1.json",
  "apps/web/scripts/asset-pipeline/home-lock.v1.json",
  "apps/web/scripts/asset-pipeline/review-checklist.v1.json",
  "apps/web/scripts/asset-pipeline/examples/ok.request.json",
  "apps/web/scripts/asset-pipeline/examples/partner-ai.fail.json",
  "apps/web/scripts/asset-pipeline/examples/home-overwrite.fail.json",
  "apps/web/scripts/asset-pipeline/examples/emoji-icon.fail.json",
];
for (const rel of required) read(rel);

const policy = require(path.join(
  root,
  "apps/web/scripts/asset-pipeline/lib/policy.cjs",
));

const readme = read("apps/web/scripts/asset-pipeline/README.md");
for (const stage of ["source", "optimize", "hash", "public", "review"]) {
  if (!readme.toLowerCase().includes(stage)) {
    fails.push(`README missing stage: ${stage}`);
  }
}

let inventory;
try {
  inventory = JSON.parse(read("apps/web/scripts/asset-pipeline/inventory.v1.json"));
} catch (err) {
  fails.push(`inventory JSON: ${err.message}`);
  inventory = { adhocScripts: [] };
}

const expectedAdhoc = [
  "apps/web/scripts/download-spark-dash-assets.mjs",
  "apps/web/scripts/download-spark-dash-mobile-assets.mjs",
  "apps/web/scripts/process-product-sneaker.mjs",
];
const listed = (inventory.adhocScripts || []).map((s) => s.path);
for (const p of expectedAdhoc) {
  if (!listed.includes(p)) fails.push(`inventory missing adhoc script ${p}`);
}
if (inventory.standardEntry !== "apps/web/scripts/asset-pipeline/run.mjs") {
  fails.push("inventory.standardEntry must be the REL-018 entry");
}
if (inventory.partnerLogo?.aiGeneration !== "HARD_FAIL") {
  fails.push("inventory must hard-fail partner AI generation");
}
if (inventory.emojiAsIcon !== "FORBIDDEN") {
  fails.push("inventory must forbid emoji-as-icon");
}

const hay = [
  read("apps/web/scripts/asset-pipeline/run.mjs"),
  read("apps/web/scripts/asset-pipeline/lib/policy.cjs"),
].join("\n");
if (!hay.includes("FORBIDDEN_AI_SOURCE_KINDS") && !hay.includes("ai_generated")) {
  fails.push("pipeline must name forbidden AI source kinds");
}
if (!hay.includes("partner_logo") || !hay.includes("official")) {
  fails.push("pipeline must have official-only partner_logo branch");
}

const aiPartner = policy.validateRequest({
  id: "v",
  class: "partner_logo",
  source: { kind: "ai_generated", path: "x.svg", generator: "dalle" },
  destRel: "packages/ui/brand/assets/markets/ebay.svg",
});
if (!aiPartner.some((m) => /AI|official/i.test(m))) {
  fails.push("policy must hard-fail partner AI request");
}

const emojiFail = policy.validateRequest({
  id: "v",
  class: "ui_icon",
  source: {
    kind: "local_file",
    path: "apps/web/scripts/asset-pipeline/examples/fixture-source.svg",
    emoji: "⚡",
  },
  destRel: "apps/web/scripts/asset-pipeline/examples/.generated/x.svg",
});
if (!emojiFail.length) fails.push("policy must reject emoji-as-icon");

let lock;
try {
  lock = JSON.parse(read("apps/web/scripts/asset-pipeline/home-lock.v1.json"));
} catch (err) {
  fails.push(`home-lock JSON: ${err.message}`);
  lock = { files: {} };
}

const lockFiles = lock.files || {};
const lockCount = Object.keys(lockFiles).length;
if (lockCount < 40) fails.push(`home-lock file count too small: ${lockCount}`);

const sparkDir = path.join(root, "apps/web/public/spark-dash");
if (!fs.existsSync(sparkDir)) {
  fails.push("missing apps/web/public/spark-dash");
} else {
  const disk = fs.readdirSync(sparkDir).filter((n) =>
    fs.statSync(path.join(sparkDir, n)).isFile(),
  );
  for (const name of disk) {
    const rel = `apps/web/public/spark-dash/${name}`;
    const abs = path.join(root, rel);
    const actual = sha256File(abs);
    const expected = lockFiles[rel]?.sha256;
    if (!expected) {
      fails.push(`Home asset not in lock (new file?): ${rel}`);
      continue;
    }
    if (actual !== expected) {
      fails.push(`Home committed asset replaced: ${rel}`);
    }
  }
  for (const rel of Object.keys(lockFiles)) {
    if (!fs.existsSync(path.join(root, rel))) {
      fails.push(`Home locked asset missing: ${rel}`);
    }
  }
}

function runPipeline(requestRel) {
  return spawnSync(
    process.execPath,
    [
      path.join(root, "apps/web/scripts/asset-pipeline/run.mjs"),
      "--request",
      path.join(root, requestRel),
    ],
    { encoding: "utf8", cwd: root, timeout: 20_000 },
  );
}

const failCases = [
  [
    "apps/web/scripts/asset-pipeline/examples/partner-ai.fail.json",
    "partner AI",
  ],
  [
    "apps/web/scripts/asset-pipeline/examples/home-overwrite.fail.json",
    "Home overwrite",
  ],
  [
    "apps/web/scripts/asset-pipeline/examples/emoji-icon.fail.json",
    "emoji icon",
  ],
];
for (const [rel, label] of failCases) {
  const res = runPipeline(rel);
  if (res.status === 0) fails.push(`pipeline must FAIL ${label}`);
}

const ok = runPipeline(
  "apps/web/scripts/asset-pipeline/examples/ok.request.json",
);
if (ok.status !== 0) {
  fails.push(`ok fixture dry-run must PASS: ${ok.stderr || ok.stdout}`);
} else {
  try {
    const parsed = JSON.parse(ok.stdout);
    if (parsed.wrote === true) fails.push("dry-run must not write public dest");
    if (parsed.homeLocked === true) fails.push("ok fixture must not be Home locked");
    if (!parsed.destHash) fails.push("ok fixture must record dest hash");
  } catch (err) {
    fails.push(`ok fixture JSON: ${err.message}`);
  }
}

const generated = path.join(
  root,
  "apps/web/scripts/asset-pipeline/examples/.generated/fixture.svg",
);
if (fs.existsSync(generated)) {
  fails.push("dry-run leaked write into examples/.generated");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:asset-production-pipeline"')) {
  fails.push("package.json missing verify:asset-production-pipeline");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("asset-production-pipeline")) {
  fails.push("CATALOG.md must list asset-production-pipeline");
}
const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("asset-production-pipeline.cjs")) {
  fails.push("domain-by-path must trigger asset-production-pipeline");
}

if (fails.length) {
  console.error("[verify:asset-production-pipeline] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:asset-production-pipeline] PASS (entry · partner AI 0 · Home lock · hash hook)",
);
