"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("../../../services/api-nest/node_modules/pg");
const { root } = require("../../deploy/lib/env.cjs");
const cry = require("./provision-j0-crypto.cjs");
const STAGING_SERVICE = "srv-dabph32fngtc73esj8rg";
const PRODUCTION_SERVICE = "srv-da5r1tqjobas73fl16dg";
const PRODUCTION_REF = "mgsytcetsiecllmhcyox";

function assertNotProductionUrl(url) {
  if (new URL(url).hostname.includes(PRODUCTION_REF)) throw new Error("refused: production project");
}

async function stagingVars() {
  const serviceId = process.env.RENDER_STAGING_SERVICE_ID || STAGING_SERVICE;
  if (serviceId === PRODUCTION_SERVICE) throw new Error("refused: production service id");
  if (serviceId !== STAGING_SERVICE) throw new Error("refused: unknown service id");
  const token = process.env.RENDER_API_KEY || "";
  if (!token) throw new Error("RENDER_API_KEY missing");
  const res = await fetch("https://api.render.com/v1/services/" + serviceId + "/env-vars", {
    headers: { authorization: "Bearer " + token, accept: "application/json" },
  });
  if (!res.ok) throw new Error("render http " + res.status);
  const payload = await res.json();
  const vars = {};
  for (const row of Array.isArray(payload) ? payload : []) {
    const ev = row && (row.envVar || row);
    if (ev && typeof ev.key === "string" && typeof ev.value === "string") vars[ev.key] = ev.value;
  }
  const url = vars.DATABASE_URL || vars.DIRECT_URL || "";
  if (!url) throw new Error("staging DATABASE_URL missing");
  assertNotProductionUrl(url);
  const wrap = vars.ADMIN_TOTP_WRAP_KEY || vars.JWT_ADMIN_SECRET || "";
  if (!wrap || wrap.length < 32) throw new Error("staging TOTP wrap key missing");
  return {
    url: url.replace(":6543/", ":5432/").replace("?pgbouncer=true", "").replace("&pgbouncer=true", ""),
    wrap,
  };
}

function upsertEnv(pairs) {
  const envPath = path.join(root, ".env");
  let text = fs.readFileSync(envPath, "utf8");
  if (!text.endsWith("\n")) text += "\n";
  for (const [key, value] of Object.entries(pairs)) {
    const line = key + "=" + value;
    const re = new RegExp("^" + key + "=.*$", "m");
    if (re.test(text)) text = text.replace(re, () => line);
    else text += line + "\n";
  }
  fs.writeFileSync(envPath, text);
}

const ACCOUNTS = [
  { key: "MAKER", id: "j0maker.ops", role: "super", active: true, email: "j0maker.ops@invalid.hiptk" },
  { key: "CHECKER", id: "j0checker.ops", role: "super", active: true, email: "j0checker.ops@invalid.hiptk" },
  { key: "VIEWER", id: "j0viewer.ops", role: "cs", active: true, email: "j0viewer.ops@invalid.hiptk" },
  { key: "IDLE", id: "j0idle.ops", role: "cs", active: false, email: "j0idle.ops@invalid.hiptk" },
];

async function upsertAdmin(client, wrap, acc, reset) {
  const existing = await client.query(
    "select admin_id from public.admin_credentials where username_canonical = $1",
    [acc.id],
  );
  if (existing.rowCount > 0 && !reset) return { reused: true, adminId: existing.rows[0].admin_id };
  const password = cry.randomPassword();
  const totp = cry.generateTotpSecret();
  const backups = cry.generateBackupCodes();
  const passwordHash = await cry.hashPassword(password);
  const totpCipher = cry.encryptTotpSecret(totp, wrap);
  const adminId = existing.rows[0]?.admin_id || crypto.randomUUID();
  await client.query(
    `insert into public.admin_rbac (admin_id, email, role, permissions, active)
     values ($1::uuid, $2, $3, '{}', $4)
     on conflict (admin_id) do update
       set email = excluded.email, role = excluded.role, active = excluded.active, updated_at = now()`,
    [adminId, acc.email, acc.role, acc.active],
  );
  await client.query(
    `insert into public.admin_credentials (admin_id, username_canonical, password_hash)
     values ($1::uuid, $2, $3)
     on conflict (admin_id) do update
       set username_canonical = excluded.username_canonical, password_hash = excluded.password_hash,
           failed_attempts = 0, locked_until = null, password_changed_at = now(), updated_at = now()`,
    [adminId, acc.id, passwordHash],
  );
  await client.query(
    `insert into public.admin_totp (admin_id, secret_ciphertext)
     values ($1::uuid, $2)
     on conflict (admin_id) do update set secret_ciphertext = excluded.secret_ciphertext, enrolled_at = now()`,
    [adminId, totpCipher],
  );
  await client.query("delete from public.admin_backup_codes where admin_id = $1::uuid", [adminId]);
  for (const code of backups) {
    await client.query("insert into public.admin_backup_codes (admin_id, code_hash) values ($1::uuid, $2)", [
      adminId,
      cry.hashBackup(code),
    ]);
  }
  const prefix = "STAGING_J0_" + acc.key;
  const pairs = {};
  pairs[prefix + "_IDENTIFIER"] = acc.id;
  pairs[prefix + "_PASSWORD"] = password;
  pairs[prefix + "_TOTP_SECRET"] = totp;
  pairs[prefix + "_BACKUP_CODES"] = backups.join(",");
  upsertEnv(pairs);
  return { reused: false, adminId };
}

async function main() {
  if (process.env.STAGING_ADMIN_RESET === "1") throw new Error("refused: will not rotate founder.ops");
  const { url, wrap } = await stagingVars();
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const created = [];
  const reused = [];
  try {
    await client.query("begin");
    for (const acc of ACCOUNTS) {
      const out = await upsertAdmin(client, wrap, acc, process.env.STAGING_J0_RESET === "1");
      (out.reused ? reused : created).push(acc.id);
    }
    await client.query("commit");
  } catch (err) {
    try { await client.query("rollback"); } catch { /* ignore */ }
    throw err;
  } finally {
    await client.end();
  }
  process.stdout.write(JSON.stringify({
    target: "staging-render-db",
    productionApply: 0,
    founderOpsRotated: false,
    created,
    reused,
    roles: { j0maker: "super", j0checker: "super", j0viewer: "cs", j0idle: "cs-inactive" },
  }, null, 2) + "\n");
}


module.exports = { main, STAGING_SERVICE, PRODUCTION_SERVICE };
