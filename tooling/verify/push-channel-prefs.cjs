/**
 * verify:push-channel-prefs — REL-021 / E-PWA-003
 * pref=false → 발송 0. 세 채널이 서로 섞이지 않음.
 * 필터 없이 전채널 강제 발송이면 FAIL.
 */
const { spawnSync } = require("child_process");
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

const required = [
  "workers/push-dispatcher/src/lib/channel-filter.cjs",
  "services/api-nest/src/inbox/notification-prefs.defaults.ts",
  "services/api-nest/src/inbox/notification-prefs.service.ts",
  "services/api-nest/src/push/push-emit.service.ts",
  "schemas/notification-prefs.v1.json",
  "schemas/push-channel-filter.v1.json",
  "governance/pwa/push-channel-filter.v1.json",
  "packages/ui/components/settings/SettingsPanel.tsx",
  "tooling/pwa/pwa-push-channel-filter-harness.cjs",
  "tooling/pwa/pwa-push-channel-filter.spec.cjs",
];
for (const rel of required) read(rel);

const contract = ["notice", "campaign", "opportunity"];

const schema = read("schemas/push-channel-filter.v1.json");
if (schema) {
  try {
    const j = JSON.parse(schema);
    const auto = j.default && j.default.autoChannels;
    if (JSON.stringify(auto) !== JSON.stringify(contract)) {
      fails.push("schema default.autoChannels must be notice/campaign/opportunity");
    }
    if (j.default && j.default.enqueueWhenPrefFalse !== 0) {
      fails.push("schema enqueueWhenPrefFalse must be 0");
    }
    if (j.default && j.default.mixChannels !== false) {
      fails.push("schema mixChannels must be false");
    }
  } catch {
    fails.push("push-channel-filter.v1.json invalid JSON");
  }
}

const ddl = read("supabase/migrations/20260808205844_identity_nest_auth.sql");
for (const col of [
  "notice boolean NOT NULL DEFAULT true",
  "campaign boolean NOT NULL DEFAULT true",
  "opportunity boolean NOT NULL DEFAULT true",
]) {
  if (ddl && !ddl.includes(col)) fails.push(`notification_prefs DDL missing ${col}`);
}

const defaultsSrc = read(
  "services/api-nest/src/inbox/notification-prefs.defaults.ts",
);
if (defaultsSrc && !defaultsSrc.includes("AUTO_PUSH_CHANNELS")) {
  fails.push("defaults must declare AUTO_PUSH_CHANNELS");
}
for (const key of ['"notice"', '"campaign"', '"opportunity"']) {
  if (defaultsSrc && !defaultsSrc.includes(key)) {
    fails.push(`AUTO_PUSH_CHANNELS missing ${key}`);
  }
}

const filterSrc = read("workers/push-dispatcher/src/lib/channel-filter.cjs");
if (filterSrc && !filterSrc.includes('["notice", "campaign", "opportunity"]')) {
  fails.push("dispatcher filter must lock notice/campaign/opportunity");
}
if (filterSrc && !filterSrc.includes("enqueue: false")) {
  fails.push("dispatcher filter must fail-closed");
}

const emit = read("services/api-nest/src/push/push-emit.service.ts");
if (emit && !emit.includes("allowPush")) {
  fails.push("emit must call allowPush");
}
if (emit && !emit.includes("channelAllowed")) {
  fails.push("emit must pass channelAllowed to planEmit");
}
if (emit && !/channel:\s*NotifyPushChannel/.test(emit)) {
  fails.push("emitToUser must require channel (no all-channel force send)");
}
if (emit && !emit.includes('status: "filtered"')) {
  fails.push("emit must return filtered when pref=false / channel missing");
}
if (emit && /emitToUser[\s\S]{0,200}payload:/.test(emit) && !emit.includes("channel:")) {
  fails.push("EXIT_GATE: emit accepts payload without channel");
}

const dispatch = read("workers/push-dispatcher/src/lib/dispatch.cjs");
if (dispatch && !dispatch.includes("applyPlanChannelFilter")) {
  fails.push("planEmit must apply channel filter");
}
if (dispatch && !dispatch.includes("channel-filter.cjs")) {
  fails.push("dispatcher must load channel-filter SSOT");
}

const settings = read("packages/ui/components/settings/SettingsPanel.tsx");
if (settings && !settings.includes("/api/v1/me/notification-prefs")) {
  fails.push("settings must stay on existing notification-prefs API");
}
for (const ch of contract) {
  if (settings && !settings.includes(`data-notify-channel={key}`) && !settings.includes(`"${ch}"`)) {
    fails.push(`settings missing channel ${ch}`);
  }
}
if (settings && !settings.includes('key: "notice"')) {
  fails.push("settings must expose notice");
}
if (settings && !settings.includes('key: "campaign"')) {
  fails.push("settings must expose campaign");
}
if (settings && !settings.includes('key: "opportunity"')) {
  fails.push("settings must expose opportunity");
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (pkg && !pkg.includes('"verify:push-channel-prefs"')) {
  fails.push("package.json missing verify:push-channel-prefs");
}
if (catalog && !catalog.includes("push-channel-prefs")) {
  fails.push("CATALOG.md must list push-channel-prefs");
}
if (domain && !domain.includes("push-channel-prefs.cjs")) {
  fails.push("domain-by-path must trigger push-channel-prefs");
}

const { runChannelFilterCases } = require(
  path.join(root, "tooling/pwa/pwa-push-channel-filter-harness.cjs"),
);
const cases = runChannelFilterCases();
if (!cases.isolation.noticeOffBlocksNotice || !cases.isolation.noticeOffAllowsCampaign) {
  fails.push("VERIFY: notice must not mix with campaign");
}
if (!cases.isolation.campaignOffBlocksCampaign || !cases.isolation.campaignOffAllowsNotice) {
  fails.push("VERIFY: campaign must not mix with notice");
}
if (
  !cases.isolation.opportunityOffBlocksOpportunity ||
  !cases.isolation.opportunityOffAllowsNotice
) {
  fails.push("VERIFY: opportunity must not mix with notice");
}
if (cases.planNoticeOff.enqueue !== false || cases.sendCalls !== 0) {
  fails.push("EXIT_GATE: pref=false still enqueued or sent");
}
if (cases.planCampaignOn.enqueue !== true) {
  fails.push("notice OFF must still enqueue campaign");
}
if (cases.planMissingChannel.enqueue !== false) {
  fails.push("EXIT_GATE: missing channel with prefs must not force-send");
}

const spec = spawnSync(
  process.execPath,
  [path.join(root, "tooling/pwa/pwa-push-channel-filter.spec.cjs")],
  { cwd: root, encoding: "utf8" },
);
if (spec.status !== 0 || !String(spec.stdout || "").includes("PASS")) {
  fails.push("committed spec failed");
  if (spec.stderr) fails.push(String(spec.stderr).trim());
}

if (fails.length) {
  console.error("[verify:push-channel-prefs] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:push-channel-prefs] PASS (notice/campaign/opportunity isolated · pref=false enqueue 0)",
);
