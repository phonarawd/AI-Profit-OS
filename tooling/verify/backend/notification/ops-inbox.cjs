/**
 * BACKEND-ONLY PORT of tooling/verify/ops-inbox.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:ops-inbox — UI §5.9.4 · Admin §9.8.8d pointer
 * 쪽지함 · 하드삭제0 · prefs OFF→Push0 · toast MATCH/WITHDRAW_BLOCK
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
  "services/api-nest/src/inbox/ops-inbox.service.ts",
  "services/api-nest/src/inbox/inbox.user.controller.ts",
  "services/api-nest/src/inbox/ops-inbox.admin.controller.ts",
  "schemas/ops-inbox-message.v1.json",
];
for (const f of files) mustExist(f);

const svc = read("services/api-nest/src/inbox/ops-inbox.service.ts");
if (svc && !svc.includes("pushEligible")) {
  fails.push("OpsInboxService must expose pushEligible for prefs filter");
}
if (svc && !svc.includes("allowPush")) {
  fails.push("sendToUser must consult prefs.allowPush");
}
if (svc && !svc.includes("hidden_at") && !svc.includes("hardDelete: false")) {
  fails.push("hide must be soft (hardDelete false)");
}
if (svc && /DELETE FROM public\.ops_inbox/i.test(svc)) {
  fails.push("hard DELETE of ops_inbox_messages FORBIDDEN");
}

const admin = read("services/api-nest/src/inbox/ops-inbox.admin.controller.ts");
if (admin && !admin.includes("ops-messages")) {
  fails.push("Admin controller must expose ops-messages route");
}
if (admin && !admin.includes("Admin §9.8.8d")) {
  fails.push("Admin controller must document §9.8.8d pointer");
}

const migration = read(
  "supabase/migrations/20260809222034_ops_inbox_hide_source_event.sql",
);
if (migration && !migration.includes("hidden_at")) {
  fails.push("migration must add hidden_at");
}

if (fails.length) {
  console.error("[verify:ops-inbox] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:ops-inbox] PASS (schema · soft hide · prefs Push skip · admin ops-messages · hidden_at migration)",
);
