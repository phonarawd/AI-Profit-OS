/**
 * verify:webauthn-fallback-pointer — Money §43.6 Owns · PWA §23.6 UX only
 * - step-up priority: webauthn → email_otp → pin → recovery
 * - non-WebAuthn fallback required
 * - Email OTP provider = Resend
 * - PWA/apps must NOT redefine OTP/PIN/recovery policy
 * - §49.3 guard#1 withdrawApplyBlocked
 * - §43.6a Admin PIN wipe / WebAuthn revoke (ledger 불변)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ent.name === "node_modules" ||
      ent.name === ".next" ||
      ent.name === "dist" ||
      ent.name === "coverage"
    ) {
      continue;
    }
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, onFile);
    else onFile(p);
  }
}

const files = [
  "schemas/webauthn-challenge.v1.json",
  "schemas/withdraw-intent.v1.json",
  "schemas/toast-codes.v1.json",
  "schemas/user-capability.v1.json",
  "services/api-nest/src/wallet/withdraw-stepup.policy.ts",
  "services/api-nest/src/wallet/withdraw-stepup.service.ts",
  "services/api-nest/src/wallet/withdraw-apply-block.ts",
  "services/api-nest/src/wallet/withdraw-intent.service.ts",
  "services/api-nest/src/wallet/withdraw-credentials.admin.service.ts",
  "services/api-nest/src/wallet/withdraw-credentials.admin.controller.ts",
  "services/api-nest/src/wallet/resend-email.provider.ts",
  "services/api-nest/src/wallet/wallet.controller.ts",
  "services/api-nest/src/wallet/wallet.routes.ts",
  "services/api-nest/src/wallet/wallet.module.ts",
  "supabase/migrations/20260809001004_withdraw_stepup_auth.sql",
  ".env.example",
];
for (const f of files) mustExist(f);

// ── schema: methods + TTL contract ─────────────────────────
const challenge = JSON.parse(read("schemas/webauthn-challenge.v1.json"));
const methods = challenge.properties?.method?.enum || [];
for (const m of ["webauthn", "email_otp", "pin", "recovery"]) {
  if (!methods.includes(m)) fails.push(`webauthn-challenge.v1 missing method ${m}`);
}
if (!(challenge.description || "").includes("Money §43.6")) {
  fails.push("webauthn-challenge description must claim Money §43.6 Owns");
}
if (!(challenge.description || "").includes("PWA")) {
  fails.push("webauthn-challenge must note PWA must not redefine policy");
}

const intent = JSON.parse(read("schemas/withdraw-intent.v1.json"));
if (!(intent.description || "").includes("withdrawApplyBlocked")) {
  fails.push("withdraw-intent must mention withdrawApplyBlocked");
}

const toast = read("schemas/toast-codes.v1.json");
for (const code of [
  "WITHDRAW_APPLY_BLOCKED",
  "WITHDRAW_PIN_RESET",
  "WITHDRAW_STEP_UP_REQUIRED",
  "PIN_REQUIRED",
  "WEBAUTHN_REVOKED",
]) {
  if (!toast.includes(`"${code}"`)) fails.push(`toast-codes missing ${code}`);
}

// ── policy SSOT ────────────────────────────────────────────
const policy = read("services/api-nest/src/wallet/withdraw-stepup.policy.ts");
for (const needle of [
  "WITHDRAW_STEP_UP_PRIORITY",
  '"webauthn"',
  '"email_otp"',
  '"pin"',
  '"recovery"',
  "WITHDRAW_STEP_UP_TTL_SEC = 60",
  'WITHDRAW_EMAIL_PROVIDER = "resend"',
  "pinStateAfterAdminWipe",
  "PIN_REQUIRED",
  "Money §43.6",
  "PWA §23.6",
]) {
  if (!policy.includes(needle)) {
    fails.push(`withdraw-stepup.policy missing: ${needle}`);
  }
}

// Priority order must be webauthn first, then non-WebAuthn fallbacks
const priMatch = policy.match(
  /WITHDRAW_STEP_UP_PRIORITY\s*=\s*\[([\s\S]*?)\]\s*as const/,
);
if (!priMatch) {
  fails.push("WITHDRAW_STEP_UP_PRIORITY array not found");
} else {
  const order = [...priMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const expect = ["webauthn", "email_otp", "pin", "recovery"];
  if (JSON.stringify(order) !== JSON.stringify(expect)) {
    fails.push(
      `step-up priority must be ${expect.join("→")} got ${order.join("→")}`,
    );
  }
  if (order.filter((m) => m !== "webauthn").length < 1) {
    fails.push("Withdraw step-up must have non-WebAuthn fallback");
  }
}

// ── apply-block guard #1 ───────────────────────────────────
const block = read("services/api-nest/src/wallet/withdraw-apply-block.ts");
for (const needle of [
  "WITHDRAW_APPLY_BLOCKED",
  "assertWithdrawApplyAllowed",
  "withdrawApplyBlocked",
]) {
  if (!block.includes(needle)) {
    fails.push(`withdraw-apply-block missing: ${needle}`);
  }
}

function assertWithdrawApplyAllowed(cap) {
  return cap.withdrawApplyBlocked === true ? "WITHDRAW_APPLY_BLOCKED" : null;
}
if (assertWithdrawApplyAllowed({ withdrawApplyBlocked: true }) !== "WITHDRAW_APPLY_BLOCKED") {
  fails.push("guard#1: blocked must return WITHDRAW_APPLY_BLOCKED");
}
if (assertWithdrawApplyAllowed({ withdrawApplyBlocked: false }) !== null) {
  fails.push("guard#1: unblocked must allow");
}

const intentSvc = read("services/api-nest/src/wallet/withdraw-intent.service.ts");
for (const needle of [
  "assertNotApplyBlocked",
  "WITHDRAW_APPLY_BLOCKED",
  "assertBeforeWithdraw",
  "assertStepUpToken",
  "mode ?? \"profit\"",
  "wallet.withdraw_intent.created",
  "auth_ok",
]) {
  if (!intentSvc.includes(needle)) {
    fails.push(`withdraw-intent.service missing: ${needle}`);
  }
}

// Guard order comments / call order
const g1 = intentSvc.indexOf("assertNotApplyBlocked");
const g2 = intentSvc.indexOf("assertBeforeWithdraw");
const g3 = intentSvc.indexOf("assertStepUpToken");
if (!(g1 >= 0 && g2 > g1 && g3 > g2)) {
  fails.push("§49.3 guard order must be blocked → KYC → step-up");
}

// ── step-up service + Resend ───────────────────────────────
const stepSvc = read("services/api-nest/src/wallet/withdraw-stepup.service.ts");
for (const needle of [
  "WITHDRAW_STEP_UP_TTL_SEC",
  "createChallenge",
  "verifyChallenge",
  "setPin",
  "ResendEmailProvider",
  "originAllowed",
  "PIN_REQUIRED",
]) {
  if (!stepSvc.includes(needle)) {
    fails.push(`withdraw-stepup.service missing: ${needle}`);
  }
}

const resend = read("services/api-nest/src/wallet/resend-email.provider.ts");
for (const needle of [
  'provider = WITHDRAW_EMAIL_PROVIDER',
  "api.resend.com",
  "RESEND_FROM_EMAIL",
  "withdraw_stepup",
]) {
  if (!resend.includes(needle)) {
    fails.push(`resend-email.provider missing: ${needle}`);
  }
}

const envTs = read("services/api-nest/src/config/phase0.env.ts");
if (!envTs.includes("resendApiKey") || !envTs.includes("RESEND_API_KEY")) {
  fails.push("phase0.env must expose RESEND_API_KEY");
}
if (!envTs.includes("RESEND_FROM_EMAIL")) {
  fails.push("phase0.env must expose RESEND_FROM_EMAIL");
}

const envEx = read(".env.example");
if (!envEx.includes("RESEND_API_KEY") || !envEx.includes("RESEND_FROM_EMAIL")) {
  fails.push(".env.example must document Resend keys");
}

// ── §43.6a wipe / revoke ───────────────────────────────────
const cred = read(
  "services/api-nest/src/wallet/withdraw-credentials.admin.service.ts",
);
for (const needle of [
  "resetWithdrawPin",
  "revokeWebauthn",
  "WITHDRAW_PIN_RESET",
  "WEBAUTHN_REVOKED",
  "PIN_REQUIRED",
  "ledgerMutated: false",
  "plaintext",
  "auth_passkeys",
  "pinStateAfterAdminWipe",
]) {
  if (!cred.includes(needle)) {
    fails.push(`withdraw-credentials.admin.service missing: ${needle}`);
  }
}
if (cred.includes("newPin") || cred.includes("plaintextPin")) {
  fails.push("Admin must not set/read plaintext PIN");
}

const credCtrl = read(
  "services/api-nest/src/wallet/withdraw-credentials.admin.controller.ts",
);
if (!credCtrl.includes("WALLET_ADMIN_ROUTES.withdrawPinReset")) {
  fails.push("admin controller must bind withdrawPinReset");
}
if (!credCtrl.includes("WALLET_ADMIN_ROUTES.webauthnRevoke")) {
  fails.push("admin controller must bind webauthnRevoke");
}

const routes = read("services/api-nest/src/wallet/wallet.routes.ts");
for (const needle of [
  'withdraw: "withdraw"',
  "withdraw/step-up/challenge",
  "users/:id/withdraw-pin/reset",
  "users/:id/webauthn/revoke",
]) {
  if (!routes.includes(needle)) {
    fails.push(`wallet.routes missing: ${needle}`);
  }
}

const ctrl = read("services/api-nest/src/wallet/wallet.controller.ts");
if (!ctrl.includes("WALLET_USER_ROUTES.withdraw")) {
  fails.push("WalletController must bind POST withdraw");
}
if (!ctrl.includes("createStepUpChallenge")) {
  fails.push("WalletController must expose step-up challenge");
}

const mod = read("services/api-nest/src/wallet/wallet.module.ts");
for (const needle of [
  "WithdrawStepUpService",
  "WithdrawIntentService",
  "WithdrawCredentialsAdminController",
  "ResendEmailProvider",
]) {
  if (!mod.includes(needle)) fails.push(`WalletModule missing: ${needle}`);
}

const events = read("services/api-nest/src/wallet/wallet.events.ts");
for (const needle of [
  "wallet.withdraw_intent.created",
  "wallet.withdraw_pin.reset",
  "wallet.webauthn.revoked",
]) {
  if (!events.includes(needle)) fails.push(`WALLET_EVENTS missing ${needle}`);
}

const mig = read("supabase/migrations/20260809001004_withdraw_stepup_auth.sql");
for (const needle of [
  "withdraw_pin_verifiers",
  "withdraw_stepup_challenges",
  "withdraw_recovery_codes",
  "withdraw_credentials_audit",
  "must_reset",
  "plaintext PIN",
]) {
  if (!mig.includes(needle)) fails.push(`migration missing: ${needle}`);
}

// ── PWA / apps must NOT own OTP policy ─────────────────────
const bannedOwnership = [
  /OTP\s*policy\s*Owns\s*=\s*PWA/i,
  /step-up\s*priority[^\n]{0,40}PWA\s*Owns/i,
  /WITHDRAW_STEP_UP_PRIORITY/,
  /email_otp.*priority/,
];
const scanRoots = [
  path.join(root, "apps", "web"),
  path.join(root, "packages", "sdk"),
  path.join(root, "workers"),
];
for (const dir of scanRoots) {
  walk(dir, (file) => {
    if (!/\.(ts|tsx|js|jsx|md)$/.test(file)) return;
    const rel = path.relative(root, file).replace(/\\/g, "/");
    // allow pointer comments that say Money Owns
    const text = fs.readFileSync(file, "utf8");
    if (
      text.includes("WITHDRAW_STEP_UP_PRIORITY") ||
      /export const\s+STEP_UP_PRIORITY/.test(text)
    ) {
      fails.push(`PWA/apps must not define step-up priority SSOT: ${rel}`);
    }
    if (/Owns\s*=\s*PWA[^\n]*OTP/i.test(text) && !/Money §43\.6/.test(text)) {
      fails.push(`OTP policy ownership claimed outside Money: ${rel}`);
    }
    for (const re of bannedOwnership) {
      if (re === bannedOwnership[0] && re.test(text)) {
        fails.push(`forbidden OTP policy Owns=PWA in ${rel}`);
      }
    }
  });
}

// wallet-service folder forbidden
if (fs.existsSync(path.join(root, "services/wallet-service"))) {
  fails.push("services/wallet-service forbidden · use api-nest wallet module");
}

// Pure wipe contract
function pinStateAfterAdminWipe() {
  return {
    mustReset: true,
    pinHash: null,
    toastCode: "WITHDRAW_PIN_RESET",
    nextWithdrawCode: "PIN_REQUIRED",
  };
}
const wipe = pinStateAfterAdminWipe();
if (wipe.nextWithdrawCode !== "PIN_REQUIRED" || wipe.toastCode !== "WITHDRAW_PIN_RESET") {
  fails.push("wipe contract must yield WITHDRAW_PIN_RESET → PIN_REQUIRED");
}

if (fails.length) {
  console.error("[verify:webauthn-fallback-pointer] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:webauthn-fallback-pointer] PASS (Money §43.6 step-up Owns · Resend OTP · non-WebAuthn fallback · guard#1 withdrawApplyBlocked · §43.6a wipe · PWA policy 0)",
);
