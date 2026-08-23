/**
 * verify:rel-407-price-override
 * 4레이어 lock + 혼용 0 + override reason/audit + USER_VISIBLE=EFFECTIVE.
 * 5번째 레이어 창작 0. 유저가 observed 를 꾸미면 EXIT_GATE FAIL.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function mustInclude(rel, needle, label) {
  const text = read(rel);
  if (text && !text.includes(needle)) {
    fails.push((label || rel) + " missing " + needle);
  }
}

const fixture = JSON.parse(
  read("tooling/verify/fixtures/rel-407-price-override.v1.json") || "{}",
);
const schema = JSON.parse(read("schemas/price-override-layers.v1.json") || "{}");
const core = require(path.join(root, "services/api-nest/price-override.core.cjs"));
const auditCore = require(path.join(root, "services/api-nest/admin-audit.core.cjs"));

const layers = Array.isArray(core.PRICE_LAYERS) ? [...core.PRICE_LAYERS] : [];
if (layers.length !== 4) {
  fails.push("must publish exactly 4 price layers, got " + layers.length);
}
if (layers.join(",") !== (fixture.layers || []).join(",")) {
  fails.push("price layers drifted: " + layers.join(","));
}
if (layers.join(",") !== "SOURCE_OBSERVED,OVERRIDE,EFFECTIVE,USER_VISIBLE") {
  fails.push("canonical layer order broken");
}

const schemaEnum = (((schema.properties || {}).layers || {}).items || {}).enum || [];
if (schemaEnum.length !== 4) {
  fails.push("schema layer enum must be 4, got " + schemaEnum.length);
}
for (const layer of layers) {
  if (!schemaEnum.includes(layer)) fails.push("schema missing " + layer);
}
for (const invented of fixture.inventedLayersForbidden || []) {
  if (layers.includes(invented) || schemaEnum.includes(invented)) {
    fails.push("invented layer must not exist: " + invented);
  }
  const bogus = core.normalizeLayer(invented);
  if (bogus.ok) fails.push("unknown layer must be rejected: " + invented);
}

const codes = Array.isArray(core.REASON_CODES) ? [...core.REASON_CODES] : [];
if (codes.join(",") !== (fixture.reasonCodes || []).join(",")) {
  fails.push("reason codes drifted: " + codes.join(","));
}

const shortReason = core.requireReason("short");
if (shortReason.ok) fails.push("reason < 10 must fail");
const okReason = core.requireReason("manual commercial override");
if (!okReason.ok) fails.push("valid reason must pass");

const badClear = core.requireReasonCode("OVERRIDE_CLEAR", true);
if (badClear.ok) fails.push("OVERRIDE_CLEAR must not apply when engaged");
const badOn = core.requireReasonCode("MANUAL_COMMERCIAL", false);
if (badOn.ok) fails.push("engaged=false must use OVERRIDE_CLEAR");
const okOn = core.requireReasonCode("MANUAL_COMMERCIAL", true);
if (!okOn.ok) fails.push("MANUAL_COMMERCIAL must apply when engaged");

const vectors = fixture.vectors || {};
const on = core.resolveLayers({
  sourceObserved: vectors.source,
  override: vectors.overrideOn,
  compute: vectors.compute,
});
if (!on.ok) fails.push("override-on resolve failed: " + on.error);
else {
  if (String(on.EFFECTIVE.buyPriceUsdt) !== "90") {
    fails.push("EFFECTIVE buy must use OVERRIDE 90, got " + on.EFFECTIVE.buyPriceUsdt);
  }
  if (String(on.SOURCE_OBSERVED.buyPriceUsdt) !== "100") {
    fails.push("SOURCE must stay 100 after override, got " + on.SOURCE_OBSERVED.buyPriceUsdt);
  }
  const mix = core.assertNoLayerMix(on.USER_VISIBLE);
  if (!mix.ok) fails.push("USER_VISIBLE mixed keys: " + (mix.leaked || []).join(","));
  for (const key of fixture.sourceOnlyKeys || []) {
    if (Object.prototype.hasOwnProperty.call(on.USER_VISIBLE, key)) {
      fails.push("USER_VISIBLE leaked SOURCE key " + key);
    }
  }
  for (const key of fixture.overrideOnlyKeys || []) {
    if (Object.prototype.hasOwnProperty.call(on.USER_VISIBLE, key)) {
      fails.push("USER_VISIBLE leaked OVERRIDE key " + key);
    }
  }
  const untouched = core.assertSourceUntouched(vectors.source, on.SOURCE_OBSERVED);
  if (!untouched.ok && untouched.error === "SOURCE_MUTATED") {
    fails.push("SOURCE mutated during resolve");
  }
}

const off = core.resolveLayers({
  sourceObserved: vectors.source,
  override: vectors.overrideOff,
  compute: vectors.compute,
});
if (!off.ok) fails.push("override-off resolve failed: " + off.error);
else if (String(off.EFFECTIVE.buyPriceUsdt) !== "100") {
  fails.push("EFFECTIVE buy must return to SOURCE 100, got " + off.EFFECTIVE.buyPriceUsdt);
}

const mixedUser = core.assertNoLayerMix({
  expectedProfitUsdt: "1",
  nativeAmount: "100",
  adminBuyUsdt: "90",
});
if (mixedUser.ok) fails.push("mixed USER_VISIBLE fixture must fail");

const leakProject = core.projectUserVisible({
  buyPriceUsdt: "90",
  expectedProfitUsdt: "1",
  compareReady: true,
  capitalBand: "small",
  pricingSource: "admin",
  adminBuyUsdt: "90",
  nativeAmount: "100",
  useAdminOverride: true,
});
if (!leakProject.ok) {
  // project strips then assert — if implementation returns ok, USER_VISIBLE must not leak
} else {
  for (const key of ["adminBuyUsdt", "nativeAmount", "useAdminOverride"]) {
    if (Object.prototype.hasOwnProperty.call(leakProject.userVisible, key)) {
      fails.push("projectUserVisible leaked " + key);
    }
  }
}

mustInclude(
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
  "projectUserVisible",
  "user service",
);
mustInclude(
  "services/api-nest/src/opportunities/opportunities.admin.service.ts",
  "requireWrite",
  "admin service",
);
mustInclude(
  "services/api-nest/src/opportunities/opportunities.admin.service.ts",
  "writeAppliedAudit",
  "admin service",
);
mustInclude(
  "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
  "reasonCode",
  "admin controller",
);
mustInclude(
  "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
  "getPriceLayers",
  "admin controller",
);
mustInclude(
  "services/api-nest/src/opportunities/opportunities.module.ts",
  "PriceOverrideModule",
  "opportunities module",
);

const svc = read("services/api-nest/src/price-override/price-override.service.ts");
if (/UPDATE\s+public\.listings/i.test(svc)) {
  fails.push("price-override service must not UPDATE listings");
}
if (/UPDATE\s+public\.ledger/i.test(svc) || /INSERT\s+INTO\s+public\.ledger/i.test(svc)) {
  fails.push("price-override must not write ledger");
}

const mig = read("supabase/migrations/20260823180000_opportunity_price_overrides.sql");
for (const needle of [
  "opportunity_price_overrides",
  "ENABLE ROW LEVEL SECURITY",
  "APPLY_THIS_SLICE = NO",
  "BEFORE DELETE",
  "SOURCE_STALE",
]) {
  if (!mig.includes(needle)) fails.push("migration missing " + needle);
}
if (/UPDATE\s+public\.listings/i.test(mig)) {
  fails.push("migration must not overwrite listings");
}

(async () => {
  const events = [];
  auditCore.resetAuditSink();
  auditCore.setAuditSink((event) => {
    events.push(event);
  });
  const written = await auditCore.writeAuditEvent({
    actorKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    actorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    role: "super",
    action: "OpportunitiesAdminController.patchPricing",
    targetType: "price_override",
    targetId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    mode: "LIVE",
    result: "applied",
    reason: "fixture reason long enough",
    payload: { engaged: true, reasonCode: "MANUAL_COMMERCIAL", layer: "OVERRIDE" },
  });
  if (!written.ok || written.event.result !== "applied") {
    fails.push("audit write fixture must persist result=applied: " + (written.error || ""));
  }
  if (events.length !== 1) fails.push("audit sink must receive price-override apply");
  auditCore.resetAuditSink();

  const moneyAudit = await auditCore.writeAuditEvent({
    actorKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    actorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    role: "super",
    action: "OpportunitiesAdminController.patchPricing",
    targetType: "price_override",
    targetId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    mode: "LIVE",
    result: "applied",
    reason: "fixture reason long enough",
    payload: { usdt: "90" },
  });
  if (moneyAudit.ok) fails.push("audit payload must reject money keys");

  const webAdmin = path.join(root, "apps/web/app/admin");
  if (fs.existsSync(webAdmin)) fails.push("apps/web must not grow /admin");

  const pkg = read("package.json");
  const catalog = read("tooling/verify/CATALOG.md");
  const gate = read(".github/workflows/gate.yml");
  const spec = read("governance/admin/price-override-layers.md");
  const evidence = read("governance/release-master/REL-407-PRICE-OVERRIDE.md");
  if (!pkg.includes("verify:rel-407-price-override")) {
    fails.push("package.json missing verify:rel-407-price-override");
  }
  if (!catalog.includes("rel-407-price-override")) {
    fails.push("CATALOG missing rel-407-price-override");
  }
  if (!gate.includes("verify:rel-407-price-override")) {
    fails.push("gate.yml must run verify:rel-407-price-override");
  }
  for (const needle of [
    "LOCKED_LAYERS = 4",
    "INVENTED_LAYERS = 0",
    "SERVER_ENFORCE = 1",
    "EXIT_GATE",
  ]) {
    if (!spec.includes(needle)) fails.push("price-override spec missing " + needle);
  }
  if (!evidence.includes("STATUS = COMPLETED")) {
    fails.push("REL-407 evidence must be COMPLETED");
  }
  for (const layer of layers) {
    if (!spec.includes(layer)) fails.push("spec must publish " + layer);
  }

  if (fails.length) {
    console.error("[verify:rel-407-price-override] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  console.log(
    "[verify:rel-407-price-override] PASS (4 layers · mix 0 · reason/audit · user reads EFFECTIVE)",
  );
})().catch((err) => {
  console.error("[verify:rel-407-price-override] FAIL");
  console.error(" - " + (err && err.message ? err.message : String(err)));
  process.exit(1);
});
