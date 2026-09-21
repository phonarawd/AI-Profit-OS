import fs from 'node:fs';

const DESIGN = 'governance/mining/MINE-022-PROD-BASELINE-COMPAT.md';
const ADVISORY = 'governance/mining/MINE-022-PROD-RLS-ADVISORY.md';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function requireIncludes(text, markers, label) {
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`${label}: missing marker ${JSON.stringify(marker)}`);
  }
}

function requireExcludes(text, markers, label) {
  for (const marker of markers) {
    if (text.includes(marker)) throw new Error(`${label}: forbidden marker ${JSON.stringify(marker)}`);
  }
}

const design = read(DESIGN);
requireIncludes(design, [
  'DESIGN LOCKED / STAGING REHEARSAL REQUIRED / PRODUCTION UNTOUCHED',
  'public.profiles(id)',
  'public.wallet_accounts',
  'private.ledger_entries',
  'numeric(36,18)',
  'No automatic current-wallet balance import is permitted',
  'public.admin_approval_requests',
  'public.fx_snapshots',
  'PHASE21 remote DB-ref + backend-SHA attestation passes',
  'BLOCKER-STAGING-DB-01 — OPEN',
  '**Production untouched.**',
], 'design');
requireExcludes(design, [
  'wallet_accounts.available_amount -> principal',
  'private.ledger_entries -> public.ledger_entries',
], 'design');

const admin = read('services/api-nest/src/mining/mining-admin.service.ts');
requireIncludes(admin, [
  'INSERT INTO public.admin_approval_requests',
  'FROM public.admin_approval_requests',
  "status='approved'",
], 'mining admin runtime');

const trial = read('services/api-nest/src/mining/mining-trial.service.ts');
requireIncludes(trial, [
  'FROM public.fx_snapshots',
  'FROM public.trial_grants',
  'trial_principal',
  'trial_locked',
], 'mining trial runtime');

const ledger = read('services/api-nest/src/ledger/ledger.posting.service.ts');
requireIncludes(ledger, [
  'public.ledger_accounts',
  'public.ledger_journals',
  'public.ledger_entries',
  'app.ledger_posting',
], 'ledger runtime');

const kill = read('services/api-nest/src/kill-switch/kill-switch.service.ts');
requireIncludes(kill, [
  'public.admin_kill_switches',
  'assertPath',
], 'kill-switch runtime');

if (!fs.existsSync(ADVISORY)) {
  throw new Error('RLS advisory document missing');
}
const advisory = read(ADVISORY);
requireIncludes(advisory, [
  'RLS OFF',
  'private.putduk_system_config',
  'private.push_subscriptions',
  'private.push_outbox',
  'private.work_templates',
  'private.work_template_versions',
  'private.work_orders',
  'private.task_run_items',
  'private.task_run_answers',
  'DO NOT auto-enable RLS',
  'Production unchanged',
], 'RLS advisory');

const migrationNames = fs.readdirSync('supabase/migrations');
const prematureCompat = migrationNames.filter((name) =>
  /(?:prod|production).*baseline.*compat|baseline.*compat|current.*putduk.*mining.*compat/i.test(name),
);
if (prematureCompat.length) {
  throw new Error(`MINE-022 executable compatibility migration is forbidden before isolated staging rehearsal: ${prematureCompat.join(', ')}`);
}

console.log('PASS phase22_prod_baseline_compat_assertions');
console.log('design_gate=PASS');
console.log('runtime_dependency_markers=PASS');
console.log('rls_advisory_gate=PASS');
console.log('compatibility_migration_present=NO');
console.log('NOTE: canonical changed-file proof is performed by GitHub compare against PHASE21 closure outside shallow Render checkout.');
