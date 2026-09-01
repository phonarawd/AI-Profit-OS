/**
 * verify:auth-identity-proof — issue 80
 * STATIC_VERIFIER vs RUNTIME_BEHAVIOR are labeled separately.
 * This script never claims BROWSER_PASS or REMOTE_CI_PASS.
 */
const { spawnSync } = require("child_process");
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

const svc = read("services/api-nest/src/auth/auth.service.ts");
const ctrl = read("services/api-nest/src/auth/auth.controller.ts");
const magic = read("services/api-nest/src/auth/magic-link.service.ts");
const oauth = read("services/api-nest/src/auth/oauth-identity.service.ts");
const webauthn = read("services/api-nest/src/auth/webauthn-assert.service.ts");
const resend = read("services/api-nest/src/wallet/resend-email.provider.ts");

if (!magic.includes("consumeAtomic") || !magic.includes("hashProofSecret")) {
  fails.push("magic-link must hash and atomically consume a one-time token");
}
if (!magic.includes("magic link token required")) {
  fails.push("magic-link prove must reject missing token");
}
if (!ctrl.includes("this.auth.magicLinkVerify")) {
  fails.push("controller must call AuthService.magicLinkVerify");
}
if (!svc.includes("caller identity is not authority")) {
  fails.push("public signup must reject caller-supplied identity methods");
}
if (!oauth.includes("tokenExchange") || !oauth.includes("fetchProfile")) {
  fails.push("oauth must exchange code server-side and read provider profile");
}
if (!oauth.includes("caller providerSubject is not identity authority")) {
  fails.push("oauth must reject caller providerSubject");
}
if (ctrl.includes("providerSubject: String(body.providerSubject")) {
  fails.push("oauth callback must not trust body.providerSubject");
}
if (!webauthn.includes("verifyEs256P1363") || !webauthn.includes("verifyRpIdHash")) {
  fails.push("webauthn must verify signature and rpId hash");
}
if (!webauthn.includes("webauthn origin mismatch")) {
  fails.push("webauthn must verify expected origin");
}
if (
  !webauthn.includes("hasWebauthnUserPresence") ||
  !webauthn.includes("webauthn user presence required")
) {
  fails.push("webauthn must require authenticator user-presence flag");
}
if (ctrl.includes('credentialId: String(body?.credentialId ?? body?.id ?? "session")')) {
  fails.push("passkeyAuthVerify must not mint from credentialId alone");
}
const authService = read("services/api-nest/src/auth/auth.service.ts");
const passkeyPolicy = read("services/api-nest/src/auth/passkey-registration.policy.ts");
if (!authService.includes("assertPasskeyCredentialUnclaimed(existing)")) {
  fails.push("passkey register must reject an already-registered credentialId");
}
if (!authService.includes("rejectPasskeyCredentialInsertRace()")) {
  fails.push("passkey register unique-race must fail closed");
}
const registerStart = authService.indexOf("private async registerPasskey(");
const registerEnd =
  registerStart >= 0
    ? authService.indexOf("\n  private async sessionMintView", registerStart)
    : -1;
const registerBody =
  registerStart >= 0 && registerEnd > registerStart
    ? authService.slice(registerStart, registerEnd)
    : "";
if (!registerBody) {
  fails.push("registerPasskey body missing");
} else {
  if (/return \{ userId: row\.rows\[0\]\.user_id, isNew: false \}/.test(registerBody)) {
    fails.push("passkey register must never reuse pre-existing credential userId");
  }
  if (/return \{ userId: again\.rows\[0\]\.user_id, isNew: false \}/.test(registerBody)) {
    fails.push("passkey insert race must never reuse winner userId");
  }
}
if (!passkeyPolicy.includes("WEBAUTHN_CREDENTIAL_ALREADY_REGISTERED")) {
  fails.push("passkey registration conflict reason missing");
}
if (!passkeyPolicy.includes("ConflictException")) {
  fails.push("duplicate passkey registration must be an explicit conflict");
}

if (!resend.includes("sendMagicLink")) {
  fails.push("Resend must send an actual magic-link URL");
}
if (!svc.includes("magicLinkVerify") || !svc.includes("this.magicLink.prove")) {
  fails.push("AuthService.magicLinkVerify must consume proven token before mint");
}

const email = read("services/api-nest/src/auth/identity-proof.email.ts");
if (email.includes("/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/")) {
  fails.push("email validation must not use polynomial regex");
}
if (!email.includes("EMAIL_MAX_LEN") || !email.includes("lastIndexOf(\".\")")) {
  fails.push("email validation must be a bounded linear scan");
}

if (fails.length) {
  console.error("[verify:auth-identity-proof] STATIC FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:auth-identity-proof] STATIC_VERIFIER_PASS");

const emailRuntime = spawnSync(
  process.execPath,
  [
    "--test",
    "--experimental-strip-types",
    "services/api-nest/src/auth/identity-proof.email.runtime.test.ts",
  ],
  { cwd: root, encoding: "utf8", timeout: 30_000 },
);
process.stdout.write(emailRuntime.stdout || "");
process.stderr.write(emailRuntime.stderr || "");
if (emailRuntime.status !== 0) {
  console.error("[verify:auth-identity-proof] EMAIL_RUNTIME failed");
  process.exit(1);
}

const tscBin = require.resolve("typescript/bin/tsc");
const build = spawnSync(
  process.execPath,
  [tscBin, "-p", path.join(root, "services/api-nest/tsconfig.json")],
  { cwd: root, encoding: "utf8" },
);
process.stdout.write(build.stdout || "");
process.stderr.write(build.stderr || "");
if (build.status !== 0) {
  console.error("[verify:auth-identity-proof] nest tsc failed");
  process.exit(1);
}
const selftest = path.join(
  root,
  "services/api-nest/dist/auth/identity-proof.selftest.js",
);
const run = spawnSync(process.execPath, [selftest], {
  cwd: root,
  encoding: "utf8",
  timeout: 30_000,
});
process.stdout.write(run.stdout || "");
process.stderr.write(run.stderr || "");
if (run.status !== 0 || !(run.stdout || "").includes("ALL PASS")) {
  console.error("[verify:auth-identity-proof] RUNTIME_BEHAVIOR missing");
  process.exit(1);
}
console.log(
  "[verify:auth-identity-proof] RUNTIME_BEHAVIOR_PASS · BROWSER_PASS=NOT_RUN · REMOTE_CI_PASS=NOT_PROVEN",
);
