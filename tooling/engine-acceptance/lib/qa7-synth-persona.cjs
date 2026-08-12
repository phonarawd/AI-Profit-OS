/**
 * QA7 — ensure approved synthetic persona row exists (tooling-only)
 * Never uses production customer identity.
 */
"use strict";

const path = require("node:path");
const { ROOT } = require("./hash-scope.cjs");
const { QA7_DEFAULT_SYNTH_USER_ID } = require("./qa7-env.cjs");

/**
 * @param {string} databaseUrl
 * @param {string} [userId]
 */
async function ensureQa7SyntheticUser(databaseUrl, userId) {
  const id = userId || QA7_DEFAULT_SYNTH_USER_ID;
  if (!databaseUrl) {
    const err = new Error("DATABASE_URL required for synthetic persona");
    err.code = "BLOCKED_NO_DB";
    throw err;
  }
  const pg = require(
    require.resolve("pg", { paths: [path.join(ROOT, "services/api-nest"), ROOT] }),
  );
  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 8000,
  });
  await client.connect();
  try {
    const existing = await client.query(
      `SELECT id::text AS id FROM public.users WHERE id = $1::uuid`,
      [id],
    );
    if (existing.rows[0]) {
      return { created: false, user_id: id };
    }
    const email = `qa7-synth+${id.slice(0, 8)}@qa-synth.local`;
    await client.query(
      `INSERT INTO public.users (id, email, status)
       VALUES ($1::uuid, $2, 'active')
       ON CONFLICT (id) DO NOTHING`,
      [id, email],
    );
    return { created: true, user_id: id };
  } finally {
    await client.end().catch(() => {});
  }
}

module.exports = {
  ensureQa7SyntheticUser,
};
