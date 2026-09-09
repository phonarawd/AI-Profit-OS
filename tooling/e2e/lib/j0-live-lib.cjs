/** J0 live 공용 헬퍼. 비밀값을 stdout 에 쓰지 않는다. */
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { loadDotEnv, root } = require("../../deploy/lib/env.cjs");
const hosts = require("./j0-live-hosts.cjs");

loadDotEnv();

const EVIDENCE_REL = "governance/release-master/J0-LIVE.v1.json";

function redact(value) {
  return String(value || "")
    .replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "postgres://redacted")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, "redacted@host")
    .replace(/[A-Za-z0-9_-]{20,}/g, "[redacted]");
}

function workspaceHead() {
  return spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).stdout.trim();
}

function accessHeaders() {
  const id = String(process.env.CF_ACCESS_CLIENT_ID || "").trim();
  const secret = String(process.env.CF_ACCESS_CLIENT_SECRET || "").trim();
  if (!id || !secret) return {};
  return {
    "CF-Access-Client-Id": id,
    "CF-Access-Client-Secret": secret,
  };
}

function hasAccessServiceToken() {
  return Object.keys(accessHeaders()).length === 2;
}

async function fetchRaw(url, init) {
  const headers = Object.assign({}, accessHeaders(), init && init.headers);
  const res = await fetch(url, Object.assign({}, init, { headers, redirect: "manual" }));
  const text = await res.text();
  return { res, text };
}

function parseSetCookies(res) {
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const jar = {};
  for (const line of raw) {
    const pair = String(line).split(";")[0];
    const i = pair.indexOf("=");
    if (i < 1) continue;
    jar[pair.slice(0, i).trim()] = pair.slice(i + 1);
  }
  return jar;
}

function mergeJar(base, extra) {
  return Object.assign({}, base || {}, extra || {});
}

function cookieHeader(jar) {
  return Object.entries(jar || {})
    .filter(([, v]) => v)
    .map(([k, v]) => k + "=" + v)
    .join("; ");
}

function looksLikeSecretLeak(text) {
  const s = String(text || "");
  if (/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/.test(s)) return true;
  if (/STAGING_ADMIN_|STAGING_J0_|CF_ACCESS_CLIENT_SECRET|TOTP|backup/i.test(s)) {
    return true;
  }
  return false;
}

function totp(secret) {
  const key = base32Decode(String(secret || "").replace(/\s+/g, "").toUpperCase());
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const off = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(off) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

function base32Decode(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of input) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

async function stagingHealth() {
  const { res, text } = await fetchRaw(hosts.STAGING_API + "/api/v1/health", {
    headers: { accept: "application/json" },
  });
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = {};
  }
  return {
    ok: res.status === 200 && json.ok === true,
    status: res.status,
    env: json.environment || json.env || "",
    gitSha: String(json.gitSha || json.sha || "").toLowerCase(),
    migrationHead: String(json.migrationHead || ""),
    dbOk: json.db === "ok" || json.dbOk === true || (json.db && json.db.ok === true),
    redisOk: json.redis === "ok" || json.redisOk === true || (json.redis && json.redis.ok === true),
  };
}

function shaAligned(workspaceSha, stagingSha) {
  const a = String(workspaceSha || "").toLowerCase();
  const b = String(stagingSha || "").toLowerCase();
  if (!a || !b) return false;
  return a === b || a.startsWith(b) || b.startsWith(a.slice(0, 8));
}

function writeEvidence(payload) {
  const abs = path.join(root, EVIDENCE_REL);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(payload, null, 2) + "\n");
}

module.exports = {
  EVIDENCE_REL,
  hosts,
  root,
  redact,
  workspaceHead,
  accessHeaders,
  hasAccessServiceToken,
  fetchRaw,
  parseSetCookies,
  mergeJar,
  cookieHeader,
  looksLikeSecretLeak,
  totp,
  stagingHealth,
  shaAligned,
  writeEvidence,
};
