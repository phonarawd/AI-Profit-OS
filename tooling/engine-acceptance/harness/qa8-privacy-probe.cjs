/**
 * QA8 dynamic privacy/operator-identity DB probes — harness only · 제품 mutation 0.
 *
 * Direct SQL against the SAME isolated CI Postgres run-qa8-adversarial.cjs
 * already boots (never a shared/production database — the caller is
 * responsible for having passed kill-switch.assertDbTarget first, exactly
 * like harness/ci-postgres.cjs's existing seedSyntheticUsers).
 */
"use strict";

const path = require("node:path");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const { ROOT } = require("../lib/hash-scope.cjs");

const nestRequire = createRequire(path.join(ROOT, "services/api-nest/package.json"));

function loadPg() {
  return nestRequire("pg");
}

async function withClient(databaseUrl, fn) {
  const { Client } = loadPg();
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 8_000 });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Creates a fresh synthetic user with one PURGE-classified row
 * (notification_prefs) and one RETAIN-classified row (kyc_status) so a
 * subsequent delete-account call has something real to purge/retain.
 */
async function provisionPrivacyTestUser(databaseUrl, opts = {}) {
  const userId = opts.userId || crypto.randomUUID();
  const email = opts.email || `qa-synth-privacy-${userId.slice(0, 8)}@example.invalid`;
  await withClient(databaseUrl, async (client) => {
    await client.query(
      `INSERT INTO public.users (id, email, status) VALUES ($1::uuid, $2, 'active')
       ON CONFLICT (id) DO NOTHING`,
      [userId, email],
    );
    try {
      await client.query("SELECT public.provision_user_bucket_accounts($1::uuid)", [userId]);
    } catch {
      /* optional RPC — absence must not block the privacy proof itself */
    }
    await client.query(
      `INSERT INTO public.notification_prefs (user_id) VALUES ($1::uuid)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
    await client.query(
      `INSERT INTO public.kyc_status (user_id, kyc_status) VALUES ($1::uuid, 'none')
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
  });
  return { userId, email };
}

async function snapshotPrivacyUser(databaseUrl, userId) {
  return withClient(databaseUrl, async (client) => {
    const userRow = await client.query(
      `SELECT status, email, phone_e164, password_hash FROM public.users WHERE id = $1::uuid`,
      [userId],
    );
    const prefs = await client.query(
      `SELECT count(*)::int AS n FROM public.notification_prefs WHERE user_id = $1::uuid`,
      [userId],
    );
    const kyc = await client.query(
      `SELECT count(*)::int AS n FROM public.kyc_status WHERE user_id = $1::uuid`,
      [userId],
    );
    const sessions = await client.query(
      `SELECT count(*)::int AS n FROM public.auth_sessions WHERE user_id = $1::uuid`,
      [userId],
    );
    return {
      user: userRow.rows[0] || null,
      notification_prefs_count: prefs.rows[0] ? prefs.rows[0].n : 0,
      kyc_status_count: kyc.rows[0] ? kyc.rows[0].n : 0,
      auth_sessions_count: sessions.rows[0] ? sessions.rows[0].n : 0,
    };
  });
}

/** Reads the DB-persisted operator id an admin_balance_adjust journal actually recorded. */
async function queryLedgerCreatedBy(databaseUrl, referenceId) {
  return withClient(databaseUrl, async (client) => {
    const r = await client.query(
      `SELECT created_by FROM public.ledger_journals
        WHERE reference_type = 'admin_balance_adjust' AND reference_id = $1
        ORDER BY created_at DESC LIMIT 1`,
      [String(referenceId)],
    );
    return r.rows[0] ? r.rows[0].created_by : null;
  });
}

module.exports = {
  provisionPrivacyTestUser,
  snapshotPrivacyUser,
  queryLedgerCreatedBy,
  withClient,
};
