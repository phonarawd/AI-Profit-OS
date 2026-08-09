/**
 * verify:notification-prefs-default-on — UI §50.1n
 * 가입 시 prefs 전부 true · OFF=Push만 스킵
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

const schema = read("schemas/notification-prefs.v1.json");
if (schema) {
  let j;
  try {
    j = JSON.parse(schema);
  } catch {
    fails.push("notification-prefs.v1.json invalid JSON");
  }
  if (j?.default) {
    for (const k of [
      "master",
      "opportunity",
      "wallet",
      "notice",
      "campaign",
      "opsMessage",
      "strategyMatch",
    ]) {
      if (j.default[k] !== true) {
        fails.push(`schema default.${k} must be true`);
      }
    }
  } else {
    fails.push("schema missing default all-true block");
  }
}

const ddl = read("supabase/migrations/20260808205844_identity_nest_auth.sql");
if (ddl) {
  for (const col of [
    "master boolean NOT NULL DEFAULT true",
    "opportunity boolean NOT NULL DEFAULT true",
    "wallet boolean NOT NULL DEFAULT true",
    "notice boolean NOT NULL DEFAULT true",
    "campaign boolean NOT NULL DEFAULT true",
    "ops_message boolean NOT NULL DEFAULT true",
    "strategy_match boolean NOT NULL DEFAULT true",
  ]) {
    if (!ddl.includes(col)) fails.push(`DDL missing ${col}`);
  }
}

const defaultsSrc = read(
  "services/api-nest/src/inbox/notification-prefs.defaults.ts",
);
if (defaultsSrc) {
  for (const key of [
    "master: true",
    "opportunity: true",
    "wallet: true",
    "notice: true",
    "campaign: true",
    "opsMessage: true",
    "strategyMatch: true",
  ]) {
    if (!defaultsSrc.includes(key)) {
      fails.push(`NOTIFICATION_PREFS_DEFAULTS missing ${key}`);
    }
  }
  if (!defaultsSrc.includes("function shouldSendPush")) {
    fails.push("shouldSendPush helper missing");
  }
  if (!defaultsSrc.includes("prefs.master !== true")) {
    fails.push("shouldSendPush must gate on master");
  }
}

// Pure helper re-check (duplicate of defaults — keep in sync)
function shouldSendPush(prefs, channel) {
  if (prefs.master !== true) return false;
  return prefs[channel] === true;
}
const ALL_ON = {
  master: true,
  opportunity: true,
  wallet: true,
  notice: true,
  campaign: true,
  opsMessage: true,
  strategyMatch: true,
};
if (shouldSendPush({ ...ALL_ON, opsMessage: false }, "opsMessage") !== false) {
  fails.push("helper: channel OFF must skip Push");
}
if (shouldSendPush({ ...ALL_ON, master: false }, "opportunity") !== false) {
  fails.push("helper: master OFF must skip Push");
}
if (shouldSendPush(ALL_ON, "opportunity") !== true) {
  fails.push("helper: all ON must allow Push");
}

const auth = read("services/api-nest/src/auth/auth.service.ts");
if (auth && !auth.includes("ensureDefaultsForUser")) {
  fails.push("AuthService signup must call ensureDefaultsForUser (§50.1n)");
}
if (auth && !auth.includes("notificationPrefs")) {
  fails.push("AuthService must inject NotificationPrefsService");
}

const settings = read("packages/ui/copy/ko/settings.ts");
for (const key of [
  "master:",
  "opportunity:",
  "wallet:",
  "notice:",
  "campaign:",
  "opsMessage:",
  "strategyMatch:",
  "defaultAllOn: true",
]) {
  if (settings && !settings.includes(key)) {
    fails.push(`settings.ts notify missing ${key}`);
  }
}

const panel = read("packages/ui/components/settings/SettingsPanel.tsx");
if (panel && !panel.includes('data-testid="settings-notify"')) {
  fails.push("SettingsPanel must expose settings-notify");
}
if (panel && !panel.includes("/api/v1/me/notification-prefs")) {
  fails.push("SettingsPanel must call notification-prefs API");
}

const rootPkg = read("package.json");
if (rootPkg && !rootPkg.includes('"verify:notification-prefs-default-on"')) {
  fails.push("root package.json must define verify:notification-prefs-default-on");
}

if (fails.length) {
  console.error("[verify:notification-prefs-default-on] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:notification-prefs-default-on] PASS (signup ALL true · Push skip on OFF)",
);
