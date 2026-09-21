import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`PHASE21_E2E_ASSERTION_FAILED: ${message}`);
};

const runner = read("quality/mining/phase21_staging_e2e.mjs");
const wrapper = read("quality/mining/phase06_staging_e2e.mjs");
const internal = read("services/api-nest/src/mining/mining.internal.controller.ts");

must(wrapper.includes('import "./phase21_staging_e2e.mjs"'), "historical Render runner path does not delegate to PHASE21");
must(runner.includes('process.env.PHASE21_E2E_MODE || "preflight"'), "runner must default to preflight");
must(runner.includes('PHASE21_ALLOW_MUTATION_E2E") === "YES"'), "mutation mode lacks explicit YES gate");
must(runner.includes('PHASE21_ALLOW_TRIAL_RESIDUE") === "YES"'), "24h trial residue lacks explicit gate");
must(runner.includes('PHASE21_API_BASE_URL must be explicit in mutation mode'), "mutation API URL can fall back implicitly");
must(runner.includes("PHASE21_EXPECTED_API_HOST"), "expected API host pin missing");
must(runner.includes("PHASE21_EXPECTED_BACKEND_SHA"), "exact backend SHA pin missing");
must(runner.includes("PHASE21_EXPECTED_STAGING_SUPABASE_REF"), "staging Supabase ref pin missing");
must(runner.includes('const PROD_SUPABASE_REF = "gaugwamwceqdnqdqrxqg"'), "Production Supabase deny ref missing");
must(runner.includes('"ai-profit-os.onrender.com"'), "Production API host denylist missing");
must(runner.includes("/api/v1/internal/mining/staging-identity"), "remote staging identity attestation call missing");
must(runner.includes("remote DB ref mismatch"), "remote database identity equality gate missing");
must(runner.includes("remote backend SHA mismatch"), "remote backend SHA equality gate missing");

must(internal.includes('@Get("staging-identity")'), "authenticated staging identity endpoint missing");
must(internal.includes("requireInternalMiningToken(token)"), "staging identity does not use internal mining auth");
must(internal.includes("supabaseProjectRef: env.supabaseProjectRef"), "staging identity does not attest Supabase ref");
must(internal.includes("process.env.RENDER_GIT_COMMIT"), "staging identity does not attest deployed commit");

for (const marker of [
  'const ADMIN_ISSUER = "ai-profit-os-admin"',
  'const ADMIN_AUDIENCE = "aipo-ops"',
  'const USER_ISSUER = "ai-profit-os-nest"',
  'const USER_AUDIENCE = "peotteok-user"',
  'makerId !== checkerId',
  'role: "super"',
]) {
  must(runner.includes(marker), `real JWT / maker-checker marker missing: ${marker}`);
}

for (const marker of [
  "/api/v1/admin/users/${encodeURIComponent(userId)}/balance-adjust",
  'kind: "credit"',
  'kind: "debit"',
  'bucket: "principal"',
  "principal did not return to baseline",
]) {
  must(runner.includes(marker), `test funding setup/cleanup marker missing: ${marker}`);
}

for (const marker of [
  '"/api/v1/mining/positions/start"',
  '/increase`',
  '/decrease`',
  '/end`',
  "ordinary start idempotency replay changed position",
  "increase replay changed position",
  "decrease replay changed principal",
  "ordinary end replay is not ENDED",
]) {
  must(runner.includes(marker), `ordinary mutation coverage missing: ${marker}`);
}

for (const marker of [
  'status === "START_PENDING"',
  "/api/v1/admin/mining/high-value-reviews?",
  "/approve`",
  "/reject`",
  "high-value approval replay failed",
  "high-value rejection replay failed",
  "high-value reject moved principal",
  "high-value reject moved locked balance",
]) {
  must(runner.includes(marker), `high-value mutation coverage missing: ${marker}`);
}

for (const marker of [
  '"/api/v1/admin/mining/trial-config"',
  '"/api/v1/mining/trial"',
  '"/api/v1/mining/trial/start"',
  "trial replay changed session",
  "24 * 60 * 60 * 1000",
  "trial window is not 24 hours",
]) {
  must(runner.includes(marker), `trial mutation coverage missing: ${marker}`);
}

must(runner.includes("PHASE21_STAGING_IDENTITY_ATTESTED"), "identity PASS marker missing");
must(runner.includes("PHASE21_STAGING_MUTATION_E2E_PASS"), "mutation PASS marker missing");
must(runner.includes("PHASE21_STAGING_E2E_CLEANUP_ERRORS"), "cleanup fail-closed marker missing");
must(runner.includes("mutationExecuted: false"), "preflight must explicitly prove no mutation");

console.log("PHASE21_STAGING_E2E_ASSERTIONS_PASS");
