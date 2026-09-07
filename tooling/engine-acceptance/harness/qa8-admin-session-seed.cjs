/**
 * QA8 관리자 Bearer 가 제품 AdminGuard와 같게 통과하려면
 * admin_rbac + admin_sessions(access_jti) 행이 있어야 한다.
 * 가드 약화 금지. 시드는 격리 CI Postgres 만.
 */
"use strict";

const crypto = require("node:crypto");
const {
  SYNTH_ADMIN,
  SYNTH_ADMIN_INSUFFICIENT,
  ADMIN_ROLE_SUPER,
  ADMIN_ROLE_INSUFFICIENT,
  peekUnsignedJti,
} = require("../lib/synthetic-identity.cjs");
const { withClient } = require("./qa8-privacy-probe.cjs");

function peekJtiFallback(token) {
  if (typeof peekUnsignedJti === "function") return peekUnsignedJti(token);
  const parts = String(token || "").replace(/^Bearer\s+/i, "").split(".");
  if (parts.length < 2) return "";
  try {
    const json = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof json.jti === "string" ? json.jti : "";
  } catch {
    return "";
  }
}

async function upsertAdminIdentity(client, input) {
  await client.query(
    `INSERT INTO public.admin_rbac (admin_id, email, role, permissions, active)
     VALUES ($1::uuid, $2, $3, '{}', true)
     ON CONFLICT (admin_id) DO UPDATE
       SET email = EXCLUDED.email, role = EXCLUDED.role, active = true`,
    [input.adminId, input.email, input.role],
  );
  await client.query(
    `INSERT INTO public.admin_credentials (admin_id, username_canonical, password_hash)
     VALUES ($1::uuid, $2, 'qa-synth-harness-not-a-login')
     ON CONFLICT (admin_id) DO NOTHING`,
    [input.adminId, input.username],
  );
}

async function insertSessionForJti(client, adminId, accessJti) {
  if (!accessJti) {
    throw new Error("QA8 admin session seed missing access_jti");
  }
  const now = new Date();
  const expires = new Date(now.getTime() + 60 * 60 * 1000);
  const idle = new Date(now.getTime() + 30 * 60 * 1000);
  await client.query(
    `INSERT INTO public.admin_sessions (
       id, admin_id, family_id, access_jti, refresh_hash, kind,
       authenticator_assurance, issued_at, expires_at, last_seen_at,
       idle_deadline, step_up_at
     ) VALUES (
       $1::uuid, $2::uuid, $3::uuid, $4, $5, 'password_mfa', 'aal2',
       $6::timestamptz, $7::timestamptz, $6::timestamptz,
       $8::timestamptz, $6::timestamptz
     )
     ON CONFLICT (access_jti) DO NOTHING`,
    [
      crypto.randomUUID(),
      adminId,
      crypto.randomUUID(),
      accessJti,
      `qa-synth-refresh-${crypto.randomUUID()}`,
      now.toISOString(),
      expires.toISOString(),
      idle.toISOString(),
    ],
  );
}

/**
 * @param {string} databaseUrl
 * @param {Record<string, { userId?: string, authorization?: string|null, accessJti?: string }>} matrix
 */
async function seedAdminSessionsForQa8(databaseUrl, matrix) {
  if (!databaseUrl) {
    throw new Error("QA8 admin session seed requires isolated DATABASE_URL");
  }
  const superJtis = [
    matrix.admin && (matrix.admin.accessJti || peekJtiFallback(matrix.admin.authorization)),
    matrix.admin_super &&
      (matrix.admin_super.accessJti || peekJtiFallback(matrix.admin_super.authorization)),
  ].filter(Boolean);
  const marketingJti =
    matrix.admin_insufficient &&
    (matrix.admin_insufficient.accessJti ||
      peekJtiFallback(matrix.admin_insufficient.authorization));

  await withClient(databaseUrl, async (client) => {
    await upsertAdminIdentity(client, {
      adminId: SYNTH_ADMIN,
      email: "qa8-synth-super@example.invalid",
      role: ADMIN_ROLE_SUPER,
      username: "qa8synthsuper",
    });
    await upsertAdminIdentity(client, {
      adminId: SYNTH_ADMIN_INSUFFICIENT,
      email: "qa8-synth-mkt@example.invalid",
      role: ADMIN_ROLE_INSUFFICIENT,
      username: "qa8synthmkt",
    });
    for (const jti of superJtis) {
      await insertSessionForJti(client, SYNTH_ADMIN, jti);
    }
    if (marketingJti) {
      await insertSessionForJti(client, SYNTH_ADMIN_INSUFFICIENT, marketingJti);
    }
  });
  return {
    super_sessions: superJtis.length,
    marketing_sessions: marketingJti ? 1 : 0,
  };
}

module.exports = {
  seedAdminSessionsForQa8,
};
