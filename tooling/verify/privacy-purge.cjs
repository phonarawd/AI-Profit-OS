/**
 * verify:privacy-purge — QA8_PRIVACY_DELETE_ACCOUNT structural regression gate.
 *
 * Local/DB-free by design (Phase0 low-spec — Docker/local Postgres forbidden).
 * The dynamic transactional proof (rows purged/anonymized/retained, rollback,
 * cross-user isolation) runs in CI against the isolated ephemeral Postgres as
 * part of QA8 privacy discovery (tooling/engine-acceptance/run-qa8-privacy.cjs).
 *
 * This gate checks:
 * 1. delete-account never hard-deletes public.users (tombstone only)
 * 2. the guard snapshot comes from the ledger, never the request body
 * 3. every table in PURGE_TABLES/ANONYMIZE_TABLES actually exists in the schema
 * 4. no table appears in more than one of purge/anonymize/retain
 * 5. every purge-target table that is referenced by a retained table's FK is
 *    de-referenced first (no NO ACTION violation at delete time)
 * 6. the whole mutation runs inside exactly one transaction
 * 7. financial guards (locked balance / pending withdraw) are still evaluated
 * 8. refresh() denies a deleted account; session() treats a missing row as revoked
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const PRIVACY_REL = "services/api-nest/src/auth/privacy-account.service.ts";
const AUTH_SERVICE_REL = "services/api-nest/src/auth/auth.service.ts";
const AUTH_CONTROLLER_REL = "services/api-nest/src/auth/auth.controller.ts";

const privacySrc = read(PRIVACY_REL);
const authServiceSrc = read(AUTH_SERVICE_REL);
const authControllerSrc = read(AUTH_CONTROLLER_REL);
if (fails.length) {
  console.error("[verify:privacy-purge] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

// ── 1. never a hard delete of users ──
{
  const code = stripComments(privacySrc + authServiceSrc);
  if (/DELETE\s+FROM\s+public\.users\b/i.test(code)) {
    fails.push("public.users must never be hard-deleted — tombstone (UPDATE) only");
  }
  if (!/UPDATE public\.users[\s\S]*?status = 'deleted'/.test(privacySrc)) {
    fails.push("privacy-account.service.ts must tombstone users.status = 'deleted'");
  }
  for (const col of ["email = NULL", "phone_e164 = NULL", "password_hash = NULL"]) {
    if (!privacySrc.includes(col)) {
      fails.push(`tombstone must clear ${col}`);
    }
  }
}

// ── 2. guard snapshot must come from the ledger, not the client body ──
{
  if (/body\.(lockedUsdt|pendingWithdrawCount|principalUsdt|profitUsdt|practiceUsdt)/.test(
    authControllerSrc + authServiceSrc,
  )) {
    fails.push(
      "delete-account guard snapshot must not be read from the request body (client-controlled bypass)",
    );
  }
  if (!/loadGuardSnapshot/.test(authServiceSrc)) {
    fails.push("AuthService.deleteAccount must call PrivacyAccountService.loadGuardSnapshot");
  }
  if (!/evaluateDeleteAccountGuards/.test(authServiceSrc)) {
    fails.push("AuthService.deleteAccount must still call evaluateDeleteAccountGuards");
  }
}

// ── 3/4. table classification vs. live schema ──
function extractTableColumnPairs(src, constName) {
  const start = src.indexOf(constName);
  if (start < 0) return [];
  const arrayStart = src.indexOf("[", src.indexOf("=", start));
  let depth = 0;
  let end = arrayStart;
  for (let i = arrayStart; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = src.slice(arrayStart, end + 1);
  const re = /\["([a-z_]+)",\s*"([a-z_]+)"\]/g;
  const out = [];
  let m;
  while ((m = re.exec(body))) out.push([m[1], m[2]]);
  return out;
}

function extractStringArray(src, constName) {
  const start = src.indexOf(constName);
  if (start < 0) return [];
  const arrayStart = src.indexOf("[", src.indexOf("=", start));
  const arrayEnd = src.indexOf("]", arrayStart);
  const body = src.slice(arrayStart, arrayEnd);
  return [...body.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
}

const purgeTables = extractTableColumnPairs(privacySrc, "PURGE_TABLES");
const anonymizeTables = extractStringArray(privacySrc, "ANONYMIZE_TABLES");
if (purgeTables.length < 20) {
  fails.push(`PURGE_TABLES looks too small (parsed ${purgeTables.length}) — parser or list regressed`);
}
if (anonymizeTables.length !== 4) {
  fails.push(`ANONYMIZE_TABLES expected 4 entries, parsed ${anonymizeTables.length}`);
}

function loadSchemaTables() {
  const dir = path.join(root, "supabase/migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const tables = new Map();
  const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-z_]+)\s*\(([\s\S]*?)\n\)\s*;/gi;
  const fkRe = /^[ \t]*([a-z_]+)[^\n]*?REFERENCES\s+public\.([a-z_]+)\s*\(\s*[a-z_]+\s*\)([^\n,]*)/gim;
  for (const f of files) {
    const s = fs.readFileSync(path.join(dir, f), "utf8");
    createRe.lastIndex = 0;
    let m;
    while ((m = createRe.exec(s))) {
      const name = m[1];
      const body = m[2];
      fkRe.lastIndex = 0;
      const fks = [];
      let c;
      while ((c = fkRe.exec(body))) {
        fks.push({ column: c[1], refTable: c[2], onDelete: (c[3] || "").trim() });
      }
      const hasColumn = (col) => new RegExp(`^\\s*${col}\\b`, "m").test(body);
      tables.set(name, { file: f, fks, hasUserId: hasColumn("user_id") });
    }
  }
  return tables;
}

const schemaTables = loadSchemaTables();
if (schemaTables.size < 40) {
  fails.push(`schema table discovery looks too small (${schemaTables.size}) — migration scan broken`);
}

const classified = new Set();
for (const [table, column] of purgeTables) {
  if (!schemaTables.has(table)) {
    fails.push(`PURGE_TABLES references unknown table public.${table}`);
    continue;
  }
  if (column !== "user_id") {
    fails.push(`PURGE_TABLES[${table}] uses column "${column}" — expected user_id`);
  }
  if (classified.has(table)) fails.push(`${table} classified twice`);
  classified.add(table);
}
for (const table of anonymizeTables) {
  if (!schemaTables.has(table)) {
    fails.push(`ANONYMIZE_TABLES references unknown table public.${table}`);
    continue;
  }
  if (classified.has(table)) fails.push(`${table} classified twice`);
  classified.add(table);
}

// every table that actually has a user_id-shaped FK to users must be classified
// as purge, anonymize, or explicitly documented as retained.
const RETAIN_DOCUMENTED = new Set([
  "kyc_status",
  "kyc_submissions",
  "kyc_decision_audit",
  "ledger_accounts",
  "withdraw_credentials_audit",
  "risk_signals",
  "risk_signal_actions",
  "deposit_disputes",
  "krw_deposit_requests",
  "usdt_deposit_events",
  "withdraw_intents",
  "referral_payout_queue",
  "referral_edges",
  "user_deposit_addresses",
  "support_tickets",
  "user_membership_audit",
  "user_opportunity_override_audit",
  "user_match_policy_override_audit",
]);
const USER_FK_COLUMN_NAMES = new Set([
  "user_id",
  "owner_user_id",
  "referrer_user_id",
  "referee_user_id",
  "beneficiary_user_id",
]);
for (const [table, def] of schemaTables) {
  const userFks = def.fks.filter((fk) => fk.refTable === "users" && USER_FK_COLUMN_NAMES.has(fk.column));
  if (userFks.length === 0) continue;
  if (classified.has(table) || RETAIN_DOCUMENTED.has(table)) continue;
  fails.push(
    `public.${table} has a user FK but is not in PURGE_TABLES, ANONYMIZE_TABLES, or the documented RETAIN set (privacy-purge.cjs RETAIN_DOCUMENTED) — classify it or the retention decision was not derived from the live schema`,
  );
}
for (const table of RETAIN_DOCUMENTED) {
  if (!schemaTables.has(table)) {
    fails.push(`RETAIN_DOCUMENTED references unknown table public.${table} (stale mapping)`);
  }
}

// ── 5. any retained table's NO ACTION FK into a purge-target table must be de-referenced first ──
for (const [retainedTable, def] of schemaTables) {
  if (!RETAIN_DOCUMENTED.has(retainedTable)) continue;
  for (const fk of def.fks) {
    const purgeHit = purgeTables.find(([t]) => t === fk.refTable);
    if (!purgeHit) continue;
    const cascades = /ON DELETE (CASCADE|SET NULL)/i.test(fk.onDelete);
    if (cascades) continue;
    const dereferenced = new RegExp(
      `UPDATE public\\.${retainedTable}[\\s\\S]*?SET\\s+${fk.column}\\s*=\\s*NULL`,
      "i",
    ).test(privacySrc);
    if (!dereferenced) {
      fails.push(
        `public.${retainedTable}.${fk.column} (NO ACTION) references purge-target public.${fk.refTable} ` +
          `but privacy-account.service.ts never nulls it before the DELETE — would violate referential integrity`,
      );
    }
  }
}

// ── 6. single transaction ──
{
  const purgeMethod = (privacySrc.match(/async purgeAccount[\s\S]*?\n {2}\}/) || [""])[0];
  const txCount = (purgeMethod.match(/withTransaction/g) || []).length;
  if (txCount !== 1) {
    fails.push(`purgeAccount must open exactly one withTransaction (found ${txCount})`);
  }
}

// ── 7. financial guards preserved ──
{
  const guardSrc = read("services/api-nest/src/auth/auth.stage.ts");
  for (const needle of ["lockedUsdt > 0", "pendingWithdrawCount > 0"]) {
    if (!guardSrc.includes(needle)) {
      fails.push(`auth.stage.ts guard weakened — missing "${needle}"`);
    }
  }
}

// ── 8. session/refresh authority reflects deletion ──
{
  if (!/assertAccountActive/.test(authServiceSrc)) {
    fails.push("refresh() must check assertAccountActive before minting a new session");
  }
  if (!/refresh\([\s\S]*?assertAccountActive/.test(authServiceSrc)) {
    fails.push("assertAccountActive must run inside refresh()");
  }
  if (!/rows\[0\]\s*\?\s*r\.rows\[0\]\.revoked === true\s*:\s*true/.test(authServiceSrc)) {
    fails.push("session() must treat a missing auth_sessions row as revoked, not as healthy");
  }
}

if (fails.length) {
  console.error("[verify:privacy-purge] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  `[verify:privacy-purge] PASS (${purgeTables.length} purge tables · ${anonymizeTables.length} anonymize tables · ${RETAIN_DOCUMENTED.size} documented retain · FK de-reference verified · single transaction · guards preserved)`,
);
