/**
 * verify:auth-jwt-runtime — Engine Final Re-Verification Audit P0-1
 * Real JWT sign/verify/tamper/expiry/issuer/audience round-trip against
 * jwt.core.cjs (no shape-only checks), a real Nest+HTTP boot of
 * JwtAuthGuard (jwt-guard.selftest.ts, no DB/Redis needed), plus regression
 * guards that the 6 session-protected controllers stay wired to it and that
 * AuthService never reverts to the old hardcoded fake-identity skeleton.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "services/api-nest/jwt.core.cjs",
  "services/api-nest/src/auth/jwt-auth.guard.ts",
  "services/api-nest/src/auth/jwt-guard.selftest.ts",
  "services/api-nest/src/auth/auth.service.ts",
  "services/api-nest/src/auth/auth.controller.ts",
  "services/api-nest/src/opportunities/opportunities.user.controller.ts",
  "services/api-nest/src/trades/trades.user.controller.ts",
  "services/api-nest/src/membership/membership.user.controller.ts",
  "services/api-nest/src/missions/benefits.user.controller.ts",
  "services/api-nest/src/referral/referral.controller.ts",
  "services/api-nest/src/ai/coach.controller.ts",
];
for (const f of files) mustExist(f);
if (fails.length) {
  console.error("[verify:auth-jwt-runtime] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

// ── 1. Real crypto round-trip against jwt.core.cjs (no shape-only checks) ──
const jwtCore = require(path.join(root, "services/api-nest/jwt.core.cjs"));
const SECRET = "verify_script_secret_at_least_32_chars_ok";
const ISSUER = "ai-profit-os-nest";
const AUDIENCE = "peotteok-user";

function expectThrow(name, fn) {
  try {
    fn();
    fails.push(`${name}: expected throw, got success`);
  } catch {
    /* expected */
  }
}

const token = jwtCore.sign({ sub: "user-1" }, SECRET, {
  issuer: ISSUER,
  audience: AUDIENCE,
  expiresInSec: 900,
});
const payload = jwtCore.verify(token, SECRET, {
  issuer: ISSUER,
  audience: AUDIENCE,
});
if (payload.sub !== "user-1") fails.push("jwt.core: sub round-trip mismatch");

const [h, b, s] = token.split(".");
const tampered = `${h}.${b}.${s.slice(0, -2)}${s.slice(-2) === "AA" ? "BB" : "AA"}`;
expectThrow("tampered signature must throw", () =>
  jwtCore.verify(tampered, SECRET, { issuer: ISSUER, audience: AUDIENCE }),
);

const expired = jwtCore.sign({ sub: "user-1" }, SECRET, {
  issuer: ISSUER,
  audience: AUDIENCE,
  expiresInSec: 1,
  nowMs: Date.now() - 60_000,
});
expectThrow("expired token must throw", () =>
  jwtCore.verify(expired, SECRET, { issuer: ISSUER, audience: AUDIENCE }),
);

const wrongIssuer = jwtCore.sign({ sub: "user-1" }, SECRET, {
  issuer: "someone-else",
  audience: AUDIENCE,
  expiresInSec: 900,
});
expectThrow("wrong issuer must throw", () =>
  jwtCore.verify(wrongIssuer, SECRET, { issuer: ISSUER, audience: AUDIENCE }),
);

const wrongAudience = jwtCore.sign({ sub: "user-1" }, SECRET, {
  issuer: ISSUER,
  audience: "someone-else-aud",
  expiresInSec: 900,
});
expectThrow("wrong audience must throw", () =>
  jwtCore.verify(wrongAudience, SECRET, { issuer: ISSUER, audience: AUDIENCE }),
);

expectThrow("wrong secret must throw", () =>
  jwtCore.verify(token, "different_secret_but_still_32_chars_ok", {
    issuer: ISSUER,
    audience: AUDIENCE,
  }),
);
expectThrow("short secret must throw (fail-closed, no weak default)", () =>
  jwtCore.sign({ sub: "user-1" }, "too_short", {
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresInSec: 900,
  }),
);
expectThrow("malformed token must throw", () =>
  jwtCore.verify("not-a-jwt", SECRET, { issuer: ISSUER, audience: AUDIENCE }),
);

// ── 2. Guard must fail-closed + populate req.user (source-level contract) ──
const guard = read("services/api-nest/src/auth/jwt-auth.guard.ts");
for (const needle of [
  "implements CanActivate",
  "UnauthorizedException",
  "AUTH_REQUIRED",
  "httpReq.user",
  "jwtCore.verify",
  "USER_JWT_ISSUER",
  "USER_JWT_AUDIENCE",
]) {
  if (!guard.includes(needle)) {
    fails.push(`jwt-auth.guard.ts missing: ${needle}`);
  }
}
if (!/env\.jwtUserSecret/.test(guard)) {
  fails.push("jwt-auth.guard.ts must read JWT_USER_SECRET from phase0 env (no hardcoded secret)");
}

// ── 3. AuthService must no longer hardcode fake identities (regression) ──
const svc = read("services/api-nest/src/auth/auth.service.ts");
for (const bad of [
  'userId: "pending-user"',
  'userId: "anonymous"',
  'sessionId: "pending-session"',
  'sessionId: "skeleton"',
  'status: "skeleton"',
]) {
  if (svc.includes(bad)) {
    fails.push(`auth.service.ts must not hardcode fake identity: ${bad}`);
  }
}
for (const needle of [
  "jwtCore.sign",
  "INSERT INTO public.users",
  "INSERT INTO public.auth_sessions",
  "auth_oauth_identities",
  "auth_passkeys",
  "provisionLedgerBucketsForUser",
]) {
  if (!svc.includes(needle)) fails.push(`auth.service.ts missing: ${needle}`);
}

// ── 4. Every session-protected controller must wire JwtAuthGuard (P0-1) ──
const guardedControllers = [
  "services/api-nest/src/opportunities/opportunities.user.controller.ts",
  "services/api-nest/src/trades/trades.user.controller.ts",
  "services/api-nest/src/membership/membership.user.controller.ts",
  "services/api-nest/src/missions/benefits.user.controller.ts",
  "services/api-nest/src/inbox/inbox.user.controller.ts",
  "services/api-nest/src/referral/referral.controller.ts",
  "services/api-nest/src/ai/coach.controller.ts",
  "services/api-nest/src/wallet/home-money-read.user.controller.ts",
];
for (const rel of guardedControllers) {
  const t = read(rel);
  if (!t.includes("JwtAuthGuard")) fails.push(`${rel} must import/use JwtAuthGuard`);
  if (!/@UseGuards\(JwtAuthGuard\)/.test(t)) {
    fails.push(`${rel} must apply @UseGuards(JwtAuthGuard)`);
  }
}

// Auth controller: signup/oauth/passkey/magic-link stay PUBLIC (no guard);
// session/logout/refresh/delete-account require it.
const authCtrl = read("services/api-nest/src/auth/auth.controller.ts");
if (!/@UseGuards\(JwtAuthGuard\)/.test(authCtrl)) {
  fails.push("auth.controller.ts must guard session/logout/refresh/delete-account");
}
if (!authCtrl.includes("signup(@Body()")) {
  fails.push("auth.controller.ts signup must stay public (no guard) — how a session is first obtained");
}

// ── 5. Real Nest + HTTP boot of the guard (no DB/Redis needed) ──
const tscBin = require.resolve("typescript/bin/tsc");
const build = spawnSync(
  process.execPath,
  [tscBin, "-p", path.join(root, "services/api-nest/tsconfig.json")],
  { cwd: root, encoding: "utf8" },
);
process.stdout.write(build.stdout || "");
process.stderr.write(build.stderr || "");
if (build.status !== 0) {
  fails.push("services/api-nest tsc build failed — cannot run jwt-guard.selftest");
} else {
  const selftestJs = path.join(
    root,
    "services/api-nest/dist/auth/jwt-guard.selftest.js",
  );
  if (!fs.existsSync(selftestJs)) {
    fails.push(`missing compiled selftest: ${selftestJs}`);
  } else {
    const run = spawnSync(process.execPath, [selftestJs], {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
    });
    process.stdout.write(run.stdout || "");
    process.stderr.write(run.stderr || "");
    if (run.status !== 0 || !(run.stdout || "").includes("ALL PASS")) {
      fails.push("jwt-guard.selftest did not report ALL PASS (real Nest HTTP round-trip failed)");
    }
  }
  const proofJs = path.join(
    root,
    "services/api-nest/dist/auth/identity-proof.selftest.js",
  );
  if (!fs.existsSync(proofJs)) {
    fails.push("missing compiled identity-proof.selftest");
  } else {
    const proof = spawnSync(process.execPath, [proofJs], {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
    });
    process.stdout.write(proof.stdout || "");
    process.stderr.write(proof.stderr || "");
    if (proof.status !== 0 || !(proof.stdout || "").includes("ALL PASS")) {
      fails.push("identity-proof.selftest did not report ALL PASS");
    }
  }
}

if (fails.length) {
  console.error("[verify:auth-jwt-runtime] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:auth-jwt-runtime] PASS (real HS256 sign/verify/tamper/expiry/issuer/audience + real Nest HTTP guard round-trip + 6 controllers wired)",
);
