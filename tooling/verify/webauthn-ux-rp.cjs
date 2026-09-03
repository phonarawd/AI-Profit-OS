/**
 * verify:webauthn-ux-rp — REL-022 / E-PWA-004
 * 지원/미지원 경로 둘 다 존재. money owner 변경 0.
 * fallback 없는 hard depend면 FAIL.
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
  "infra/domain.manifest.json",
  "governance/pwa/webauthn-rp.v1.json",
  "tooling/pwa/webauthn-rp.cjs",
  "services/api-nest/src/auth/webauthn-rp.ts",
  "services/api-nest/src/auth/auth.service.ts",
  "services/api-nest/src/auth/webauthn-assert.service.ts",
  "packages/ui/components/auth/webauthn-ready.ts",
  "packages/ui/components/auth/AuthLogin.tsx",
  "packages/ui/copy/ko/auth.ts",
  "tooling/pwa/webauthn-ux-harness.cjs",
  "tooling/pwa/webauthn-ux.spec.cjs",
];
for (const rel of required) read(rel);

const manifest = JSON.parse(read("infra/domain.manifest.json"));
if (manifest.rootDomain !== "hiptk.app") {
  fails.push("rootDomain must stay hiptk.app");
}
if (!manifest.env || manifest.env.APP_HOST !== "app.hiptk.app") {
  fails.push("APP_HOST must stay app.hiptk.app");
}

const contract = JSON.parse(read("governance/pwa/webauthn-rp.v1.json"));
if (contract.rpId !== manifest.rootDomain) {
  fails.push("governance rpId must equal domain.manifest rootDomain");
}
if (contract.origin !== `https://${manifest.env.APP_HOST}`) {
  fails.push("governance origin must equal https://APP_HOST");
}
if (contract.moneyOwnerChange !== 0) {
  fails.push("governance must lock moneyOwnerChange=0");
}

const {
  loadAuthWebauthnRp,
} = require(path.join(root, "tooling/pwa/webauthn-rp.cjs"));
const rp = loadAuthWebauthnRp();
if (rp.rpId !== "hiptk.app" || rp.origin !== "https://app.hiptk.app") {
  fails.push("loadAuthWebauthnRp must pin Cloudflare app host");
}

const nestRp = read("services/api-nest/src/auth/webauthn-rp.ts");
if (!nestRp.includes("domain.manifest.json")) {
  fails.push("Nest RP must read domain.manifest");
}
if (nestRp.includes("withdraw-stepup")) {
  fails.push("Nest RP must not import money step-up policy");
}

const auth = read("services/api-nest/src/auth/auth.service.ts");
const webauthnAssert = read("services/api-nest/src/auth/webauthn-assert.service.ts");
if (!auth.includes("this.webauthn.options(kind)")) {
  fails.push("passkeyOptions must delegate to WebauthnAssertService");
}
if (!webauthnAssert.includes("loadAuthWebauthnRp")) {
  fails.push("WebauthnAssertService must use loadAuthWebauthnRp");
}
if (!webauthnAssert.includes("rpId: this.rp.rpId") || !webauthnAssert.includes("origin: this.rp.origin")) {
  fails.push("WebauthnAssertService options must return rpId and origin");
}

const login = read("packages/ui/components/auth/AuthLogin.tsx");
if (!login.includes("isWebAuthnSupported")) {
  fails.push("AuthLogin must branch on support");
}
if (!login.includes("auth-passkey-fallback") || !login.includes("passkeyFallback")) {
  fails.push("AuthLogin must keep a visible fallback, not a blank screen");
}
if (!login.includes("auth-kakao-primary") || !login.includes("auth-email")) {
  fails.push("EXIT_GATE: existing login methods must remain");
}
if (!login.includes("tryPasskeyAuthenticate")) {
  fails.push("AuthLogin must attempt passkey only when supported");
}

const ready = read("packages/ui/components/auth/webauthn-ready.ts");
if (!ready.includes("usedFallback: true")) {
  fails.push("client must return usedFallback on miss/fail");
}
if (!ready.includes("prefers-reduced-motion")) {
  fails.push("haptics must respect reduced-motion");
}
if (!ready.includes("catch {")) {
  fails.push("haptics/passkey failure must be caught");
}

const copy = read("packages/ui/copy/ko/auth.ts");
if (!copy.includes("passkeyFallback:")) {
  fails.push("auth copy missing passkeyFallback");
}
for (const jargon of ["WebAuthn", "API", "PWA", "RP ID", "NATS"]) {
  if (copy.includes(`"${jargon}`) || copy.includes(`'${jargon}`)) {
    fails.push(`user copy must not include ${jargon}`);
  }
}

const sw = read("apps/web/public/sw.js");
if (/PublicKeyCredential|webauthn/i.test(sw)) {
  fails.push("SW must not handle WebAuthn");
}

const moneyForbidden = [
  "services/api-nest/src/wallet/withdraw-stepup.policy.ts",
  "services/api-nest/src/wallet/withdraw-stepup.service.ts",
  "services/api-nest/src/wallet/withdraw-apply-block.ts",
];
try {
  const diff = spawnSync(
    "git",
    ["--no-pager", "diff", "--name-only", "HEAD", "--", ...moneyForbidden],
    { cwd: root, encoding: "utf8" },
  );
  const changed = String(diff.stdout || "").replace(/\\/g, "/");
  for (const rel of moneyForbidden) {
    if (changed.includes(rel)) {
      fails.push(`money owner mutation forbidden: ${rel}`);
    }
  }
} catch {
  /* git unavailable */
}

const policy = read("services/api-nest/src/wallet/withdraw-stepup.policy.ts");
if (!policy.includes("WITHDRAW_STEP_UP_PRIORITY")) {
  fails.push("money fallback contract must remain");
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (pkg && !pkg.includes('"verify:webauthn-ux-rp"')) {
  fails.push("package.json missing verify:webauthn-ux-rp");
}
if (catalog && !catalog.includes("webauthn-ux-rp")) {
  fails.push("CATALOG.md must list webauthn-ux-rp");
}
if (domain && !domain.includes("webauthn-ux-rp.cjs")) {
  fails.push("domain-by-path must trigger webauthn-ux-rp");
}

const { runWebauthnUxCases } = require(
  path.join(root, "tooling/pwa/webauthn-ux-harness.cjs"),
);
const cases = runWebauthnUxCases();
if (cases.supported !== true || cases.unsupported !== false) {
  fails.push("VERIFY: supported and unsupported paths must both exist");
}
if (cases.hapticThrow !== false) {
  fails.push("haptic failure must not throw out");
}

const spec = spawnSync(
  process.execPath,
  [path.join(root, "tooling/pwa/webauthn-ux.spec.cjs")],
  { cwd: root, encoding: "utf8" },
);
if (spec.status !== 0 || !String(spec.stdout || "").includes("PASS")) {
  fails.push("committed spec failed");
  if (spec.stderr) fails.push(String(spec.stderr).trim());
}

if (fails.length) {
  console.error("[verify:webauthn-ux-rp] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:webauthn-ux-rp] PASS (CF RP · support+fallback · haptic optional · money owner 0)",
);
