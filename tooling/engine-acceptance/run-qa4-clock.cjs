/**
 * QA4 real clock executor — booted Nest (in-process, same clock.core.cjs
 * module-cache entry) + isolated Postgres + real HTTP against real domain
 * services. Canonical qa4-result.v1.json is NOT written here (see
 * checks/stateful-time-lifecycle.cjs for the consumer) — this harness only
 * produces non-canonical, real-execution evidence.
 *
 * Three canonical scenarios, three different real domain decisions:
 *  - TIME-KST-DAY-BOUNDARY: DayPulseService "today" filter across a real
 *    KST midnight, with a real trade_executions row.
 *  - TIME-PLUS-30D: the SAME DayPulseService filter, but a +30d long-distance
 *    offset instead of a boundary-precision crossing.
 *  - TIME-MULTI-DAY-LIFECYCLE: participate -> synthetic clock +3d -> real
 *    execute-tick -> settlement truth (ledger unlock), via
 *    TradeExecutionService.
 *
 * Security: the fail-closed synthetic-clock gate matrix is proven via the
 * existing tooling/verify/domain-clock.cjs (already a real, dynamic,
 * fixture-driven proof of clock.core.cjs's evaluateSyntheticClockGate) —
 * reused here, not re-implemented.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const { assertKillSwitch, assertDbTarget, resolveHarnessDatabaseUrl } = require("./kill-switch.cjs");
const { ROOT } = require("./lib/hash-scope.cjs");
const { spawnVerify } = require("./lib/spawn-verify.cjs");
const {
  createEphemeralSecrets,
  mintUserToken,
  mintAdminToken,
  SYNTH_USER_A,
  SYNTH_ADMIN,
  ADMIN_ROLE_SUPER,
} = require("./lib/synthetic-identity.cjs");
const { prepareIsolatedPostgres } = require("./harness/ci-postgres.cjs");
const nest = require("./harness/ci-nest-boot.cjs");
const clockControl = require("./harness/clock-control.cjs");

const nestPgRequire = createRequire(path.join(ROOT, "services/api-nest/package.json"));
const ADMIN_API_PREFIX = "/api/v1/admin";

function outDir() {
  const d = process.env.AIPO_QA_HARNESS_OUT || path.join(ROOT, "_tmp_qa_harness", "qa4-clock");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function writeJson(abs, obj) {
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

async function withPgClient(databaseUrl, fn) {
  const { Client } = nestPgRequire("pg");
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 8_000 });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

function httpCall(baseUrl, method, pth, headers, body, timeoutMs = 12_000) {
  return new Promise((resolve) => {
    const u = new URL(pth, baseUrl);
    const payload = body === undefined || body === null ? null : JSON.stringify(body);
    const req = http.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        timeout: timeoutMs,
        headers: {
          ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}),
          ...(headers || {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = null;
          }
          resolve({ status: res.statusCode || 0, body: data, parsed });
        });
      },
    );
    req.on("error", (e) => resolve({ status: 0, body: "", parsed: null, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: "", parsed: null, error: "timeout" });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * TIME-KST-DAY-BOUNDARY — boundary-precision proof. One real
 * trade_executions row placed just before a real KST midnight; the SAME row
 * must be visible from DayPulseService just before the boundary and
 * invisible just after — driven purely by the installed synthetic clock,
 * nothing else changes between the two calls.
 */
async function runKstDayBoundaryScenario(ctx) {
  const core = clockControl.loadClockCore();
  const realNowMs = Date.now();
  const kstMidnightMs = core.kstDayStartMs(realNowMs) + core.DAY_MS;

  const oppId = await withPgClient(ctx.databaseUrl, async (client) => {
    const r = await client.query("SELECT id::text FROM public.opportunities LIMIT 1");
    return r.rows[0] ? r.rows[0].id : null;
  });
  if (!oppId) {
    return {
      scenario_id: "TIME-KST-DAY-BOUNDARY",
      status: "BLOCKED",
      blocked_code: "BLOCKED_ENV_CAPABILITY",
      findings: ["no opportunities row exists to satisfy trade_executions.opportunity_id FK"],
    };
  }

  const rowCreatedAt = new Date(kstMidnightMs - 5_000).toISOString();
  const idemKey = `qa4-kst-boundary-${crypto.randomUUID()}`;
  await withPgClient(ctx.databaseUrl, (client) =>
    client.query(
      `INSERT INTO public.trade_executions
         (user_id, opportunity_id, pricing_version, status, expected_profit_usdt, idempotency_key, created_at)
       VALUES ($1::uuid, $2::uuid, 1, 'success', 1, $3, $4::timestamptz)`,
      [SYNTH_USER_A, oppId, idemKey, rowCreatedAt],
    ),
  );

  clockControl.installSyntheticClock(kstMidnightMs - 2_000, ctx.clockEnvOpts);
  const beforeRes = await httpCall(ctx.baseUrl, "GET", "/api/v1/me/day-pulse", { authorization: ctx.userBearer });
  clockControl.installSyntheticClock(kstMidnightMs + 2_000, ctx.clockEnvOpts);
  const afterRes = await httpCall(ctx.baseUrl, "GET", "/api/v1/me/day-pulse", { authorization: ctx.userBearer });
  clockControl.clearSyntheticClock();

  const beforeCount = beforeRes.parsed ? Number(beforeRes.parsed.settlementCompletedToday) : null;
  const afterCount = afterRes.parsed ? Number(afterRes.parsed.settlementCompletedToday) : null;
  const rowVisibleBefore = beforeRes.status === 200 && Number.isFinite(beforeCount) && beforeCount >= 1;
  const rowInvisibleAfter =
    afterRes.status === 200 && Number.isFinite(afterCount) && Number.isFinite(beforeCount) && afterCount === beforeCount - 1;

  const pass = rowVisibleBefore && rowInvisibleAfter;
  return {
    scenario_id: "TIME-KST-DAY-BOUNDARY",
    status: pass ? "PASS" : "FAIL",
    kst_midnight_ms: kstMidnightMs,
    kst_midnight_iso: new Date(kstMidnightMs).toISOString(),
    before: { clock_ms: kstMidnightMs - 2_000, http_status: beforeRes.status, settlementCompletedToday: beforeCount },
    after: { clock_ms: kstMidnightMs + 2_000, http_status: afterRes.status, settlementCompletedToday: afterCount },
    row_visible_before_boundary: rowVisibleBefore,
    row_invisible_after_boundary: rowInvisibleAfter,
    findings: pass
      ? []
      : [
          `KST boundary proof FAIL: before=${beforeCount} (status=${beforeRes.status}) after=${afterCount} (status=${afterRes.status})`,
        ],
  };
}

/**
 * TIME-PLUS-30D — long-distance offset proof (distinct from boundary
 * precision above): a row created "now" is visible at the anchor and must
 * become invisible exactly because the synthetic clock moved +30 real days
 * forward, proving the domain decision genuinely consults the clock value
 * rather than any hardcoded window.
 */
async function runPlus30dScenario(ctx) {
  const core = clockControl.loadClockCore();
  const anchorMs = Date.now();
  const plus30dMs = core.addDaysMs(anchorMs, 30);

  const oppId = await withPgClient(ctx.databaseUrl, async (client) => {
    const r = await client.query("SELECT id::text FROM public.opportunities LIMIT 1");
    return r.rows[0] ? r.rows[0].id : null;
  });
  if (!oppId) {
    return {
      scenario_id: "TIME-PLUS-30D",
      status: "BLOCKED",
      blocked_code: "BLOCKED_ENV_CAPABILITY",
      findings: ["no opportunities row exists to satisfy trade_executions.opportunity_id FK"],
    };
  }

  const idemKey = `qa4-plus30d-${crypto.randomUUID()}`;
  await withPgClient(ctx.databaseUrl, (client) =>
    client.query(
      `INSERT INTO public.trade_executions
         (user_id, opportunity_id, pricing_version, status, expected_profit_usdt, idempotency_key, created_at)
       VALUES ($1::uuid, $2::uuid, 1, 'safe_stop', 1, $3, now())`,
      [SYNTH_USER_A, oppId, idemKey],
    ),
  );

  clockControl.installSyntheticClock(anchorMs, ctx.clockEnvOpts);
  const anchorRes = await httpCall(ctx.baseUrl, "GET", "/api/v1/me/day-pulse", { authorization: ctx.userBearer });
  clockControl.installSyntheticClock(plus30dMs, ctx.clockEnvOpts);
  const plus30Res = await httpCall(ctx.baseUrl, "GET", "/api/v1/me/day-pulse", { authorization: ctx.userBearer });
  clockControl.clearSyntheticClock();

  const anchorCount = anchorRes.parsed ? Number(anchorRes.parsed.platformSafeStopToday) : null;
  const plus30Count = plus30Res.parsed ? Number(plus30Res.parsed.platformSafeStopToday) : null;
  const rowVisibleAtAnchor = anchorRes.status === 200 && Number.isFinite(anchorCount) && anchorCount >= 1;
  const rowInvisibleAt30d =
    plus30Res.status === 200 && Number.isFinite(plus30Count) && Number.isFinite(anchorCount) && plus30Count === anchorCount - 1;

  const kstAnchorDay = core.kstDayKey(anchorMs);
  const kstPlus30Day = core.kstDayKey(plus30dMs);
  const calendarArithmeticOk = kstAnchorDay !== kstPlus30Day;

  const pass = rowVisibleAtAnchor && rowInvisibleAt30d && calendarArithmeticOk;
  return {
    scenario_id: "TIME-PLUS-30D",
    status: pass ? "PASS" : "FAIL",
    anchor_ms: anchorMs,
    plus30d_ms: plus30dMs,
    kst_anchor_day: kstAnchorDay,
    kst_plus30d_day: kstPlus30Day,
    anchor: { http_status: anchorRes.status, platformSafeStopToday: anchorCount },
    plus30d: { http_status: plus30Res.status, platformSafeStopToday: plus30Count },
    row_visible_at_anchor: rowVisibleAtAnchor,
    row_invisible_at_plus30d: rowInvisibleAt30d,
    calendar_arithmetic_ok: calendarArithmeticOk,
    findings: pass
      ? []
      : [
          `+30d proof FAIL: anchor=${anchorCount} (status=${anchorRes.status}) plus30d=${plus30Count} (status=${plus30Res.status}) kst_days=${kstAnchorDay}->${kstPlus30Day}`,
        ],
  };
}

/**
 * TIME-MULTI-DAY-LIFECYCLE — participate -> synthetic clock +3d -> real
 * execute-tick -> settlement truth. TradeExecutionService.executeTick reads
 * this.clock.nowMs() for elapsed-vs-hard-deadline (settlement_rule.cjs
 * HARD_SEC=90) BEFORE evaluating any other rule, so a +3-real-day synthetic
 * clock unconditionally forces MATCH_TIMEOUT -> finalizeSafeStop -> a real
 * ledger unlock journal, regardless of the opportunity's other pricing
 * fields. That causal chain (clock value -> Rule decision -> DB ledger
 * mutation -> wallet state) is the actual proof, not an assumption.
 */
async function runMultiDayLifecycleScenario(ctx) {
  const core = clockControl.loadClockCore();
  const findings = [];

  const opp = await withPgClient(ctx.databaseUrl, async (client) => {
    // A fresh synthetic user defaults to membership=sprout / max_capital_band=
    // micro (identity_nest_auth.sql) - only a 'micro' (or unset) capital_band
    // opportunity is reachable without a separate membership-upgrade step.
    const r = await client.query(
      `SELECT id::text, pricing_version, required_capital_usdt::text, expected_profit_usdt::text
         FROM public.opportunities
        WHERE status = 'available' AND execution_mode = 'orchestrate'
          AND (capital_band = 'micro' OR capital_band IS NULL)
        LIMIT 1`,
    );
    return r.rows[0] || null;
  });
  if (!opp) {
    return {
      scenario_id: "TIME-MULTI-DAY-LIFECYCLE",
      status: "BLOCKED",
      blocked_code: "BLOCKED_ENV_CAPABILITY",
      findings: [
        "no available/orchestrate opportunity with capital_band micro/null exists (CatalogRuntimeSeedService did not seed one reachable by a default sprout-membership synthetic user)",
      ],
    };
  }

  // Guarantee the guard/rule preconditions this scenario needs deterministically
  // (fresh pricing) — the opportunity itself is real, seeded product data.
  await withPgClient(ctx.databaseUrl, (client) =>
    client.query(
      `UPDATE public.opportunities
          SET pricing = pricing || '{"compareReady":true,"listingLegsFresh":true,"gradeMismatch":false}'::jsonb,
              stale_at = now() + interval '1 hour'
        WHERE id = $1::uuid`,
      [opp.id],
    ),
  );

  // Real product balance credit via the admin money API (same double-entry
  // path production uses) — not a raw balance UPDATE. required_capital_usdt
  // can legitimately exceed ADMIN_ADJUST_DUAL_CONFIRM_USDT (1000), which
  // requires a secondApproverId distinct from the acting admin — always
  // supply one so this setup step works regardless of the seeded
  // opportunity's capital tier.
  const adminBearer = `Bearer ${mintAdminToken(ctx.secrets.jwtAdminSecret, SYNTH_ADMIN, { role: ADMIN_ROLE_SUPER })}`;
  const secondApproverId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const creditKey = `qa4-lifecycle-credit-${crypto.randomUUID()}`;
  const credit = await httpCall(
    ctx.baseUrl,
    "POST",
    `${ADMIN_API_PREFIX}/users/${SYNTH_USER_A}/balance-adjust`,
    { authorization: adminBearer },
    {
      bucket: "principal",
      kind: "credit",
      amountUsdt: opp.required_capital_usdt,
      reason: "qa4-lifecycle-fixture",
      idempotencyKey: creditKey,
      secondApproverId,
    },
  );
  if (!(credit.status >= 200 && credit.status < 300)) {
    findings.push(`principal credit setup FAIL: status=${credit.status}`);
    return { scenario_id: "TIME-MULTI-DAY-LIFECYCLE", status: "FAIL", findings };
  }

  const preflight = await httpCall(
    ctx.baseUrl,
    "POST",
    `/api/v1/opportunities/${opp.id}/preflight`,
    { authorization: ctx.userBearer },
    {},
  );
  const preflightToken = preflight.parsed ? preflight.parsed.preflightToken : null;
  if (!preflightToken) {
    findings.push(`preflight FAIL: status=${preflight.status} body=${preflight.body.slice(0, 200)}`);
    return { scenario_id: "TIME-MULTI-DAY-LIFECYCLE", status: "FAIL", findings };
  }

  const participateKey = `qa4-lifecycle-participate-${crypto.randomUUID()}`;
  const participate = await httpCall(
    ctx.baseUrl,
    "POST",
    `/api/v1/opportunities/${opp.id}/participate`,
    { authorization: ctx.userBearer },
    {
      opportunityId: opp.id,
      pricingVersion: opp.pricing_version,
      minProfitUsdt: "0",
      amountUsdt: opp.required_capital_usdt,
      idempotencyKey: participateKey,
      preflightToken,
    },
  );
  const tradeId = participate.parsed ? participate.parsed.tradeId : null;
  if (!tradeId) {
    findings.push(`participate FAIL: status=${participate.status} body=${participate.body.slice(0, 300)}`);
    return { scenario_id: "TIME-MULTI-DAY-LIFECYCLE", status: "FAIL", findings };
  }

  const walletBefore = await httpCall(ctx.baseUrl, "GET", "/api/v1/wallet/buckets", { authorization: ctx.userBearer });

  const acceptedAtRow = await withPgClient(ctx.databaseUrl, async (client) => {
    const r = await client.query("SELECT created_at FROM public.trade_executions WHERE id = $1::uuid", [tradeId]);
    return r.rows[0] ? new Date(r.rows[0].created_at).getTime() : null;
  });
  const acceptedAtMs = acceptedAtRow || Date.now();
  const plus3dMs = core.addDaysMs(acceptedAtMs, 3);

  clockControl.installSyntheticClock(plus3dMs, ctx.clockEnvOpts);
  const tick = await httpCall(
    ctx.baseUrl,
    "POST",
    `/api/v1/trades/${tradeId}/execute-tick`,
    { authorization: ctx.userBearer },
    {},
  );
  clockControl.clearSyntheticClock();

  const walletAfter = await httpCall(ctx.baseUrl, "GET", "/api/v1/wallet/buckets", { authorization: ctx.userBearer });

  const tickOk = tick.status >= 200 && tick.status < 300 && tick.parsed;
  const terminal = tickOk && tick.parsed.status === "safe_stop" && tick.parsed.resultCode === "MATCH_TIMEOUT";
  const principalBefore = walletBefore.parsed ? Number(walletBefore.parsed.principalUsdt) : null;
  const principalAfter = walletAfter.parsed ? Number(walletAfter.parsed.principalUsdt) : null;
  const lockedBefore = walletBefore.parsed ? Number(walletBefore.parsed.lockedUsdt) : null;
  const lockedAfter = walletAfter.parsed ? Number(walletAfter.parsed.lockedUsdt) : null;
  const capitalUnlocked =
    Number.isFinite(principalBefore) &&
    Number.isFinite(principalAfter) &&
    Number.isFinite(lockedBefore) &&
    Number.isFinite(lockedAfter) &&
    principalAfter > principalBefore &&
    lockedAfter < lockedBefore;

  if (!terminal) findings.push(`execute-tick did not reach settlement truth: status=${tick.status} body=${tick.body.slice(0, 300)}`);
  if (!capitalUnlocked) {
    findings.push(
      `ledger unlock not observed: principal ${principalBefore}->${principalAfter} locked ${lockedBefore}->${lockedAfter}`,
    );
  }

  const pass = terminal && capitalUnlocked;
  return {
    scenario_id: "TIME-MULTI-DAY-LIFECYCLE",
    status: pass ? "PASS" : "FAIL",
    opportunity_id: opp.id,
    trade_id: tradeId,
    accepted_at_ms: acceptedAtMs,
    clock_at_tick_ms: plus3dMs,
    tick_response: tickOk ? { status: tick.parsed.status, resultCode: tick.parsed.resultCode } : { http_status: tick.status },
    wallet_before: { principalUsdt: principalBefore, lockedUsdt: lockedBefore },
    wallet_after: { principalUsdt: principalAfter, lockedUsdt: lockedAfter },
    reached_settlement_truth: terminal,
    capital_unlocked: capitalUnlocked,
    findings,
  };
}

async function runQa4Clock(opts = {}) {
  assertKillSwitch(opts);
  const databaseUrl = opts.databaseUrl || resolveHarnessDatabaseUrl();

  // Security gate matrix — reuse the existing, real, dynamic fail-closed
  // proof (explicit QA enable / synthetic namespace / approved env /
  // production-hostname deny / production-env deny / kill-switch parity /
  // auth-time isolation). Not re-implemented here.
  const gateChild = spawnVerify("tooling/verify/domain-clock.cjs", { timeoutMs: 60_000 });

  const skipBoot = opts.skipBoot === true || process.env.AIPO_QA4_SKIP_BOOT === "1";
  const port = Number(opts.port || process.env.PORT || 4000);
  const baseUrl = opts.productBaseUrl || `http://127.0.0.1:${port}`;
  const secrets = createEphemeralSecrets();
  const userBearer = `Bearer ${mintUserToken(secrets.jwtUserSecret, SYNTH_USER_A)}`;
  const clockEnvOpts = {
    syntheticNs: opts.synthetic_account_namespace || "qa-synth-ci",
    targetEnv: opts.target_env || "ci",
    hostname: opts.hostname || "localhost",
  };

  let started = null;
  let pgPrep = null;
  if (!skipBoot) {
    if (!databaseUrl) {
      const err = new Error("DATABASE_URL required for QA4 clock harness");
      err.code = "AIPO_QA_HARNESS_FAILURE";
      throw err;
    }
    assertDbTarget({ databaseUrl, target_env: opts.target_env });
    pgPrep = await prepareIsolatedPostgres({ databaseUrl, target_env: opts.target_env });
    started = await nest.startNestInProcess({
      port,
      env: {
        DATABASE_URL: databaseUrl,
        LLM_PROVIDER: "none",
        JWT_USER_SECRET: secrets.jwtUserSecret,
        JWT_ADMIN_SECRET: secrets.jwtAdminSecret,
      },
    });
    await nest.waitForHealth({ port });
  }

  const ctx = { baseUrl, databaseUrl, userBearer, secrets, clockEnvOpts };

  let scenarios = [];
  if (!skipBoot) {
    scenarios = [
      await runKstDayBoundaryScenario(ctx),
      await runPlus30dScenario(ctx),
      await runMultiDayLifecycleScenario(ctx),
    ];
  }

  const passCount = scenarios.filter((s) => s.status === "PASS").length;
  const failCount = scenarios.filter((s) => s.status === "FAIL").length;
  const blockedCount = scenarios.filter((s) => s.status === "BLOCKED").length;
  const allPass = scenarios.length === 3 && passCount === 3;

  const harness_status = gateChild.ok && (skipBoot || scenarios.length === 3) ? "PASS" : "HARNESS_FAILURE";

  const result = {
    schema: "harness.qa4-clock.v1",
    suite_id: "QA4_CLOCK_ORCH",
    measuredAt: new Date().toISOString(),
    github_run_id: process.env.GITHUB_RUN_ID || null,
    commit_sha: process.env.GITHUB_SHA || null,
    harness_status,
    non_canonical: true,
    does_not_replace_qa4_result: true,
    verdict_class: harness_status === "PASS" ? "HARNESS_VALIDATION" : "HARNESS_FAILURE",
    security_gate: {
      script: gateChild.script,
      ok: gateChild.ok,
      exitCode: gateChild.exitCode,
      summary: gateChild.summary,
    },
    scenarios,
    all_scenarios_pass: allPass,
    counts: { pass: passCount, fail: failCount, blocked: blockedCount, total: scenarios.length },
    postgres: pgPrep ? { classification: pgPrep.classification, host: pgPrep.host } : { skipped: skipBoot },
    secrets: { committed: false },
    notes: [
      "In-process Nest boot (no child process) so the harness and the product share clock.core.cjs's module cache.",
      "Real Postgres, real HTTP, real product decision code — no fixture-as-runtime.",
      "Security gate reuses tooling/verify/domain-clock.cjs, does not re-implement it.",
    ],
  };

  const dir = outDir();
  writeJson(path.join(dir, "qa4-clock-harness.v1.json"), result);
  if (started) await nest.stopNestInProcess(started.app);

  if (harness_status !== "PASS") {
    const err = new Error("QA4 clock harness failed");
    err.code = "AIPO_QA_HARNESS_FAILURE";
    err.result = result;
    throw err;
  }
  return result;
}

function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  runQa4Clock({
    target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "ci",
    hostname: get("--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
    synthetic_account_namespace: get("--synthetic-ns") || process.env.AIPO_QA_SYNTHETIC_NS || "qa-synth-ci",
    databaseUrl: get("--database-url") || resolveHarnessDatabaseUrl(),
    skipBoot: args.includes("--skip-boot"),
  })
    .then((out) => {
      console.log(
        `[run-qa4-clock] harness=${out.harness_status} scenarios=${out.scenarios.map((s) => `${s.scenario_id}:${s.status}`).join(" ")}`,
      );
    })
    .catch((e) => {
      try {
        writeJson(path.join(outDir(), "harness-failure.v1.json"), { code: e.code || "FAIL", message: e.message });
      } catch {
        /* upload path still needs a file when wait fails early */
      }
      console.error(`[run-qa4-clock] ${e.code || "FAIL"} — ${e.message}`);
      process.exit(e.code === "AIPO_QA_KILL_SWITCH" || e.code === "AIPO_QA_HARNESS_FAILURE" ? 2 : 1);
    });
}

if (require.main === module) {
  main();
}

module.exports = { runQa4Clock };
