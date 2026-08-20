/**
 * verify:pwa-push-badge — REL-020 / E-PWA-002
 * 구독/발송/kill 경로 존재. secret 커밋 0. kill 없이 무조건 발송이면 FAIL.
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
  "workers/push-dispatcher/src/lib/dispatch.cjs",
  "workers/push-dispatcher/src/index.ts",
  "tooling/pwa/generate-vapid.mjs",
  "governance/pwa/VAPID.md",
  "governance/pwa/push-kill.v1.json",
  "schemas/push-subscription.v1.json",
  "schemas/push-kill.v1.json",
  "schemas/push-payload.v1.json",
  "supabase/migrations/20260821090000_push_subscriptions_and_control.sql",
  "services/api-nest/src/push/push.user.controller.ts",
  "services/api-nest/src/push/push-kill.admin.controller.ts",
  "services/api-nest/src/push/push-emit.service.ts",
  "services/api-nest/src/push/push-kill.service.ts",
  "packages/sdk/src/push/subscribe.ts",
  "apps/web/components/pwa/PushOptIn.tsx",
  "tooling/pwa/pwa-push-badge-harness.cjs",
  "tooling/pwa/pwa-push-badge.spec.cjs",
];
for (const rel of required) read(rel);

const worker = read("workers/push-dispatcher/src/index.ts");
if (/status:\s*["']stub_accepted["']/.test(worker)) {
  fails.push("push-dispatcher must not return stub_accepted");
}
if (!worker.includes("handleDispatcherRequest")) {
  fails.push("worker must call handleDispatcherRequest");
}

const core = read("workers/push-dispatcher/src/lib/dispatch.cjs");
if (!core.includes('status: "killed"') || !core.includes("sendAttempted: false")) {
  fails.push("dispatch core must fail-closed on kill");
}

const sw = read("apps/web/public/sw.js");
if (!/addEventListener\(\s*["']push["']/.test(sw)) {
  fails.push("SW must handle push");
}
if (!sw.includes("setAppBadge") && !sw.includes("applyBadge")) {
  fails.push("SW must apply badge");
}
if (/PublicKeyCredential|webauthn/i.test(sw)) {
  fails.push("REL-020 must not mix WebAuthn (REL-022)");
}

const user = read("services/api-nest/src/push/push.user.controller.ts");
if (!user.includes("JwtAuthGuard")) {
  fails.push("subscribe API must use JwtAuthGuard");
}
if (!user.includes("me/push-subscriptions") && !user.includes("PUSH_USER_ROUTES")) {
  fails.push("subscribe route missing");
}

const admin = read("services/api-nest/src/push/push-kill.admin.controller.ts");
if (!admin.includes("@UseGuards(AdminGuard)")) {
  fails.push("kill admin controller must use AdminGuard");
}
if (!admin.includes("system-control/push") && !admin.includes("PUSH_ADMIN_ROUTES")) {
  fails.push("admin kill route missing");
}

const emit = read("services/api-nest/src/push/push-emit.service.ts");
if (!emit.includes("planEmit") || !emit.includes("getEnabled")) {
  fails.push("emit must consult kill before dispatch");
}

const vapid = read("governance/pwa/VAPID.md");
if (!vapid.includes(".env.local") || !vapid.includes("GITHUB = 0")) {
  fails.push("VAPID policy must forbid GitHub secrets");
}

const gen = read("tooling/pwa/generate-vapid.mjs");
if (gen.includes("-----BEGIN") || /VAPID_PRIVATE_KEY=[A-Za-z0-9_-]{20,}/.test(gen)) {
  fails.push("generator must not embed a live private key");
}

const mig = read(
  "supabase/migrations/20260821090000_push_subscriptions_and_control.sql",
);
if (!mig.includes("APPLY_THIS_SLICE = NO")) {
  fails.push("migration must stay file-only this slice");
}
if (!mig.includes("push_subscriptions") || !mig.includes("push_control")) {
  fails.push("migration must declare subscriptions + kill table");
}

const fixture = JSON.parse(
  read("tooling/verify/fixtures/migrations-applied.v1.json"),
);
if (!(fixture.committedUnapplied || []).includes("20260821090000")) {
  fails.push("REL-020 migration must be committedUnapplied (no production apply)");
}

const sdkPkg = read("packages/sdk/package.json");
if (!sdkPkg.includes('"./push"')) {
  fails.push("sdk package.json must export ./push");
}

const copy = read("apps/web/components/pwa/copy.ts");
for (const jargon of ["API", "PWA", "VAPID", "Service Worker", "NATS"]) {
  if (copy.includes(`"${jargon}"`) || copy.includes(`'${jargon}'`)) {
    fails.push(`user copy must not include ${jargon}`);
  }
}

const {
  runPushBadgeQaCases,
  runDispatcherHttpCases,
} = require(path.join(root, "tooling/pwa/pwa-push-badge-harness.cjs"));

const cases = runPushBadgeQaCases();
if (cases.killed.status !== "killed" || cases.killed.sendAttempted !== false) {
  fails.push("kill=false path must not send");
}
if (cases.sendCalls !== 0) {
  fails.push("EXIT_GATE: send ran while killed");
}
if (cases.planKilled.enqueue !== false) {
  fails.push("Nest planEmit must not enqueue when killed");
}
if (cases.dry.status !== "dry_run" || cases.unconfigured.status !== "accepted_unconfigured") {
  fails.push("unconfigured/dry-run must not claim sent");
}

const selftest = spawnSync(
  process.execPath,
  [path.join(root, "tooling/pwa/generate-vapid.mjs"), "--selftest"],
  { cwd: root, encoding: "utf8" },
);
if (selftest.status !== 0 || !String(selftest.stdout || "").includes("SELFTEST PASS")) {
  fails.push("generate-vapid --selftest failed");
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:pwa-push-badge"')) {
  fails.push("package.json missing verify:pwa-push-badge");
}
if (!catalog.includes("pwa-push-badge")) {
  fails.push("CATALOG.md must list pwa-push-badge");
}
if (!domain.includes("pwa-push-badge.cjs")) {
  fails.push("domain-by-path must trigger pwa-push-badge");
}

Promise.resolve(runDispatcherHttpCases())
  .then((http) => {
    if (http.unauth.statusCode !== 401) fails.push("dispatcher must 401 without token");
    if (http.nestKill.body.status !== "killed") fails.push("nest kill must stop dispatch");
    if (http.envKill.body.status !== "killed") fails.push("env kill must stop dispatch");
    if (fails.length) {
      console.error("[verify:pwa-push-badge] FAIL\n- " + fails.join("\n- "));
      process.exit(1);
    }
    console.log(
      "[verify:pwa-push-badge] PASS (subscribe+SW badge+kill · secret 0 · stub_accepted 0)",
    );
  })
  .catch((err) => {
    console.error("[verify:pwa-push-badge] FAIL\n- " + err.message);
    process.exit(1);
  });
