#!/usr/bin/env node
/**
 * staging 에만 개인 관리자(비밀번호+TOTP)를 만든다.
 * production 거절. 비밀값을 stdout에 쓰지 않는다. .env 에만 적는다.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Client } = require("../../services/api-nest/node_modules/pg");
const { loadDotEnv, root } = require("../deploy/lib/env.cjs");

loadDotEnv();

const STAGING_SERVICE = "srv-dabph32fngtc73esj8rg";
const PRODUCTION_SERVICE = "srv-da5r1tqjobas73fl16dg";
const PRODUCTION_REF = "mgsytcetsiecllmhcyox";
const IDENTIFIER = "founder.ops";

function redact(err) {
  const msg = err && err.message ? String(err.message) : String(err);
  return msg
    .replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "postgres://redacted")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, "redacted@host");
}

function assertNotProductionUrl(url) {
  const host = new URL(url).hostname;
  if (host.includes(PRODUCTION_REF)) throw new Error("refused: production project");
}

async function renderJson(pathname) {
  const token = process.env.RENDER_API_KEY || "";
  if (!token) throw new Error("RENDER_API_KEY missing");
  const res = await fetch("https://api.render.com/v1" + pathname, {
    headers: { authorization: "Bearer " + token, accept: "application/json" },
  });
  if (!res.ok) throw new Error("render http " + res.status);
  return res.json();
}

function collectEnvVars(payload) {
  const out = {};
  for (const row of Array.isArray(payload) ? payload : []) {
    const ev = row && (row.envVar || row);
    if (ev && typeof ev.key === "string" && typeof ev.value === "string") {
      out[ev.key] = ev.value;
    }
  }
  return out;
}

async function stagingVars() {
  const serviceId = process.env.RENDER_STAGING_SERVICE_ID || STAGING_SERVICE;
  if (serviceId === PRODUCTION_SERVICE) throw new Error("refused: production service id");
  if (serviceId !== STAGING_SERVICE) throw new Error("refused: unknown service id");
  const vars = collectEnvVars(await renderJson("/services/" + serviceId + "/env-vars"));
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

function firstEmail() {
  const email = String(process.env.STAGING_ACCESS_ALLOWED_EMAILS || "")
    .split(/[,\s]+/)
    .map((x) => x.trim().toLowerCase())
    .find((x) => x.includes("@"));
  if (!email) throw new Error("STAGING_ACCESS_ALLOWED_EMAILS missing");
  return email;
}

function hashPassword(password) {
  const N = 131072;
  const r = 8;
  const p = 1;
  const keyLen = 64;
  const salt = crypto.randomBytes(16);
  return new Promise((resolve, reject) => {
    crypto.scrypt(Buffer.from(password, "utf8"), salt, keyLen, { N, r, p, maxmem: 256 * 1024 * 1024 }, (err, derived) => {
      if (err) reject(err);
      else {
        resolve(["scrypt", String(N), String(r), String(p), salt.toString("base64"), derived.toString("base64")].join("$"));
      }
    });
  });
}

function wrapKey(raw) {
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

function encryptTotpSecret(secret, rawWrap) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", wrapKey(rawWrap), iv);
  const enc = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

function generateTotpSecret() {
  const bytes = crypto.randomBytes(20);
  const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function generateBackupCodes() {
  const codes = [];
  while (codes.length < 8) {
    const raw = crypto.randomBytes(8).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    if (raw.length === 10) codes.push(raw);
  }
  return codes;
}

function hashBackup(code) {
  return crypto.createHash("sha256").update(code.trim().toUpperCase(), "utf8").digest("hex");
}

function upsertEnv(pairs) {
  const envPath = path.join(root, ".env");
  let text = fs.readFileSync(envPath, "utf8");
  if (!text.endsWith("\n")) text += "\n";
  for (const [key, value] of Object.entries(pairs)) {
    const line = key + "=" + value;
    const re = new RegExp("^" + key + "=.*$", "m");
    if (re.test(text)) text = text.replace(re, line);
    else text += line + "\n";
  }
  fs.writeFileSync(envPath, text);
}

async function main() {
  const { url, wrap } = await stagingVars();
  const email = firstEmail();
  const password = crypto.randomBytes(18).toString("base64url");
  const totp = generateTotpSecret();
  const backups = generateBackupCodes();
  const passwordHash = await hashPassword(password);
  const totpCipher = encryptTotpSecret(totp, wrap);

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const existing = await client.query(
      "select admin_id from public.admin_credentials where username_canonical = $1",
      [IDENTIFIER],
    );
    if (existing.rowCount > 0 && process.env.STAGING_ADMIN_RESET !== "1") {
      throw new Error("founder.ops already exists (set STAGING_ADMIN_RESET=1 to rotate)");
    }

    await client.query("begin");
    const byEmail = await client.query("select admin_id from public.admin_rbac where lower(email) = $1", [email]);
    const adminId = byEmail.rows[0]?.admin_id || crypto.randomUUID();
    await client.query(
      `insert into public.admin_rbac (admin_id, email, role, permissions, active)
       values ($1::uuid, $2, 'super', '{}', true)
       on conflict (admin_id) do update
         set email = excluded.email, role = 'super', active = true, updated_at = now()`,
      [adminId, email],
    );
    await client.query(
      `insert into public.admin_credentials (admin_id, username_canonical, password_hash)
       values ($1::uuid, $2, $3)
       on conflict (admin_id) do update
         set username_canonical = excluded.username_canonical,
             password_hash = excluded.password_hash,
             failed_attempts = 0,
             locked_until = null,
             password_changed_at = now(),
             updated_at = now()`,
      [adminId, IDENTIFIER, passwordHash],
    );
    await client.query(
      `insert into public.admin_totp (admin_id, secret_ciphertext)
       values ($1::uuid, $2)
       on conflict (admin_id) do update
         set secret_ciphertext = excluded.secret_ciphertext, enrolled_at = now()`,
      [adminId, totpCipher],
    );
    await client.query("delete from public.admin_backup_codes where admin_id = $1::uuid", [adminId]);
    for (const code of backups) {
      await client.query(
        "insert into public.admin_backup_codes (admin_id, code_hash) values ($1::uuid, $2)",
        [adminId, hashBackup(code)],
      );
    }
    await client.query("commit");
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    await client.end();
  }

  upsertEnv({
    STAGING_ADMIN_IDENTIFIER: IDENTIFIER,
    STAGING_ADMIN_PASSWORD: password,
    STAGING_ADMIN_TOTP_SECRET: totp,
    STAGING_ADMIN_BACKUP_CODES: backups.join(","),
  });

  process.stdout.write(
    JSON.stringify(
      {
        target: "staging-render-service",
        productionApply: 0,
        identifier: IDENTIFIER,
        secretsWrittenToDotEnv: ["STAGING_ADMIN_PASSWORD", "STAGING_ADMIN_TOTP_SECRET", "STAGING_ADMIN_BACKUP_CODES"],
        totpIssuer: "퍼뜩-staging",
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((err) => {
  process.stderr.write("[provision-staging-admin] FAIL: " + redact(err) + "\n");
  process.exit(1);
});
