/**
 * verify:domain-clock — QA4 clock seam contract.
 *
 * 1. clock.core.cjs exposes the injectable seam and src/common/clock.ts re-declares it
 * 2. the intended domain decision sites read the injected Clock, not Date.now()
 * 3. authentication/security time stays real (never routed through the Clock)
 * 4. the synthetic override gate is a fail-closed AND of every prerequisite
 * 5. the product deny list is never weaker than tooling/engine-acceptance/kill-switch.cjs
 * 6. real behaviour: default is system time; withClock is deterministic and restores
 * 7. JWT verification time is unaffected by a synthetic domain clock
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..", "..");
const fails = [];
const notes = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function check(name, fn) {
  try {
    fn();
    notes.push(`PASS ${name}`);
  } catch (e) {
    fails.push(`${name}: ${e.message}`);
  }
}

const CORE_REL = "services/api-nest/clock.core.cjs";
const TS_REL = "services/api-nest/src/common/clock.ts";
const coreSrc = read(CORE_REL);
const tsSrc = read(TS_REL);
if (fails.length) {
  console.error("[verify:domain-clock] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const core = require(path.join(root, CORE_REL));
const jwtCore = require(path.join(root, "services/api-nest/jwt.core.cjs"));
const killSwitch = require(path.join(
  root,
  "tooling/engine-acceptance/kill-switch.cjs",
));

// ── 1. injectable seam ──
check("clock core exports the seam", () => {
  for (const fn of [
    "setClock",
    "withClock",
    "clearClock",
    "createFixedClock",
    "resolveClock",
    "activeClockKind",
    "nowMs",
    "evaluateSyntheticClockGate",
    "utcDayKey",
    "kstDayKey",
    "kstDayStartMs",
  ]) {
    assert.equal(typeof core[fn], "function", `clock.core.cjs must export ${fn}()`);
  }
});

check("clock.ts declares an injectable clock hook", () => {
  assert.ok(
    /export function setClock\(/.test(tsSrc),
    "src/common/clock.ts must declare `export function setClock(`",
  );
  assert.ok(
    /export function withClock</.test(tsSrc) || /export function withClock\(/.test(tsSrc),
    "src/common/clock.ts must declare `export function withClock`",
  );
  assert.ok(/export class SystemClock/.test(tsSrc), "SystemClock must exist");
  assert.ok(
    /nowMs\(\): number \{\s*return Date\.now\(\);/.test(tsSrc),
    "SystemClock.nowMs() must return real system time",
  );
});

// ── 2. domain decision sites read the Clock ──
const DOMAIN_SITES = [
  {
    rel: "services/api-nest/src/opportunities/participate.service.ts",
    marker: "const nowMs = this.clock.nowMs();",
    what: "participation cutoff",
  },
  {
    rel: "services/api-nest/src/trades/trades.execution.service.ts",
    marker: "const nowMs = this.clock.nowMs();",
    what: "trade execution tick",
  },
  {
    rel: "services/api-nest/src/referral/referral.share.service.ts",
    marker: "utcDayKey(this.clock.nowMs())",
    what: "referral UTC day key",
  },
  {
    rel: "services/api-nest/src/missions/mission.accrual.service.ts",
    marker: "this.clock.nowMs()",
    what: "mission accrual hold/release",
  },
  {
    rel: "services/api-nest/src/loop/day-pulse.service.ts",
    marker: "kstDayStartMs(nowMs)",
    what: "day pulse KST day boundary",
  },
];

for (const site of DOMAIN_SITES) {
  check(`${site.what} uses the Clock seam`, () => {
    const src = read(site.rel);
    assert.ok(src.includes(site.marker), `expected ${site.marker}`);
    assert.ok(
      /@Inject\(CLOCK\)/.test(src),
      "service must inject CLOCK",
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.ok(
      !/Date\.now\(\)/.test(code),
      "domain decision file must not bypass the seam with Date.now()",
    );
  });
}

check("day pulse day boundary no longer comes from the database wall clock", () => {
  const src = read("services/api-nest/src/loop/day-pulse.service.ts");
  assert.ok(
    !/date_trunc\('day', now\(\)/.test(src),
    "day boundary must be driven by the Clock, not SQL now()",
  );
});

// ── 3. authentication time stays real ──
const AUTH_TIME_FILES = [
  "services/api-nest/jwt.core.cjs",
  "services/api-nest/src/auth/jwt-auth.guard.ts",
  "services/api-nest/src/auth/auth.service.ts",
  "services/api-nest/src/wallet/withdraw-stepup.service.ts",
  "services/api-nest/src/loop/preflight.service.ts",
];
for (const rel of AUTH_TIME_FILES) {
  check(`auth/security time stays real in ${path.basename(rel)}`, () => {
    const src = read(rel);
    assert.ok(
      !/clock\.core|common\/clock|CLOCK\b/.test(src),
      "authentication/security time must not be routed through the domain Clock",
    );
  });
}

// ── 4. fail-closed AND gate ──
const SAFE_ENV = Object.freeze({
  NODE_ENV: "test",
  AIPO_QA_CLOCK_ENABLE: "1",
  AIPO_QA_SYNTHETIC_NS: "qa-synth-ci",
  AIPO_QA_TARGET_ENV: "ci",
  AIPO_QA_HOSTNAME: "localhost",
});

check("all prerequisites present -> allowed", () => {
  const gate = core.evaluateSyntheticClockGate(SAFE_ENV, "localhost");
  assert.equal(gate.ok, true, gate.reason || "expected allow");
});

const DENY_CASES = [
  ["production NODE_ENV", { ...SAFE_ENV, NODE_ENV: "production" }],
  ["QA clock flag absent", { ...SAFE_ENV, AIPO_QA_CLOCK_ENABLE: "" }],
  ["QA clock flag not exactly 1", { ...SAFE_ENV, AIPO_QA_CLOCK_ENABLE: "true" }],
  ["synthetic namespace missing", { ...SAFE_ENV, AIPO_QA_SYNTHETIC_NS: "" }],
  ["synthetic namespace malformed", { ...SAFE_ENV, AIPO_QA_SYNTHETIC_NS: "prod-real" }],
  ["target env unclassified", { ...SAFE_ENV, AIPO_QA_TARGET_ENV: "" }],
  ["target env production", { ...SAFE_ENV, AIPO_QA_TARGET_ENV: "production" }],
  ["production hostname", { ...SAFE_ENV, AIPO_QA_HOSTNAME: "api.peotteok.app" }],
  ["workers.dev hostname", { ...SAFE_ENV, AIPO_QA_HOSTNAME: "aipo.workers.dev" }],
  ["production public host env", { ...SAFE_ENV, ROOT_DOMAIN: "peotteok.app" }],
  [
    "managed database target",
    {
      ...SAFE_ENV,
      DATABASE_URL: "postgresql://svc:YOUR_PASSWORD@db.example-ref.supabase.co:5432/postgres",
    },
  ],
];
for (const [name, env] of DENY_CASES) {
  check(`synthetic clock denied: ${name}`, () => {
    const gate = core.evaluateSyntheticClockGate(env, env.AIPO_QA_HOSTNAME);
    assert.equal(gate.ok, false, "expected deny");
    assert.ok(gate.reason && gate.reason.length > 0, "deny must carry a reason");
    assert.throws(
      () => core.setClock(core.createFixedClock(0), { env, hostname: env.AIPO_QA_HOSTNAME }),
      /synthetic clock denied/,
    );
    assert.equal(core.activeClockKind(), "system", "denied gate must leave system time active");
  });
}

check("a single env flag can never activate synthetic time", () => {
  const onlyFlag = { AIPO_QA_CLOCK_ENABLE: "1" };
  assert.equal(core.evaluateSyntheticClockGate(onlyFlag, "localhost").ok, false);
});

// ── 5. never weaker than the canonical kill-switch ──
check("product deny list is not weaker than kill-switch.cjs", () => {
  const hostnames = [
    "localhost",
    "127.0.0.1",
    "api.peotteok.app",
    "peotteok.kr",
    "ai-profit-os.internal",
    "worker.workers.dev",
    "site.pages.dev",
    "db.mgsytcetsiecllmhcyox.supabase.co",
    "fv-az123-456",
    "some-random-box",
  ];
  const targetEnvs = ["local", "ci", "acceptance", "ephemeral", "qa", "production", "staging", ""];
  const namespaces = ["qa-synth-ci", "qa-synth-local", "prod", ""];
  let compared = 0;
  for (const hostname of hostnames) {
    for (const target_env of targetEnvs) {
      for (const ns of namespaces) {
        const canonical = killSwitch.evaluateKillSwitch({
          target_env,
          hostname,
          synthetic_account_namespace: ns,
        });
        const product = core.evaluateSyntheticClockGate(
          {
            ...SAFE_ENV,
            AIPO_QA_TARGET_ENV: target_env,
            AIPO_QA_HOSTNAME: hostname,
            AIPO_QA_SYNTHETIC_NS: ns,
          },
          hostname,
        );
        compared += 1;
        if (!canonical.ok) {
          assert.equal(
            product.ok,
            false,
            `kill-switch denies (${hostname}/${target_env}/${ns}) but the product clock gate allows it`,
          );
        }
      }
    }
  }
  assert.ok(compared >= 200, `expected a broad parity matrix, compared=${compared}`);
});

check("allowed target env set matches the canonical list", () => {
  assert.deepEqual(
    [...core.ALLOWED_TARGET_ENV].sort(),
    [...killSwitch.ALLOWED_TARGET_ENV].sort(),
  );
});

// ── 6. real runtime behaviour ──
check("default path is system time", () => {
  core.clearClock();
  assert.equal(core.activeClockKind(), "system");
  const before = Date.now();
  const seen = core.nowMs();
  const after = Date.now();
  assert.ok(seen >= before && seen <= after, `system clock drifted: ${seen}`);
});

check("system clock actually progresses", () => {
  const a = core.nowMs();
  const spinUntil = Date.now() + 3;
  while (Date.now() < spinUntil) {
    /* busy wait a few ms */
  }
  assert.ok(core.nowMs() > a, "SystemClock must advance with real time");
});

check("withClock makes domain decisions deterministic and then restores", () => {
  // 2026-03-15T00:00:00+09:00 == 2026-03-14T15:00:00Z (QA4 KST day boundary anchor)
  const kstMidnight = Date.UTC(2026, 2, 15) - 9 * 60 * 60 * 1000;
  const observed = core.withClock(
    core.createFixedClock(kstMidnight),
    () => ({
      kind: core.activeClockKind(),
      nowMs: core.nowMs(),
      kstDay: core.kstDayKey(core.nowMs()),
      utcDay: core.utcDayKey(core.nowMs()),
      dayStart: core.kstDayStartMs(core.nowMs()),
    }),
    { env: SAFE_ENV, hostname: "localhost" },
  );
  assert.equal(observed.kind, "synthetic");
  assert.equal(observed.nowMs, kstMidnight);
  assert.equal(observed.kstDay, "2026-03-15");
  assert.equal(observed.utcDay, "2026-03-14", "UTC day differs from KST day at the boundary");
  assert.equal(observed.dayStart, kstMidnight, "KST day start == the boundary instant");
  assert.equal(core.activeClockKind(), "system", "withClock must restore the previous clock");
});

check("year-end and +365d scenarios stay deterministic", () => {
  const yearEnd = Date.UTC(2026, 11, 31, 23, 59, 59) - 9 * 60 * 60 * 1000;
  core.withClock(
    core.createFixedClock(yearEnd),
    () => {
      assert.equal(core.kstDayKey(core.nowMs()), "2026-12-31");
      assert.equal(
        core.kstDayKey(core.addDaysMs(core.nowMs(), 1)),
        "2027-01-01",
        "+1d must cross the KST year boundary",
      );
      assert.equal(core.kstDayKey(core.addDaysMs(core.nowMs(), 365)), "2027-12-31");
    },
    { env: SAFE_ENV, hostname: "localhost" },
  );
});

// ── 7. JWT/auth time is unaffected ──
check("synthetic domain time cannot revive or expire a JWT", () => {
  const secret = "domain_clock_selftest_secret_min_32c!";
  const live = jwtCore.sign({ sub: "u1" }, secret, {
    issuer: "iss",
    audience: "aud",
    expiresInSec: 900,
  });
  const dead = jwtCore.sign({ sub: "u1" }, secret, {
    issuer: "iss",
    audience: "aud",
    expiresInSec: 1,
    nowMs: Date.now() - 120_000,
  });
  const farFuture = Date.now() + 400 * 24 * 60 * 60 * 1000;
  core.withClock(
    core.createFixedClock(farFuture),
    () => {
      assert.equal(core.nowMs(), farFuture, "domain clock did move");
      jwtCore.verify(live, secret, { issuer: "iss", audience: "aud" });
      assert.throws(
        () => jwtCore.verify(dead, secret, { issuer: "iss", audience: "aud" }),
        /token expired/,
        "an expired token must stay expired under synthetic domain time",
      );
    },
    { env: SAFE_ENV, hostname: "localhost" },
  );
});

check("clock core never leaks the database DSN in a deny reason", () => {
  // Assembled at runtime so this scanner-visible source carries no DSN literal.
  const password = "s3cr3t-fixture-value";
  const dsn = ["postgresql://svc:", password, "@db.example-ref.supabase.co:5432/postgres"].join("");
  const gate = core.evaluateSyntheticClockGate(
    { ...SAFE_ENV, DATABASE_URL: dsn },
    "localhost",
  );
  assert.equal(gate.ok, false);
  const serialized = JSON.stringify(gate);
  assert.ok(!serialized.includes(password), "deny evidence must not echo credentials");
  assert.ok(!serialized.includes(dsn), "deny evidence must not echo the DSN");
});

core.clearClock();

if (fails.length) {
  console.error("[verify:domain-clock] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  `[verify:domain-clock] PASS (${notes.length} checks · ${DOMAIN_SITES.length} domain sites on the seam · auth time real · kill-switch parity)`,
);
