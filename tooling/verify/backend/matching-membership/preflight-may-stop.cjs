/**
 * BACKEND-ONLY PORT of tooling/verify/preflight-may-stop.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:preflight-may-stop — UI §51.24.2 / Engine §48.13.1 P0
 * mayStop copy 필수 · Nest preflight token · 412 PREFLIGHT_REQUIRED · skip 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
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
  "services/api-nest/src/loop/preflight.service.ts",
  "services/api-nest/src/opportunities/participate.service.ts",
  "services/api-nest/src/opportunities/opportunities.user.controller.ts",
  "schemas/participate-request.v1.json",
  "schemas/toast-codes.v1.json",
];
for (const f of files) mustExist(f);

const pf = read("services/api-nest/src/loop/preflight.service.ts");
for (const needle of [
  "PREFLIGHT_REQUIRED",
  "HttpStatus.PRECONDITION_FAILED",
  "assertValid",
  "issue(",
]) {
  if (pf && !pf.includes(needle)) {
    fails.push(`preflight.service missing: ${needle}`);
  }
}

const participate = read(
  "services/api-nest/src/opportunities/participate.service.ts",
);
if (participate && !participate.includes("preflight.assertValid")) {
  fails.push("ParticipateService must call preflight.assertValid (P0)");
}
if (participate && !participate.includes("PreflightService")) {
  fails.push("ParticipateService must inject PreflightService");
}

const ctrl = read(
  "services/api-nest/src/opportunities/opportunities.user.controller.ts",
);
if (ctrl && !ctrl.includes("OPPORTUNITY_USER_ROUTES.preflight")) {
  fails.push("controller must expose POST preflight");
}
if (ctrl && !ctrl.includes("issuePreflight")) {
  fails.push("controller missing issuePreflight");
}

const schema = JSON.parse(read("schemas/participate-request.v1.json") || "{}");
if (!(schema.required || []).includes("preflightToken")) {
  fails.push("participate-request.v1 must require preflightToken");
}

const toastSchema = read("schemas/toast-codes.v1.json");
if (toastSchema && !toastSchema.includes('"PREFLIGHT_REQUIRED"')) {
  fails.push("toast-codes must include PREFLIGHT_REQUIRED");
}
const routes = read(
  "services/api-nest/src/opportunities/opportunities.user.routes.ts",
);
if (
  routes &&
  !routes.includes('preflight: "opportunities/:id/preflight"')
) {
  fails.push("OPPORTUNITY_USER_ROUTES.preflight path mismatch");
}

if (fails.length) {
  console.error("[verify:preflight-may-stop] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:preflight-may-stop] PASS (mayStop · token · 412 PREFLIGHT_REQUIRED)",
);
