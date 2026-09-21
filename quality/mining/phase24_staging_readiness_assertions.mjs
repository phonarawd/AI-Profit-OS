import fs from 'node:fs';

const DOC = 'governance/mining/MINE-024-STAGING-REHEARSAL-READINESS.md';
const ENV_EXAMPLE = 'quality/mining/phase24_staging_e2e.env.example';
const RUNNER = 'quality/mining/phase21_staging_e2e.mjs';
const PROD_REF = 'gaugwamwceqdnqdqrxqg';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function must(text, marker, label) {
  if (!text.includes(marker)) throw new Error(`${label}: missing ${JSON.stringify(marker)}`);
}
function mustNot(text, marker, label) {
  if (text.includes(marker)) throw new Error(`${label}: forbidden ${JSON.stringify(marker)}`);
}

const doc = read(DOC);
for (const marker of [
  'PACKAGE READY / STAGING RESOURCE NOT PROVISIONED / PRODUCTION UNTOUCHED',
  PROD_REF,
  'GET /api/v1/internal/mining/staging-identity',
  'supabaseProjectRef === PHASE21_EXPECTED_STAGING_SUPABASE_REF',
  'gitCommit === PHASE21_EXPECTED_BACKEND_SHA',
  'Do not replay the historical AI-Profit-OS migration chain wholesale',
  'PHASE21_E2E_MODE=preflight node quality/mining/phase21_staging_e2e.mjs',
  'BLOCKER-STAGING-DB-01',
  'BLOCKER-STAGING-E2E-01',
  'BLOCKER-PROD-MIGRATION-01',
  '**Production untouched.**',
]) must(doc, marker, 'MINE-024');

const envExample = read(ENV_EXAMPLE);
for (const marker of [
  'PHASE21_E2E_MODE=preflight',
  'PHASE21_ALLOW_MUTATION_E2E=NO',
  'PHASE21_ALLOW_TRIAL_RESIDUE=NO',
  'REPLACE_WITH_NON_PRODUCTION_20_CHAR_REF',
  'SET_OUT_OF_REPO',
]) must(envExample, marker, 'env example');
mustNot(envExample, PROD_REF, 'env example');
mustNot(envExample, 'PHASE21_ALLOW_MUTATION_E2E=YES', 'env example');

const runner = read(RUNNER);
for (const marker of [
  `const PROD_SUPABASE_REF = "${PROD_REF}"`,
  'PHASE21_ALLOW_MUTATION_E2E',
  'PHASE21_ALLOW_TRIAL_RESIDUE',
  'PHASE21_EXPECTED_STAGING_SUPABASE_REF',
  'PHASE21_EXPECTED_BACKEND_SHA',
  '/api/v1/internal/mining/staging-identity',
  'remote API attested Production Supabase',
  'mutationExecuted: false',
]) must(runner, marker, 'PHASE21 runner');

const migrationNames = fs.readdirSync('supabase/migrations');
const phase24Migration = migrationNames.filter((name) => /mine.*024|staging.*rehears|compat.*staging/i.test(name));
if (phase24Migration.length) {
  throw new Error(`PHASE24 readiness must not ship an executable migration before isolated staging exists: ${phase24Migration.join(', ')}`);
}

console.log('PASS phase24_staging_readiness_assertions');
console.log('staging_resource_provisioned=NO');
console.log('production_ref_denylist=PASS');
console.log('mutation_default=DISABLED');
console.log('remote_identity_attestation=REQUIRED');
console.log('phase24_migration_present=NO');
