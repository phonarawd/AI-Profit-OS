/**
 * verify:email-provider-resend — Money §43.6 · Infra
 * Day-1 SMTP SSOT = Resend free tier · from domain required · SMS not Day-1.
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

mustExist("services/api-nest/src/wallet/resend-email.provider.ts");
mustExist("services/api-nest/src/wallet/withdraw-stepup.policy.ts");
mustExist("services/api-nest/src/config/phase0.env.ts");
mustExist("services/api-nest/src/auth/auth.service.ts");
mustExist(".env.example");

const policy = read("services/api-nest/src/wallet/withdraw-stepup.policy.ts");
if (!policy.includes('WITHDRAW_EMAIL_PROVIDER = "resend"')) {
  fails.push('WITHDRAW_EMAIL_PROVIDER must be "resend"');
}

const provider = read("services/api-nest/src/wallet/resend-email.provider.ts");
for (const needle of [
  "api.resend.com/emails",
  "RESEND_FROM_EMAIL",
  "assertFromConfigured",
  "withdraw_stepup",
  'provider = WITHDRAW_EMAIL_PROVIDER',
]) {
  if (!provider.includes(needle)) {
    fails.push(`resend-email.provider missing: ${needle}`);
  }
}
if (/SMS OTP:\s*유료|SMS[^\n]{0,40}Day-1\s*필수/i.test(provider)) {
  fails.push("SMS must not be Day-1 required in Resend provider");
}
if (!/not Day-1|L2 optional|Day-1 필수 아님/i.test(provider + policy)) {
  fails.push("must document SMS as not Day-1 required");
}

const envTs = read("services/api-nest/src/config/phase0.env.ts");
if (!envTs.includes('read("RESEND_API_KEY")')) {
  fails.push("phase0.env must read RESEND_API_KEY");
}
if (!envTs.includes('read("RESEND_FROM_EMAIL")')) {
  fails.push("phase0.env must read RESEND_FROM_EMAIL");
}

const envEx = read(".env.example");
if (!envEx.includes("RESEND_API_KEY")) fails.push(".env.example missing RESEND_API_KEY");
if (!envEx.includes("RESEND_FROM_EMAIL")) {
  fails.push(".env.example missing RESEND_FROM_EMAIL");
}

const auth = read("services/api-nest/src/auth/auth.service.ts");
const magic = read("services/api-nest/src/auth/magic-link.service.ts");
if (!auth.includes("magicLinkRequest") || !magic.includes('delivery: "resend"')) {
  fails.push("auth magic-link must use delivery resend (same SSOT path)");
}
if (!provider.includes("sendMagicLink")) {
  fails.push("resend-email.provider must send an actual magic-link URL");
}
if (
  !provider.includes('env.nodeEnv === "production"') ||
  !provider.includes('reason: "resend_api_key_missing"')
) {
  fails.push("production Resend delivery must fail closed when API key is missing");
}

const magicFailIndex = magic.indexOf("if (!sent.ok)");
const magicFailBlock =
  magicFailIndex >= 0 ? magic.slice(magicFailIndex, magicFailIndex + 320) : "";
if (
  !magicFailBlock.includes("ServiceUnavailableException") ||
  !magicFailBlock.includes("MAGIC_LINK_DELIVERY_UNAVAILABLE")
) {
  fails.push("magic-link provider failure must surface as delivery unavailable");
}

const step = read("services/api-nest/src/wallet/withdraw-stepup.service.ts");
if (!step.includes("ResendEmailProvider") || !step.includes("email_otp")) {
  fails.push("withdraw step-up must send Email OTP via ResendEmailProvider");
}

if (fails.length) {
  console.error("[verify:email-provider-resend] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:email-provider-resend] PASS (Resend SSOT · FROM domain · magic-link+withdraw OTP · SMS not Day-1)",
);
