/**
 * verify:rel-406-kill-switch
 * 9종 상수 lock + path enforce fixture + audit + 서버 가드.
 * 10번째 ID 창작 0. UI 토글만 있고 서버 없으면 EXIT_GATE FAIL.
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
  read("tooling/verify/fixtures/rel-406-kill-switch.v1.json") || "{}",
);
const schema = JSON.parse(read("schemas/admin-kill-switch.v1.json") || "{}");
const core = require(path.join(root, "services/api-nest/admin-kill-switch.core.cjs"));
const auditCore = require(path.join(root, "services/api-nest/admin-audit.core.cjs"));

const ids = Array.isArray(core.KILL_SWITCH_IDS) ? [...core.KILL_SWITCH_IDS] : [];
if (ids.length !== 9) {
  fails.push("must publish exactly 9 kill-switch ids, got " + ids.length);
}
if (ids.join(",") !== (fixture.ids || []).join(",")) {
  fails.push("kill-switch ids drifted: " + ids.join(","));
}
if (!ids.includes("GLOBAL_OPPORTUNITY_PAUSE")) {
  fails.push("reserved GLOBAL_OPPORTUNITY_PAUSE missing");
}

const schemaEnum =
  ((((schema.properties || {}).ids || {}).items || {}).enum) || [];
if (schemaEnum.length !== 9) {
  fails.push("schema enum must be 9, got " + schemaEnum.length);
}
for (const id of ids) {
  if (!schemaEnum.includes(id)) fails.push("schema missing " + id);
}
for (const invented of fixture.inventedForbidden || []) {
  if (ids.includes(invented) || schemaEnum.includes(invented)) {
    fails.push("invented switch must not exist: " + invented);
  }
}

for (const [alias, canonical] of Object.entries(fixture.aliases || {})) {
  const n = core.normalizeId(alias);
  if (!n.ok || n.id !== canonical) {
    fails.push("alias " + alias + " must resolve to " + canonical);
  }
}

const unknown = core.normalizeId("FAKE_KILL");
if (unknown.ok) fails.push("unknown id must be rejected");

const empty = core.defaultEngagedById();
for (const pathName of Object.keys(fixture.pathBlocks || {})) {
  if (core.isBlocked(pathName, empty)) {
    fails.push("default state must not block " + pathName);
  }
}

for (const id of ids) {
  const only = core.defaultEngagedById();
  only[id] = true;
  for (const [pathName, blockers] of Object.entries(fixture.pathBlocks || {})) {
    const blocked = core.isBlocked(pathName, only);
    const should = blockers.includes(id);
    if (blocked !== should) {
      fails.push(
        id +
          " on " +
          pathName +
          " expected blocked=" +
          should +
          " got " +
          blocked,
      );
    }
  }
}

const allOn = core.defaultEngagedById();
allOn.GLOBAL_ALL_PAUSE = true;
for (const pathName of Object.keys(fixture.pathBlocks || {})) {
  if (!core.isBlocked(pathName, allOn)) {
    fails.push("GLOBAL_ALL_PAUSE must block " + pathName);
  }
}

const shortReason = core.requireReason("short");
if (shortReason.ok) fails.push("reason <10 must fail");

mustInclude(
  "services/api-nest/src/risk/risk.service.ts",
  'assertPath("withdraw")',
  "risk withdraw",
);
mustInclude(
  "services/api-nest/src/risk/risk.service.ts",
  'assertPath("matching")',
  "risk matching",
);
mustInclude(
  "services/api-nest/src/risk/risk.service.ts",
  'assertPath("merge")',
  "risk merge",
);
mustInclude(
  "services/api-nest/src/wallet/krw-deposit.service.ts",
  'assertPath("deposit")',
  "krw deposit",
);
mustInclude(
  "services/api-nest/src/wallet/deposit-address.service.ts",
  'assertPath("deposit")',
  "deposit address",
);
mustInclude(
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
  'isBlocked("opportunity")',
  "opportunity feed",
);
mustInclude(
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
  'assertPath("opportunity")',
  "opportunity get",
);
mustInclude(
  "services/api-nest/src/push/push-emit.service.ts",
  'isBlocked("push")',
  "push emit",
);
mustInclude(
  "services/api-nest/src/referral/referral.program.service.ts",
  'isBlocked("referral_accrual")',
  "referral accrual",
);
mustInclude(
  "services/api-nest/src/growth/growth.public.controller.ts",
  'isBlocked("growth")',
  "growth public",
);
mustInclude(
  "services/api-nest/src/kill-switch/kill-switch.service.ts",
  "writeAuditEvent",
  "kill service audit",
);
mustInclude(
  "services/api-nest/src/kill-switch/kill-switch.admin.controller.ts",
  "@UseGuards(AdminGuard)",
  "kill controller",
);
mustInclude(
  "services/api-nest/src/common/admin-capabilities.ts",
  "KillSwitchAdminController",
  "capability table",
);
mustInclude(
  "services/api-nest/src/common/admin-capabilities.ts",
  'write("circuit")',
  "circuit write",
);
mustInclude(
  "services/api-nest/src/app.module.ts",
  "KillSwitchModule",
  "app.module",
);

const mig = read("supabase/migrations/20260823170000_admin_kill_switches.sql");
for (const needle of [
  "admin_kill_switches",
  "GLOBAL_OPPORTUNITY_PAUSE",
  "ENABLE ROW LEVEL SECURITY",
  "APPLY_THIS_SLICE = NO",
  "BEFORE DELETE",
]) {
  if (!mig.includes(needle)) fails.push("migration missing " + needle);
}
if (mig.includes("CREATE TABLE public.money_circuit")) {
  fails.push("must not invent a second money_circuit table");
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
    role: "risk",
    action: fixture.denyAction,
    targetType: "kill_switch",
    targetId: "GLOBAL_OPPORTUNITY_PAUSE",
    mode: "LIVE",
    result: "applied",
    reason: "fixture reason long enough",
    payload: { engaged: true },
  });
  if (!written.ok || written.event.result !== "applied") {
    fails.push("audit write fixture must persist result=applied");
  }
  if (events.length !== 1) {
    fails.push("audit sink must receive kill-switch apply");
  }
  auditCore.resetAuditSink();
  core.resetMemory();

  const page = read("apps/admin/app/admin/system-control/page.tsx");
  const serverReady =
    fs.existsSync(
      path.join(
        root,
        "services/api-nest/src/kill-switch/kill-switch.service.ts",
      ),
    ) &&
    fs.existsSync(
      path.join(root, "services/api-nest/admin-kill-switch.core.cjs"),
    ) &&
    fs.existsSync(
      path.join(
        root,
        "supabase/migrations/20260823170000_admin_kill_switches.sql",
      ),
    );
  if (!serverReady) fails.push("EXIT_GATE: server kill-switch missing");
  if (page.includes("window.confirm") && !serverReady) {
    fails.push("EXIT_GATE: UI only — server enforce missing");
  }
  for (const id of [
    "GLOBAL_OPPORTUNITY_PAUSE",
    "GLOBAL_MATCHING_PAUSE",
    "GLOBAL_WITHDRAW_PAUSE",
    "GLOBAL_DEPOSIT_PAUSE",
    "GLOBAL_ALL_PAUSE",
  ]) {
    if (!page.includes(id)) {
      fails.push("system-control must publish " + id);
    }
  }
  if (!page.includes("/api/v1/admin/system-control/switches")) {
    fails.push("system-control must name the switches API");
  }

  const webAdmin = path.join(root, "apps/web/app/admin");
  if (fs.existsSync(webAdmin)) {
    fails.push("apps/web must not grow /admin");
  }

  const pkg = read("package.json");
  const catalog = read("tooling/verify/CATALOG.md");
  const gate = read(".github/workflows/gate.yml");
  const spec = read("governance/admin/kill-switch-9.md");
  const evidence = read("governance/release-master/REL-406-KILL-SWITCH.md");
  const control = read("governance/admin/control-plane-superset.md");
  if (!pkg.includes("verify:rel-406-kill-switch")) {
    fails.push("package.json missing verify:rel-406-kill-switch");
  }
  if (!catalog.includes("rel-406-kill-switch")) {
    fails.push("CATALOG missing rel-406-kill-switch");
  }
  if (!gate.includes("verify:rel-406-kill-switch")) {
    fails.push("gate.yml must run verify:rel-406-kill-switch");
  }
  for (const needle of [
    "LOCKED_SWITCHES = 9",
    "INVENTED_SWITCHES = 0",
    "SERVER_ENFORCE = 1",
    "EXIT_GATE",
  ]) {
    if (!spec.includes(needle)) fails.push("kill-switch spec missing " + needle);
  }
  if (!evidence.includes("STATUS = COMPLETED")) {
    fails.push("REL-406 evidence must be COMPLETED");
  }
  for (const id of ids) {
    if (!control.includes(id)) {
      fails.push("control-plane-superset must publish " + id);
    }
  }

  if (fails.length) {
    console.error("[verify:rel-406-kill-switch] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  console.log(
    "[verify:rel-406-kill-switch] PASS (9 ids · path enforce · audit · server guard)",
  );
})().catch((err) => {
  console.error("[verify:rel-406-kill-switch] FAIL");
  console.error(" - " + (err && err.message ? err.message : String(err)));
  process.exit(1);
});
