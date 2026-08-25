/**
 * verify:p0-ebay-secret-provisioning — P0-B1
 * production ebay-adapter secret path · 값 출력 0 · dry-run mutation=0
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const deployScript = path.join(root, "tooling/deploy/cf-ebay-secrets.cjs");
const deploy = require(deployScript);
const fails = [];

const FOUR = Object.freeze([
  "EBAY_CLIENT_ID",
  "EBAY_CLIENT_SECRET",
  "NEST_ADAPTER_INGEST_URL",
  "ADAPTER_INGEST_TOKEN",
]);

const SECRET_VALUE_NEEDLES = Object.freeze([
  ...FOUR,
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
]);

function fail(message) {
  fails.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function spawnSecrets(args, extraEnv) {
  return spawnSync(process.execPath, [deployScript, ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: "",
      CLOUDFLARE_ACCOUNT_ID: "",
      EBAY_CLIENT_ID: "",
      EBAY_CLIENT_SECRET: "",
      NEST_ADAPTER_INGEST_URL: "",
      ADAPTER_INGEST_TOKEN: "",
      ALLOW_PRODUCTION_EBAY_SECRET_PUT: "",
      ...(extraEnv || {}),
    },
  });
}

function assertNoSecretValues(text, label) {
  const body = String(text || "");
  for (const name of SECRET_VALUE_NEEDLES) {
    const value = process.env[name];
    if (value && value.length > 0 && body.includes(value)) {
      fail(`${label} leaked secret value for ${name}`);
    }
  }
  if (
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(body) ||
    /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+\./.test(body)
  ) {
    fail(`${label} looks like it printed a secret payload`);
  }
}

function assertNoMutation(stdout, stderr, label) {
  const body = `${stdout || ""}\n${stderr || ""}`;
  if (/\[cf:ebay-secrets\] PASS ·/.test(body) && /DRY-RUN/.test(body) === false) {
    fail(`${label} must not report apply PASS`);
  }
  if (/Uploaded secret|Current Version ID:|Published/.test(body)) {
    fail(`${label} looks like a Cloudflare secret upload`);
  }
  if (/\[cf:deploy:workers\] deploying /.test(body)) {
    fail(`${label} entered worker deploy`);
  }
}

if (!Array.isArray(deploy.SECRET_NAMES) || deploy.SECRET_NAMES.length !== 4) {
  fail("SECRET_NAMES must be exactly four production adapter secrets");
}
if (JSON.stringify(deploy.SECRET_NAMES) !== JSON.stringify(FOUR)) {
  fail("SECRET_NAMES must be EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, NEST_ADAPTER_INGEST_URL, ADAPTER_INGEST_TOKEN");
}
if (deploy.PRODUCTION_WORKER !== "ebay-adapter") fail("PRODUCTION_WORKER must be ebay-adapter");
if (deploy.WRANGLER_ENV !== "production") fail("WRANGLER_ENV must be production");
if (deploy.ALLOWED_WORKER_SET !== "p0-ebay") fail("ALLOWED_WORKER_SET must be p0-ebay");

const preview = deploy.validateTarget("preview");
if (preview.ok) fail("validateTarget(preview) must FAIL");
const staging = deploy.validateTarget("staging");
if (staging.ok) fail("validateTarget(staging) must FAIL");
const prod = deploy.validateTarget("production");
if (!prod.ok) fail("validateTarget(production) must PASS");

const yahoo = deploy.validateWorker("yahoo-jp-adapter");
if (yahoo.ok) fail("yahoo-jp-adapter must fail-closed");
const previewWorker = deploy.validateWorker("ebay-adapter-preview");
if (previewWorker.ok) fail("ebay-adapter-preview must fail-closed");
const workerOk = deploy.validateWorker("ebay-adapter");
if (!workerOk.ok) fail("ebay-adapter worker must PASS");
const phase1Set = deploy.validateWorkerSet("phase1");
if (phase1Set.ok) fail("worker_set=phase1 must fail-closed");
const p0Set = deploy.validateWorkerSet("p0-ebay");
if (!p0Set.ok) fail("worker_set=p0-ebay must PASS");

const src = read("tooling/deploy/cf-ebay-secrets.cjs");
if (/loadDotEnv\s*\(/.test(src)) fail("cf-ebay-secrets.cjs must not load .env");
if (/readFileSync\([^)]*\.env/.test(src)) fail("cf-ebay-secrets.cjs must not read .env");
if (/ebay-adapter-preview/.test(src) === false) {
  fail("cf-ebay-secrets.cjs must list ebay-adapter-preview as forbidden");
}
if (/--env[= ]preview/.test(src)) fail("cf-ebay-secrets.cjs must not wrangler --env preview");
if (!/WRANGLER_ENV = "production"/.test(src)) {
  fail("cf-ebay-secrets.cjs must pin wrangler env to production");
}
if (/wrangler deploy|--secrets-file/.test(src)) {
  fail("provision script must not call wrangler deploy or --secrets-file");
}
if (/from-preview|copy-preview/i.test(src)) {
  fail("provision script must not copy preview secrets");
}
if (!src.includes('["versions", "list"')) {
  fail("provision script must prove production worker via wrangler versions list");
}
if (!src.includes('node_modules", "wrangler", "bin", "wrangler.js"')) {
  fail("provision script must spawn wrangler.js by filesystem path so stdin reaches secret put");
}
if (/require\.resolve\("wrangler/.test(src)) {
  fail("provision script must not require.resolve wrangler (package exports hide the bin)");
}
if (/shell:\s*true/.test(src)) {
  fail("provision script must not use shell:true (stdin/secret put would not reach wrangler)");
}
if (!/putLooksSuccessful/.test(src)) {
  fail("secret put must require wrangler success text, not only exit 0");
}
if (!/firstBind/.test(src)) {
  fail("first production bind must tolerate empty secret list");
}
if (!/--name/.test(src) || src.includes("--name preview")) {
  fail("wrangler secret commands must target --name ebay-adapter only");
}

const workflowRel = ".github/workflows/provision-ebay-adapter-secrets.yml";
if (!fs.existsSync(path.join(root, workflowRel))) {
  fail("missing provision-ebay-adapter-secrets.yml");
} else {
  const workflow = read(workflowRel);
  if (!/workflow_dispatch:/.test(workflow)) fail("workflow must be workflow_dispatch");
  if (!/environment:\s*production/.test(workflow)) {
    fail("workflow must use GitHub environment production");
  }
  if (!/cf-ebay-secrets\.cjs production --dry-run/.test(workflow)) {
    fail("workflow must invoke production --dry-run");
  }
  if (!/cf-ebay-secrets\.cjs production --apply/.test(workflow)) {
    fail("workflow must invoke production --apply");
  }
  if (!/set \+x/.test(workflow)) fail("workflow must disable shell xtrace");
  if (!/default:\s*dry-run/.test(workflow)) fail("workflow default mode must be dry-run");
  if (/- preview/.test(workflow)) fail("workflow must not offer preview target/worker");
  if (/yahoo-jp-adapter|yahoo_jp/.test(workflow)) fail("workflow must not mention yahoo_jp");
  if (/ebay-adapter-preview|--env preview|preview_copy=1/.test(workflow)) {
    fail("workflow must not copy secrets to preview");
  }
  if (/echo\s+("|')?\$(\{)?\{?\s*secrets\.(EBAY_|ADAPTER_|NEST_ADAPTER)/.test(workflow)) {
    fail("workflow must not echo adapter secret values");
  }
  if (/echo\s+"\$EBAY_CLIENT_(ID|SECRET)"/.test(workflow)) {
    fail("workflow must not echo EBAY_CLIENT_* values");
  }
  if (!/EBAY_CLIENT_ID_PRESENT/.test(workflow)) {
    fail("workflow must print presence flags only");
  }
  for (const name of FOUR) {
    if (!workflow.includes(name)) fail(`workflow missing secret name ${name}`);
  }
}

const deployWorkflow = read(".github/workflows/deploy-cloudflare.yml");
if (/wrangler secret put|EBAY_CLIENT_ID|ADAPTER_INGEST_TOKEN/.test(deployWorkflow)) {
  fail("deploy-cloudflare.yml must not provision ebay runtime secrets");
}

const dry = spawnSecrets(["production", "--dry-run"]);
if (dry.status !== 0) fail("production --dry-run must PASS");
if (!/mutation=0/.test(`${dry.stdout || ""}\n${dry.stderr || ""}`)) {
  fail("production --dry-run must declare mutation=0");
}
if (!/secret_names=EBAY_CLIENT_ID,EBAY_CLIENT_SECRET,NEST_ADAPTER_INGEST_URL,ADAPTER_INGEST_TOKEN/.test(dry.stdout || "")) {
  fail("dry-run plan must list the four secret names");
}
if (!/preview_copy=0/.test(dry.stdout || "")) {
  fail("dry-run plan must declare preview_copy=0");
}
if (!/EBAY_CLIENT_ID_PRESENT=NO/.test(dry.stdout || "")) {
  fail("dry-run must report missing EBAY_CLIENT_ID as NO");
}
assertNoMutation(dry.stdout, dry.stderr, "production dry-run");
assertNoSecretValues(`${dry.stdout}\n${dry.stderr}`, "production dry-run");

const defaultRun = spawnSecrets(["production"]);
if (defaultRun.status !== 0) fail("default production invoke must stay dry-run PASS");
if (!/mutation=0/.test(`${defaultRun.stdout || ""}\n${defaultRun.stderr || ""}`)) {
  fail("default production invoke must declare mutation=0");
}
assertNoMutation(defaultRun.stdout, defaultRun.stderr, "default production");
assertNoSecretValues(`${defaultRun.stdout}\n${defaultRun.stderr}`, "default production");

for (const value of ["preview", "staging", "phase0"]) {
  const spawned = spawnSecrets([value, "--dry-run"]);
  if (spawned.status === 0) fail(`CLI must fail-closed for target=${value}`);
  assertNoMutation(spawned.stdout, spawned.stderr, `invalid ${value}`);
  assertNoSecretValues(`${spawned.stdout}\n${spawned.stderr}`, `invalid ${value}`);
}

const dryYahoo = spawnSecrets([
  "production",
  "--dry-run",
  "--worker=yahoo-jp-adapter",
  "--worker-set=p0-ebay",
]);
if (dryYahoo.status === 0) fail("dry-run yahoo-jp-adapter must fail-closed");
assertNoMutation(dryYahoo.stdout, dryYahoo.stderr, "dry-run yahoo");

const applyEmpty = spawnSecrets(["production", "--apply"]);
if (applyEmpty.status === 0) fail("--apply without env values must FAIL");
if (!/mutation=0/.test(`${applyEmpty.stdout}\n${applyEmpty.stderr}`)) {
  fail("blocked apply must declare mutation=0");
}
assertNoMutation(applyEmpty.stdout, applyEmpty.stderr, "apply empty");
assertNoSecretValues(`${applyEmpty.stdout}\n${applyEmpty.stderr}`, "apply empty");
if (/EBAY_CLIENT_SECRET=|ADAPTER_INGEST_TOKEN=/.test(`${applyEmpty.stdout}\n${applyEmpty.stderr}`)) {
  fail("--apply failure must not print secret assignments");
}

const applyNoAllow = spawnSecrets(
  [
    "production",
    "--apply",
    "--worker=ebay-adapter",
    "--worker-set=p0-ebay",
    `--confirm=${deploy.APPLY_CONFIRM}`,
  ],
  {
    EBAY_CLIENT_ID: "dummy-id",
    EBAY_CLIENT_SECRET: "dummy-secret",
    NEST_ADAPTER_INGEST_URL: "https://example.invalid/ingest",
    ADAPTER_INGEST_TOKEN: "dummy-token",
  },
);
if (applyNoAllow.status === 0) fail("apply without allow-env must fail-closed");
assertNoMutation(applyNoAllow.stdout, applyNoAllow.stderr, "apply no-allow");
assertNoSecretValues(`${applyNoAllow.stdout}\n${applyNoAllow.stderr}`, "apply no-allow");
if (/dummy-id|dummy-secret|dummy-token|example\.invalid/.test(`${applyNoAllow.stdout}\n${applyNoAllow.stderr}`)) {
  fail("blocked apply leaked dummy secret values");
}

const redacted = deploy.redact("token=super-secret-value", ["super-secret-value"]);
if (redacted.includes("super-secret-value")) fail("redact() must strip values");
if (!redacted.includes("[REDACTED]")) fail("redact() must replace values");

if (fails.length) {
  console.error("[verify:p0-ebay-secret-provisioning] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:p0-ebay-secret-provisioning] PASS (production ebay-adapter four secret names · no value print · no preview copy · dry-run mutation=0)",
);
