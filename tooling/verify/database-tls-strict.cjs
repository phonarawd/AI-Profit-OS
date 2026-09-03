"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const pg = read("services/api-nest/src/db/postgres.ts");
const env = read("services/api-nest/src/config/phase0.env.ts");
const example = read(".env.example");
const gate = read(".github/workflows/gate.yml");

for (const needle of [
  "databaseSslCaPem",
  "DATABASE_SSL_CA_PEM required for Supabase database TLS verification",
  'host.endsWith(".pooler.supabase.com")',
  'host.startsWith("db.") && host.endsWith(".supabase.co")',
  "rejectUnauthorized: true",
  "DATABASE_SSL_QUERY_PARAMS",
  'parsed.searchParams.delete(key)',
]) {
  if (!pg.includes(needle)) fails.push("postgres TLS guard missing: " + needle);
}

if (pg.includes("rejectUnauthorized: false")) {
  fails.push("rejectUnauthorized=false forbidden for database TLS");
}
if (/sslmode\s*=\s*no-verify/i.test(pg)) {
  fails.push("sslmode=no-verify forbidden in database runtime source");
}
if (/^DATABASE_URL=.*sslmode=no-verify/im.test(example)) {
  fails.push("sslmode=no-verify forbidden in DATABASE_URL example");
}
if (!env.includes('databaseSslCaPem: read("DATABASE_SSL_CA_PEM")')) {
  fails.push("phase0 env missing DATABASE_SSL_CA_PEM");
}
if (!example.includes("pooler.supabase.com:5432/postgres")) {
  fails.push("env example must use Supavisor session mode 5432 for persistent Nest");
}
if (!example.includes("DATABASE_SSL_CA_PEM=YOUR_SUPABASE_SERVER_ROOT_CA_PEM")) {
  fails.push("env example missing Supabase root CA contract");
}
if (!gate.includes("pnpm verify:database-tls-strict")) {
  fails.push("gate missing database TLS verifier");
}

if (fails.length) {
  console.error("[verify:database-tls-strict] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log("[verify:database-tls-strict] PASS (Supabase direct+pooler · trusted CA required · hostname verified · no TLS bypass)");
