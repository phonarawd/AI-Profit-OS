/**
 * verify:preflight-may-stop — UI §51.24.2 / Engine §48.13.1 P0
 * mayStop copy 필수 · Nest preflight token · 412 PREFLIGHT_REQUIRED · skip 0
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
  "packages/ui/copy/ko/loop.ts",
  "packages/ui/canon/surfaces/preflight-confirm.wire.json",
  "packages/ui/components/loop/PreCTA.tsx",
  "packages/ui/components/opportunity/OpportunityConfirm.tsx",
  "services/api-nest/src/loop/preflight.service.ts",
  "services/api-nest/src/opportunities/participate.service.ts",
  "services/api-nest/src/opportunities/opportunities.user.controller.ts",
  "schemas/participate-request.v1.json",
  "schemas/toast-codes.v1.json",
];
for (const f of files) mustExist(f);

const copy = read("packages/ui/copy/ko/loop.ts");
if (copy && !copy.includes('mayStop: "시세가 움직이면 안전하게 멈출 수 있어요"')) {
  fails.push("loop.ts mayStop must match §51.24.2 locked phrase");
}
for (const bad of ["무조건 성공", "무조건 수익", "보장 수익"]) {
  if (copy.includes(bad) && !copy.includes("forbiddenPhrases")) {
    fails.push(`loop.ts must not use ${bad} as user copy`);
  }
}
if (copy.includes('mayStop:') && /무조건/.test(copy.replace(/forbiddenPhrases:[\s\S]*?\]/, ""))) {
  // strip forbidden list then re-check positive copy
  const positive = copy
    .replace(/forbiddenPhrases:\s*\[[\s\S]*?\],?/, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  if (/무조건\s*(성공|수익)/.test(positive)) {
    fails.push("PreCTA positive copy must not claim 무조건 성공/수익");
  }
}

const precta = read("packages/ui/components/loop/PreCTA.tsx");
for (const needle of [
  'data-testid="precta"',
  'data-canon="preflight-confirm"',
  'data-may-stop="true"',
  "T.loop.mayStop",
  'data-skip-forbidden="true"',
]) {
  if (precta && !precta.includes(needle)) {
    fails.push(`PreCTA missing: ${needle}`);
  }
}

const confirm = read("packages/ui/components/opportunity/OpportunityConfirm.tsx");
if (confirm && !confirm.includes("PreCTA")) {
  fails.push("OpportunityConfirm must mount PreCTA");
}
if (confirm && !confirm.includes('data-requires-preflight="true"')) {
  fails.push("OpportunityConfirm CTA must require preflight");
}

const wire = JSON.parse(
  read("packages/ui/canon/surfaces/preflight-confirm.wire.json") || "{}",
);
if (wire.id !== "preflight-confirm") {
  fails.push("preflight-confirm.wire id mismatch");
}
if (!(wire.blocks || []).some((b) => b.id === "mayStop" && b.required)) {
  fails.push("preflight-confirm.wire mayStop block required");
}
for (const f of [
  "preflight_skip_deeplink",
  "무조건_성공",
  "presentation_timer_equals_payout",
]) {
  if (!(wire.forbidden || []).includes(f)) {
    fails.push(`preflight-confirm.wire must forbid ${f}`);
  }
}

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
const toastCopy = read("packages/ui/copy/ko/toast.ts");
if (toastCopy && !toastCopy.includes("PREFLIGHT_REQUIRED:")) {
  fails.push("T.toast.PREFLIGHT_REQUIRED missing");
}
// L24 — toast body must be Korean, not raw code
if (
  toastCopy &&
  /PREFLIGHT_REQUIRED:\s*["']PREFLIGHT_REQUIRED["']/.test(toastCopy)
) {
  fails.push("toast must not expose raw English code as body");
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
