/**
 * verify:ops-inbox — UI §5.9.4 · Admin §9.8.8d pointer
 * 쪽지함 · 하드삭제0 · prefs OFF→Push0 · toast MATCH/WITHDRAW_BLOCK
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
  "packages/ui/copy/ko/inbox.ts",
  "packages/ui/canon/surfaces/ops-inbox.wire.json",
  "packages/ui/components/inbox/OpsInbox.tsx",
  "packages/ui/components/inbox/index.ts",
  "apps/web/app/me/inbox/page.tsx",
  "services/api-nest/src/inbox/ops-inbox.service.ts",
  "services/api-nest/src/inbox/inbox.user.controller.ts",
  "services/api-nest/src/inbox/ops-inbox.admin.controller.ts",
  "schemas/ops-inbox-message.v1.json",
];
for (const f of files) mustExist(f);

const copy = read("packages/ui/copy/ko/inbox.ts");
for (const key of [
  "title:",
  "filterOps:",
  "hide:",
  "adminPointer:",
  "prefsPointer:",
  "matchBlockedHint:",
  "withdrawBlockedHint:",
]) {
  if (copy && !copy.includes(key)) fails.push(`inbox.ts missing ${key}`);
}
if (copy && !copy.includes("Admin §9.8.8d")) {
  fails.push("inbox.ts must keep Admin §9.8.8d pointer");
}

const wire = JSON.parse(
  read("packages/ui/canon/surfaces/ops-inbox.wire.json") || "{}",
);
if (wire.id !== "ops-inbox" || wire.route !== "/me/inbox") {
  fails.push("ops-inbox.wire id/route mismatch");
}
for (const id of ["title", "filters", "list", "row", "hide", "blockedToasts"]) {
  if (!(wire.blocks || []).some((b) => b.id === id)) {
    fails.push(`ops-inbox.wire missing block ${id}`);
  }
}
for (const f of ["hard_delete", "tendency_memo_to_user", "photo_pixel_match"]) {
  if (!(wire.forbidden || []).includes(f)) {
    fails.push(`ops-inbox.wire must forbid ${f}`);
  }
}

const ui = read("packages/ui/components/inbox/OpsInbox.tsx");
for (const needle of [
  'data-testid="ops-inbox"',
  'data-canon="ops-inbox"',
  'data-hard-delete="false"',
  'data-admin-pointer=',
  'data-toast-match-blocked="MATCH_BLOCKED"',
  'data-toast-withdraw-blocked="WITHDRAW_APPLY_BLOCKED"',
  "T.inbox",
]) {
  if (ui && !ui.includes(needle)) fails.push(`OpsInbox missing: ${needle}`);
}

const page =
  read("apps/web/app/me/inbox/page.tsx") +
  read("apps/web/app/me/inbox/InboxClient.tsx");
if (page && !page.includes("OpsInbox")) {
  fails.push("/me/inbox must render OpsInbox");
}
if (page && !page.includes("/api/v1/me/inbox")) {
  fails.push("/me/inbox must fetch user inbox API");
}

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
if (svc && !svc.includes("requireInternalHref(input.href)")) {
  fails.push("OpsInboxService must reject non-internal href before insert");
}
if (svc && !svc.includes("href: safeInternalHref(row.href)")) {
  fails.push("OpsInboxService must suppress unsafe legacy href on read");
}
if (svc && svc.includes("input.href ?? null")) {
  fails.push("OpsInboxService must not persist raw admin href");
}
if (ui && !ui.includes("safeInboxHref(item.href)")) {
  fails.push("OpsInbox UI must validate href before rendering a Link");
}
if (ui && ui.includes("href={item.href}")) {
  fails.push("OpsInbox UI must never render raw item.href");
}

const admin = read("services/api-nest/src/inbox/ops-inbox.admin.controller.ts");
if (admin && !admin.includes("ops-messages")) {
  fails.push("Admin controller must expose ops-messages route");
}
if (admin && !admin.includes("Admin §9.8.8d")) {
  fails.push("Admin controller must document §9.8.8d pointer");
}

const toast = read("packages/ui/copy/ko/toast.ts");
if (toast && !toast.includes("MATCH_BLOCKED:")) {
  fails.push("toast.ts missing MATCH_BLOCKED");
}
if (toast && !toast.includes("WITHDRAW_APPLY_BLOCKED:")) {
  fails.push("toast.ts missing WITHDRAW_APPLY_BLOCKED");
}
if (toast && !/고객센터/.test(toast)) {
  fails.push("blocked toasts must mention 고객센터");
}

const resolve = read("packages/ui/components/toast/resolveToast.ts");
if (resolve && !resolve.includes('"MATCH_BLOCKED"')) {
  fails.push("resolveToast must list MATCH_BLOCKED");
}
if (resolve && !resolve.includes('"WITHDRAW_APPLY_BLOCKED"')) {
  fails.push("resolveToast must list WITHDRAW_APPLY_BLOCKED");
}

const migration = read(
  "supabase/migrations/20260809222034_ops_inbox_hide_source_event.sql",
);
if (migration && !migration.includes("hidden_at")) {
  fails.push("migration must add hidden_at");
}

const idx = read("packages/ui/copy/ko/index.ts");
if (idx && !idx.includes('from "./inbox"') && !idx.includes("from './inbox'")) {
  fails.push("copy/ko/index.ts must import inbox");
}

const manifest = read("packages/ui/canon/manifest.json");
if (manifest && !manifest.includes('"id": "ops-inbox"')) {
  fails.push("canon manifest missing ops-inbox");
}

const rootPkg = read("package.json");
if (rootPkg && !rootPkg.includes('"verify:ops-inbox"')) {
  fails.push("root package.json must define verify:ops-inbox");
}

if (fails.length) {
  console.error("[verify:ops-inbox] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:ops-inbox] PASS (inbox surface · soft hide · prefs Push skip · block toasts)",
);
