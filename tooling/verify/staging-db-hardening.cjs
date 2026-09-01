/**
 * verify:staging-db-hardening
 * 스테이징 전용 SQL만 검사한다. Production apply/GRANT 변경 0.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const audit = read("supabase/staging/20260901120000_admin_audit_append_only.sql");
const push = read("supabase/staging/20260901120100_push_rls.sql");
const acl = read("supabase/staging/20260901120200_default_acl.sql");
const design = read("governance/db-recon/staging-hardening.v1.json");

for (const [rel, body] of [
  ["admin_audit", audit],
  ["push_rls", push],
  ["default_acl", acl],
]) {
  if (!body.includes("STAGING / NON-PRODUCTION ONLY")) {
    fails.push(rel + " must be marked staging-only");
  }
  if (!body.includes("APPLY_THIS_SLICE = NO")) {
    fails.push(rel + " must set APPLY_THIS_SLICE = NO");
  }
}

if (!audit.includes("REVOKE UPDATE, DELETE, TRUNCATE")) {
  fails.push("audit SQL must revoke UPDATE/DELETE/TRUNCATE from service_role");
}
if (!audit.includes("GRANT SELECT, INSERT ON TABLE public.admin_audit_events TO service_role")) {
  fails.push("audit SQL must grant only SELECT, INSERT to service_role");
}
if (!audit.includes("BEFORE TRUNCATE")) {
  fails.push("audit SQL must forbid TRUNCATE");
}

if (!push.includes("ENABLE ROW LEVEL SECURITY")) {
  fails.push("push SQL must enable RLS");
}
if (!push.includes("FORCE ROW LEVEL SECURITY")) {
  fails.push("push SQL must force RLS");
}
if (!push.includes("USING (false)") || !push.includes("WITH CHECK (false)")) {
  fails.push("push SQL must deny anon/authenticated");
}
if (/ENABLE ROW LEVEL SECURITY/.test(push) && !push.includes("CREATE POLICY")) {
  fails.push("push SQL must not enable RLS without policies");
}

const pushNorm = push.replace(/\s+/g, " ");
if (!/REVOKE ALL ON TABLE public\.push_control FROM service_role/.test(pushNorm)) {
  fails.push("push SQL must revoke existing service_role grants on push_control before new grants");
}
if (!/REVOKE ALL ON TABLE public\.push_subscriptions FROM service_role/.test(pushNorm)) {
  fails.push("push SQL must revoke existing service_role grants on push_subscriptions before new grants");
}
const controlRevokeIdx = pushNorm.indexOf("REVOKE ALL ON TABLE public.push_control FROM service_role");
const controlGrantIdx = pushNorm.indexOf("GRANT SELECT, UPDATE ON TABLE public.push_control TO service_role");
if (controlRevokeIdx < 0 || controlGrantIdx < 0 || controlRevokeIdx > controlGrantIdx) {
  fails.push("push_control service_role REVOKE ALL must precede the exact SELECT, UPDATE grant");
}
if (/GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.push_control/.test(pushNorm)) {
  fails.push("old broad push_control DML grant must not survive");
}
if (/GRANT ALL ON TABLE public\.push_control/.test(pushNorm) || /GRANT ALL ON TABLE public\.push_subscriptions/.test(pushNorm)) {
  fails.push("push SQL must not grant ALL to service_role");
}
if (!/GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.push_subscriptions TO service_role/.test(pushNorm)) {
  fails.push("push_subscriptions must grant exactly SELECT, INSERT, UPDATE, DELETE");
}
if (/GRANT[^;]*TRUNCATE[^;]*push_control/.test(pushNorm) || /GRANT[^;]*REFERENCES[^;]*push_/.test(pushNorm) || /GRANT[^;]*TRIGGER[^;]*push_/.test(pushNorm)) {
  fails.push("push SQL must not grant TRUNCATE/REFERENCES/TRIGGER");
}
if (/GRANT[^;]*INSERT[^;]*push_control/.test(pushNorm) || /GRANT[^;]*DELETE[^;]*push_control/.test(pushNorm)) {
  fails.push("push_control must not grant INSERT or DELETE");
}

if (!acl.includes("ALTER DEFAULT PRIVILEGES FOR ROLE postgres")) {
  fails.push("default ACL SQL must cover postgres-owned future public objects");
}
if (!acl.includes("ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin")) {
  fails.push("default ACL SQL must cover supabase_admin-owned future public objects");
}
if (!acl.includes("REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated")) {
  fails.push("default ACL SQL must revoke PUBLIC/anon/authenticated defaults");
}

if (fs.existsSync(path.join(root, "supabase/migrations/20260901120000_admin_audit_append_only.sql"))) {
  fails.push("staging hardening must not sit in supabase/migrations (production apply path)");
}

if (design) {
  try {
    const json = JSON.parse(design);
    if (json.production_apply !== 0) fails.push("staging-hardening.v1.json production_apply must be 0");
    if (json.production_db_mutation !== 0) {
      fails.push("staging-hardening.v1.json production_db_mutation must be 0");
    }
  } catch (err) {
    fails.push("staging-hardening.v1.json invalid JSON: " + err.message);
  }
}

if (fails.length) {
  console.error("[verify:staging-db-hardening] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log("[verify:staging-db-hardening] PASS (STATIC_VERIFIER_PASS · production apply 0)");
