/**
 * BACKEND-ONLY PORT of tooling/verify/webauthn-ux-rp.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:webauthn-ux-rp — REL-022 / E-PWA-004
 * 지원/미지원 경로 둘 다 존재. money owner 변경 0.
 * fallback 없는 hard depend면 FAIL.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
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
const optionsOwner = auth.includes("loadAuthWebauthnRp") ? auth : webauthnAssert;
if (!optionsOwner.includes("loadAuthWebauthnRp")) {
  fails.push("passkeyOptions must use loadAuthWebauthnRp");
}
if (!optionsOwner.includes("rpId:") || !optionsOwner.includes("origin:")) {
  fails.push("passkeyOptions must return rpId and origin");
}
if (!auth.includes("passkeyOptions") || !auth.includes("this.webauthn.options")) {
  fails.push("auth.service must delegate passkeyOptions to WebAuthn assert");
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

if (fails.length) {
  console.error("[verify:webauthn-ux-rp] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:webauthn-ux-rp] PASS (CF RP · governance contract · Nest RP/passkey options · money owner 0)",
);
