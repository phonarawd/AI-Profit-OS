/**
 * verify:observability — REL-016
 * 구조화 로그 + CF sink + money/KYC 마스킹 + 최소 alert. Vercel 0. 프로덕션 토큰 0.
 */
const fs = require("fs");
const path = require("path");

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

for (const rel of [
  "governance/observability/error-sink.v1.json",
  "governance/observability/alert-rules.v1.json",
  "governance/observability/mask-keys.v1.json",
  "packages/observability/observability.core.cjs",
  "services/api-nest/src/observability/obs.exception-filter.ts",
  "apps/web/components/observability/ObsRuntime.tsx",
]) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

const sink = JSON.parse(read("governance/observability/error-sink.v1.json") || "{}");
if (sink.vercel !== 0) fails.push("error sink must set vercel=0");
if (!String(sink.provider || "").includes("cloudflare")) {
  fails.push("error sink must be Cloudflare/Workers");
}
if (sink.productionTokenInRepo !== 0) {
  fails.push("production tokens must not live in the repo");
}
if (sink.stagingSampleEvent !== "REL-600") {
  fails.push("staging sample is REL-600, not this REL");
}

const rules = JSON.parse(read("governance/observability/alert-rules.v1.json") || "{}");
const ids = (rules.rules || []).map((r) => r.id);
for (const need of ["http_5xx", "ledger_write_fail", "auth_spike"]) {
  if (!ids.includes(need)) fails.push(`alert rule missing ${need}`);
}

const hay = [
  read("packages/observability/observability.core.cjs"),
  read("services/api-nest/src/observability/obs.exception-filter.ts"),
  read("apps/web/components/observability/ObsRuntime.tsx"),
  read("governance/observability/error-sink.v1.json"),
].join("\n");
if (/vercel/i.test(hay) && !/vercel": 0/.test(hay) && !/Vercel 금지/.test(hay) && !/"vercel": 0/.test(hay)) {
  fails.push("Vercel sink leaked");
}
if (/SENTRY_DSN|vercel\.com\/ingest/i.test(hay)) {
  fails.push("forbidden production error-token/sink");
}

const appMod = read("services/api-nest/src/app.module.ts");
if (!appMod.includes("ObsExceptionFilter") || !appMod.includes("APP_FILTER")) {
  fails.push("AppModule must register ObsExceptionFilter");
}

const layout = read("apps/web/app/layout.tsx");
if (!layout.includes("ObsRuntime")) {
  fails.push("web layout must mount ObsRuntime");
}

const obs = require(path.join(root, "packages/observability/observability.core.cjs"));
obs.resetAuthSpikeForTest();
const sample = obs.formatObsLog({
  service: "api-nest",
  status: 500,
  path: "/api/v1/admin/ledger/journals",
  method: "POST",
  fields: { amountUsdt: "12.5", email: "a@b.c", kyc: "secret" },
});
if (!sample.json.includes("[REDACTED]")) {
  fails.push("structured log sample must mask money/KYC");
}
if (sample.json.includes("12.5") || sample.json.includes("a@b.c")) {
  fails.push("raw money/PII leaked into log sample");
}
const embedded = obs.formatObsLog({
  service: "apps-web",
  status: 500,
  message:
    "email=a@b.c amountUsdt=12.5 token=eyJhbGciOiJIUzI1NiJ9.e30.signature 12.5 USDT +82 10-1234-5678",
});
for (const raw of [
  "a@b.c",
  "12.5",
  "eyJhbGciOiJIUzI1NiJ9.e30.signature",
  "+82 10-1234-5678",
]) {
  if (embedded.json.includes(raw)) {
    fails.push("embedded sensitive message leaked: " + raw);
  }
}
if (!embedded.json.includes("[REDACTED]")) {
  fails.push("embedded sensitive message must be redacted");
}

const clientRuntime = read("apps/web/components/observability/ObsRuntime.tsx");
if (/message:\s*event\.message/.test(clientRuntime)) {
  fails.push("browser observability must not serialize raw ErrorEvent.message");
}
if (/String\(event\.reason/.test(clientRuntime)) {
  fails.push("browser observability must not serialize raw rejection reason");
}
for (const source of ['source: "window_error"', 'source: "unhandled_rejection"']) {
  if (!clientRuntime.includes(source)) {
    fails.push("browser observability missing safe source marker " + source);
  }
}
if (!clientRuntime.includes("safeClientPath")) {
  fails.push("browser observability must strip high-entropy route ids");
}

const five = obs.classifyAlerts({
  status: 500,
  method: "POST",
  path: "/api/v1/admin/users/u/balance-adjust",
});
if (!five.includes("http_5xx")) fails.push("5xx must alert");

obs.resetAuthSpikeForTest();
const ledgerFail = obs.classifyAlerts({
  status: 500,
  method: "POST",
  path: "/api/v1/admin/ledger/journals",
});
if (!ledgerFail.includes("ledger_write_fail")) {
  fails.push("ledger write 5xx must alert ledger_write_fail");
}

obs.resetAuthSpikeForTest();
let spiked = false;
for (let i = 0; i < 20; i += 1) {
  const alerts = obs.classifyAlerts({
    status: 401,
    path: "/api/v1/auth/login",
    nowMs: 1_000_000,
  });
  if (alerts.includes("auth_spike")) spiked = true;
}
if (!spiked) fails.push("auth spike threshold must fire");

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:observability"')) {
  fails.push("package.json missing verify:observability");
}
if (!catalog.includes("observability")) {
  fails.push("CATALOG.md must list observability");
}
if (!domain.includes("observability.cjs")) {
  fails.push("domain-by-path must trigger observability");
}

if (fails.length) {
  console.error("[verify:observability] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:observability] PASS (CF sink · masked sample · 5xx/ledger/auth alerts · token 0 · Vercel 0)",
);
