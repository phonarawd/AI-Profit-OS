/**
 * verify:auth-flows — Infra §51.9 + §51.9.1
 * Nest JWT only · Stage A/B fields · session · delete-account · OAuth/Passkey routes
 * Supabase Auth FORBIDDEN
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

mustExist("services/api-nest/src/auth/auth.constants.ts");
mustExist("services/api-nest/src/auth/auth.stage.ts");
mustExist("services/api-nest/src/auth/auth.routes.ts");
mustExist("services/api-nest/src/auth/auth.controller.ts");
mustExist("services/api-nest/src/auth/auth.service.ts");
mustExist("services/api-nest/src/auth/auth.module.ts");
mustExist("schemas/auth-session.v1.json");
mustExist("schemas/user-profile.v1.json");
mustExist("supabase/migrations/20260808205844_identity_nest_auth.sql");
mustExist("supabase/migrations/20260808224856_auth_oauth_passkey_stage_a_b.sql");

const constants = read("services/api-nest/src/auth/auth.constants.ts");
if (!constants.includes('USER_JWT_ISSUER = "ai-profit-os-nest"')) {
  fails.push('USER_JWT_ISSUER must be "ai-profit-os-nest"');
}
if (!constants.includes('ADMIN_JWT_ISSUER = "ai-profit-os-admin"')) {
  fails.push('ADMIN_JWT_ISSUER must be "ai-profit-os-admin" (separated §40)');
}
if (!constants.includes('OAUTH_PRIMARY: OauthProvider = "kakao"')) {
  fails.push("OAUTH_PRIMARY must be kakao");
}
if (!constants.includes("STAGE_B_MIN_AGE_YEARS = 19")) {
  fails.push("STAGE_B_MIN_AGE_YEARS must be 19");
}
for (const banned of ["rrnFull", "gender", "addressRequired"]) {
  if (!constants.includes(`"${banned}"`)) {
    fails.push(`FORBIDDEN_USER_AUTH_FIELDS must include ${banned}`);
  }
}

const stage = read("services/api-nest/src/auth/auth.stage.ts");
for (const f of ["termsAcceptedAt", "privacyAcceptedAt"]) {
  if (!stage.includes(`"${f}"`)) fails.push(`Stage A required missing ${f}`);
}
for (const f of ["marketingConsent", "referralCode"]) {
  if (!stage.includes(`"${f}"`)) fails.push(`Stage A optional missing ${f}`);
}
for (const f of ["displayName", "phoneE164", "birthDate"]) {
  if (!stage.includes(`"${f}"`)) fails.push(`Stage B required missing ${f}`);
}
for (const m of ["oauth_kakao", "oauth_google", "passkey", "email_magic"]) {
  if (!stage.includes(`"${m}"`)) fails.push(`Stage A identity method missing ${m}`);
}
if (!stage.includes("isCapabilityAllowed")) {
  fails.push("Stage gate helper isCapabilityAllowed missing");
}
if (!stage.includes('"withdraw"') || !stage.includes('"kyc_submit"')) {
  fails.push("Stage gates must define withdraw + kyc_submit");
}
if (!stage.includes("evaluateDeleteAccountGuards")) {
  fails.push("delete-account guard helper missing");
}
if (!stage.includes("lockedUsdt") || !stage.includes("pendingWithdrawCount")) {
  fails.push("delete-account must guard locked + pending withdraw");
}

const routes = read("services/api-nest/src/auth/auth.routes.ts");
const needPaths = [
  "signup",
  "profile",
  "session",
  "logout",
  "refresh",
  "oauth/:provider/start",
  "oauth/:provider/callback",
  "passkey/register/options",
  "passkey/authenticate/options",
  "magic-link/request",
  "magic-link/verify",
  "delete-account",
];
for (const p of needPaths) {
  if (!routes.includes(p)) fails.push(`AUTH_ROUTES missing ${p}`);
}

for (const rel of [
  "services/api-nest/src/auth/magic-link.service.ts",
  "services/api-nest/src/auth/oauth-identity.service.ts",
  "services/api-nest/src/auth/webauthn-assert.service.ts",
  "services/api-nest/src/auth/identity-proof.store.ts",
]) {
  mustExist(rel);
}

const controller = read("services/api-nest/src/auth/auth.controller.ts");
if (!controller.includes('@Controller("auth")')) {
  fails.push('AuthController must be @Controller("auth")');
}
for (const deco of [
  "@Post(AUTH_ROUTES.signup)",
  "@Patch(AUTH_ROUTES.profile)",
  "@Get(AUTH_ROUTES.session)",
  "@Post(AUTH_ROUTES.logout)",
  "@Post(AUTH_ROUTES.deleteAccount)",
  "@Post(AUTH_ROUTES.oauthStart)",
  "@Post(AUTH_ROUTES.passkeyRegisterOptions)",
  "@Post(AUTH_ROUTES.magicLinkRequest)",
]) {
  if (!controller.includes(deco)) fails.push(`controller missing ${deco}`);
}

const appMod = read("services/api-nest/src/app.module.ts");
if (!appMod.includes("AuthModule")) {
  fails.push("AppModule must import AuthModule");
}

const sessionSchema = JSON.parse(read("schemas/auth-session.v1.json"));
if (sessionSchema.properties?.issuer?.const !== "ai-profit-os-nest") {
  fails.push("auth-session.v1 issuer const must be ai-profit-os-nest");
}
if (!/Supabase Auth FORBIDDEN/i.test(sessionSchema.description || "")) {
  fails.push("auth-session.v1 must forbid Supabase Auth in description");
}

const profileSchema = JSON.parse(read("schemas/user-profile.v1.json"));
for (const req of ["termsAcceptedAt", "privacyAcceptedAt"]) {
  if (!(profileSchema.required || []).includes(req)) {
    fails.push(`user-profile.v1 required missing ${req}`);
  }
}
for (const prop of ["displayName", "phoneE164", "birthDate", "onboardingStage"]) {
  if (!profileSchema.properties?.[prop]) {
    fails.push(`user-profile.v1 properties missing ${prop}`);
  }
}
const forbiddenNot = JSON.stringify(profileSchema.not || {});
if (!forbiddenNot.includes("rrnFull") || !forbiddenNot.includes("gender")) {
  fails.push("user-profile.v1 must not-allow rrnFull/gender");
}

const identitySql = read("supabase/migrations/20260808205844_identity_nest_auth.sql");
if (!identitySql.includes("ai-profit-os-nest")) {
  fails.push("identity migration must lock Nest issuer");
}
if (!identitySql.includes("NOT auth.users")) {
  fails.push("users table must declare NOT auth.users");
}

const oauthSql = read(
  "supabase/migrations/20260808224856_auth_oauth_passkey_stage_a_b.sql",
);
for (const table of [
  "auth_oauth_identities",
  "auth_passkeys",
  "auth_magic_link_challenges",
]) {
  if (!oauthSql.includes(table)) fails.push(`migration missing table ${table}`);
}
if (!oauthSql.includes("users_contact_chk")) {
  fails.push("migration must drop Stage-A-blocking users_contact_chk");
}
if (!oauthSql.includes("kakao") || !oauthSql.includes("google")) {
  fails.push("oauth identities must allow kakao + google");
}
if (!oauthSql.includes("ENABLE ROW LEVEL SECURITY")) {
  fails.push("new auth tables must enable RLS");
}

// Scan Nest + apps for Supabase Auth SoT misuse
const denyAuth =
  /@supabase\/auth-js|supabase\.auth\.|createClient\([^)]*\)[\s\S]{0,80}\.auth\./;
const denyImports =
  /from\s+['"]@supabase\/(auth-js|auth-helpers|ssr)['"]|from\s+['"]@supabase\/supabase-js['"]/;

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ent.name === "node_modules" ||
      ent.name === "dist" ||
      ent.name === ".next"
    )
      continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

for (const file of walk(path.join(root, "services/api-nest/src"))) {
  const t = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  if (denyAuth.test(t) || denyImports.test(t)) {
    fails.push(`Supabase Auth import/SoT forbidden: ${rel}`);
  }
  if (t.includes("supabase.auth")) {
    fails.push(`supabase.auth usage forbidden: ${rel}`);
  }
}

// Canon auth surfaces (field SSOT pointer — UI owns pixels)
for (const id of ["auth-login", "auth-signup", "auth-complete-profile"]) {
  const wire = path.join(
    root,
    `packages/ui/canon/surfaces/${id}.wire.json`,
  );
  if (!fs.existsSync(wire)) fails.push(`missing Canon ${id}`);
}

const signupWire = path.join(
  root,
  "packages/ui/canon/surfaces/auth-signup.wire.json",
);
if (fs.existsSync(signupWire)) {
  const w = JSON.parse(fs.readFileSync(signupWire, "utf8"));
  if (w.primaryCta?.action !== "oauth_kakao") {
    fails.push("auth-signup primaryCta.action must be oauth_kakao");
  }
  for (const f of ["rrn_field", "gender_field", "address_required_v1"]) {
    if (!(w.forbidden || []).includes(f)) {
      fails.push(`auth-signup.forbidden missing ${f}`);
    }
  }
}

const completeWire = path.join(
  root,
  "packages/ui/canon/surfaces/auth-complete-profile.wire.json",
);
if (fs.existsSync(completeWire)) {
  const w = JSON.parse(fs.readFileSync(completeWire, "utf8"));
  const ids = (w.blocks || []).map((b) => b.id);
  for (const id of ["displayName", "phone", "birthDate"]) {
    if (!ids.includes(id)) fails.push(`auth-complete-profile missing block ${id}`);
  }
  if (w.primaryCta?.action !== "patch_profile_stage_b") {
    fails.push("complete-profile CTA must be patch_profile_stage_b");
  }
}

const pkg = JSON.parse(read("services/api-nest/package.json"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
for (const bad of [
  "@supabase/supabase-js",
  "@supabase/auth-js",
  "@supabase/ssr",
]) {
  if (deps[bad]) fails.push(`api-nest must not depend on ${bad}`);
}

if (fails.length) {
  console.error("[verify:auth-flows] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:auth-flows] PASS (Nest JWT · Stage A/B · OAuth/Passkey · session · 탈퇴 · Supabase Auth 0)",
);
