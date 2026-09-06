/**
 * Bootstrap one personal admin (not a shared operator name).
 * Reads ADMIN_PROVISION_* from the environment. Never prints the secret phrase.
 */
"use strict";

const { createHash, randomBytes } = require("node:crypto");
const { Client } = require("pg");

function readEnv(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : "";
}

function fail(message) {
  process.stderr.write(message + "\n");
  process.exit(1);
}

const email = readEnv("ADMIN_PROVISION_EMAIL");
const username = readEnv("ADMIN_PROVISION_USERNAME").toLowerCase();
const secret = readEnv("ADMIN_PROVISION_SECRET");
const role = readEnv("ADMIN_PROVISION_ROLE") || "super";
const databaseUrl = readEnv("DATABASE_URL");

const reserved = new Set([
  "admin",
  "root",
  "operator",
  "administrator",
  "superadmin",
  "super",
  "ops",
  "system",
]);

if (!databaseUrl) fail("DATABASE_URL missing");
if (!email || !username || !secret) fail("ADMIN_PROVISION_EMAIL/USERNAME/SECRET missing");
if (reserved.has(username)) fail("shared operator name forbidden");
if (secret.length < 12) fail("secret too short");

async function scryptHash(plain) {
  const { scrypt } = require("node:crypto");
  const salt = randomBytes(16);
  const derived = await new Promise((resolve, reject) => {
    scrypt(Buffer.from(plain, "utf8"), salt, 64, {
      N: 131072,
      r: 8,
      p: 1,
      maxmem: 256 * 1024 * 1024,
    }, (err, key) => (err ? reject(err) : resolve(key)));
  });
  return ["scrypt", "131072", "8", "1", salt.toString("base64"), derived.toString("base64")].join("$");
}

function wrapKey() {
  const raw = readEnv("ADMIN_TOTP_WRAP_KEY") || readEnv("JWT_ADMIN_SECRET");
  if (raw.length < 32) fail("ADMIN_TOTP_WRAP_KEY or JWT_ADMIN_SECRET required");
  return createHash("sha256").update(raw, "utf8").digest();
}

function encryptSecret(plain) {
  const { createCipheriv } = require("node:crypto");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", wrapKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

function totpSecret() {
  const bytes = randomBytes(20);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += alphabet[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

async function main() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  const passwordHash = await scryptHash(secret);
  const secret32 = totpSecret();
  const backups = [];
  while (backups.length < 8) {
    const raw = randomBytes(8).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    if (raw.length === 10) backups.push(raw);
  }
  try {
    await client.query("BEGIN");
    const rbac = await client.query(
      `INSERT INTO public.admin_rbac (admin_id, email, role, permissions, active)
       VALUES (gen_random_uuid(), $1, $2, '{}', true)
       ON CONFLICT (email) DO UPDATE SET role = excluded.role, active = true, updated_at = now()
       RETURNING admin_id`,
      [email, role],
    );
    const adminId = rbac.rows[0].admin_id;
    await client.query(
      `INSERT INTO public.admin_credentials (admin_id, username_canonical, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (admin_id) DO UPDATE
         SET username_canonical = excluded.username_canonical,
             password_hash = excluded.password_hash,
             password_changed_at = now(),
             updated_at = now()`,
      [adminId, username, passwordHash],
    );
    await client.query(
      `INSERT INTO public.admin_totp (admin_id, secret_ciphertext)
       VALUES ($1, $2)
       ON CONFLICT (admin_id) DO UPDATE
         SET secret_ciphertext = excluded.secret_ciphertext, enrolled_at = now()`,
      [adminId, encryptSecret(secret32)],
    );
    await client.query(`DELETE FROM public.admin_backup_codes WHERE admin_id = $1`, [adminId]);
    for (const code of backups) {
      await client.query(
        `INSERT INTO public.admin_backup_codes (admin_id, code_hash)
         VALUES ($1, $2)`,
        [adminId, createHash("sha256").update(code, "utf8").digest("hex")],
      );
    }
    await client.query("COMMIT");
    process.stdout.write("admin_id=" + adminId + "\n");
    process.stdout.write("username=" + username + "\n");
    process.stdout.write("totp=" + secret32 + "\n");
    process.stdout.write("backup=" + backups.join(",") + "\n");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    fail(err instanceof Error ? err.message : "provision failed");
  } finally {
    await client.end();
  }
}

main();
