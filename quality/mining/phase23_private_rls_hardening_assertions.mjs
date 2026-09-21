import fs from 'node:fs';

const DOC = 'governance/mining/MINE-023-PROD-PRIVATE-RLS-HARDENING.md';
const PRIOR = 'governance/mining/MINE-022-PROD-RLS-ADVISORY.md';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function must(text, marker, label) {
  if (!text.includes(marker)) throw new Error(`${label}: missing ${JSON.stringify(marker)}`);
}

const doc = read(DOC);
for (const marker of [
  'READ-ONLY AUDIT COMPLETE / HARDENING DESIGN LOCKED / STAGING REQUIRED / PRODUCTION UNTOUCHED',
  'anon`: no effective `SELECT`, `INSERT`, `UPDATE`, or `DELETE` table privilege',
  'authenticated`: no effective `SELECT`, `INSERT`, `UPDATE`, or `DELETE` table privilege',
  'no `USAGE` on schema `private`',
  'defense-in-depth hardening gap and future-grant hazard',
  'No public view was found',
  'private.putduk_bind_work_contract()',
  'private.putduk_materialize_work_items()',
  'SECURITY DEFINER',
  'BEFORE INSERT',
  'AFTER INSERT',
  'REVOKE ALL ON FUNCTION private.putduk_bind_work_contract() FROM PUBLIC;',
  'REVOKE ALL ON FUNCTION private.putduk_materialize_work_items() FROM PUBLIC;',
  'BLOCKER-PROD-PRIVATE-RLS-01',
  'NO CONFIRMED DIRECT CLIENT TABLE EXPOSURE',
  'not evidence of current unrestricted data access',
  '**Production untouched.**',
]) must(doc, marker, 'MINE-023');

const prior = read(PRIOR);
for (const marker of [
  'SUPERSEDED/CLARIFIED BY MINE-023',
  'no direct CRUD privileges',
  'no `USAGE` on schema `private`',
  'NO CONFIRMED DIRECT CLIENT TABLE EXPOSURE',
]) must(prior, marker, 'MINE-022 correction');

const migrationNames = fs.readdirSync('supabase/migrations');
const phase23Migration = migrationNames.filter((name) => /private.*rls.*hard|rls.*private.*hard|mine.*023/i.test(name));
if (phase23Migration.length) {
  throw new Error(`PHASE23 is design-only before isolated staging; migration found: ${phase23Migration.join(', ')}`);
}

console.log('PASS phase23_private_rls_hardening_assertions');
console.log('risk_classification=HARDENING_GAP_NOT_CONFIRMED_DIRECT_EXPOSURE');
console.log('client_direct_private_crud=DENIED_BY_CURRENT_GRANTS');
console.log('production_mutation=NONE');
console.log('phase23_migration_present=NO');
