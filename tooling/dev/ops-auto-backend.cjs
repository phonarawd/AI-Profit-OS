#!/usr/bin/env node
/**
 * 운영자 클릭 0. Nest 운영을 에이전트가 유지한다.
 * CERT / REL-701 Cloudflare / 실돈 YES / 남은 마이그레이션 적용 0.
 */
"use strict";

const path = require("path");
const { spawnSync } = require("child_process");
const { Client } = require("../../services/api-nest/node_modules/pg");
const { loadDotEnv } = require("../deploy/lib/env.cjs");

loadDotEnv();

const root = path.resolve(__dirname, "../..");
const PRODUCTION_SERVICE = "srv-da5r1tqjobas73fl16dg";
const STAGING_SERVICE = "srv-dabph32fngtc73esj8rg";
const PRODUCTION_REF = "mgsytcetsiecllmhcyox";
const HEALTH_URL = "https://api.hiptk.app/api/v1/health";
const TRIAL_SKU_ID = "7e1a0001-1000-4000-8000-747269616c01";

async function render(pathname) {
  const token = process.env.RENDER_API_KEY || "";
  if (!token) throw new Error("RENDER_API_KEY missing");
  const res = await fetch("https://api.render.com/v1" + pathname, {
    headers: { authorization: "Bearer " + token, accept: "application/json" },
  });
  if (!res.ok) throw new Error("render http " + res.status);
  return res.json();
}

function rowsToMap(payload) {
  const out = {};
  for (const row of Array.isArray(payload) ? payload : []) {
    const ev = row && (row.envVar || row);
    if (ev && typeof ev.key === "string" && typeof ev.value === "string") {
      out[ev.key] = ev.value;
    }
  }
  return out;
}

async function health() {
  const res = await fetch(HEALTH_URL);
  const body = await res.json().catch(() => ({}));
  return {
    http: res.status,
    ok: res.status === 200 && body.ok === true,
    gitSha: body.gitSha || "",
    db: Boolean(body.db && body.db.ok),
    redis: Boolean(body.redis && body.redis.ok),
    environment: body.environment || "",
  };
}

function runNode(rel, args) {
  const run = spawnSync(process.execPath, [path.join(root, rel), ...(args || [])], {
    cwd: root,
    encoding: "utf8",
    timeout: 180000,
  });
  if (run.status !== 0) {
    throw new Error(
      path.basename(rel) + " failed: " + String(run.stderr || run.stdout || run.status),
    );
  }
  return run.stdout || "";
}

function originSha() {
  const run = spawnSync("git", ["rev-parse", "@{u}"], {
    cwd: root,
    encoding: "utf8",
    timeout: 30000,
  });
  const sha = String(run.stdout || "").trim();
  if (run.status !== 0 || !/^[0-9a-f]{40}$/i.test(sha)) {
    throw new Error("origin SHA missing — unpushed HEAD is not a deploy target");
  }
  return sha;
}

function assertProdDb(url) {
  const u = new URL(url);
  const blob = (u.username + " " + u.hostname + " " + u.pathname).toLowerCase();
  if (!blob.includes(PRODUCTION_REF)) {
    throw new Error("refused: DATABASE_URL is not production ref");
  }
}

async function trialFacts(databaseUrl) {
  assertProdDb(databaseUrl);
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const program = await client.query(
      "SELECT id, welcome_krw, profit_cap_krw FROM public.trial_program_config WHERE id = 1",
    );
    const sku = await client.query(
      `SELECT id::text, status, trial_eligible, (stale_at > now()) AS fresh
         FROM public.opportunities
        WHERE id = $1::uuid`,
      [TRIAL_SKU_ID],
    );
    return {
      program: Boolean(program.rows[0]),
      welcomeKrw: program.rows[0] ? Number(program.rows[0].welcome_krw) : 0,
      sku: Boolean(sku.rows[0]),
      skuAvailable: sku.rows[0] && sku.rows[0].status === "available",
      skuTrial: sku.rows[0] && sku.rows[0].trial_eligible === true,
      skuFresh: sku.rows[0] && sku.rows[0].fresh === true,
    };
  } finally {
    await client.end();
  }
}

async function main() {
  const serviceId = process.env.RENDER_PRODUCTION_SERVICE_ID || PRODUCTION_SERVICE;
  if (serviceId === STAGING_SERVICE) throw new Error("refused: staging service id");
  if (serviceId !== PRODUCTION_SERVICE) throw new Error("refused: unknown service id");

  const repaired = [];
  let live = await health();
  const vars = rowsToMap(await render("/services/" + serviceId + "/env-vars?limit=100"));
  const resendPresent = Boolean(vars.RESEND_API_KEY && vars.RESEND_FROM_EMAIL);

  if (!resendPresent) {
    runNode("tooling/dev/provision-production-resend.cjs");
    repaired.push("resend");
  }

  if (!resendPresent || !live.ok || !live.db || !live.redis) {
    runNode("tooling/dev/redeploy-production-api.cjs", [originSha()]);
    repaired.push("redeploy");
    live = await health();
  }

  if (!live.ok || !live.db || !live.redis) {
    throw new Error("production health still down");
  }

  const dbUrl = vars.DATABASE_URL || "";
  if (!dbUrl) throw new Error("production DATABASE_URL missing");
  const trial = await trialFacts(dbUrl);
  if (!trial.program || trial.welcomeKrw !== 10000) {
    throw new Error("trial_program_config missing or welcome_krw != 10000");
  }
  if (!trial.sku || !trial.skuAvailable || !trial.skuTrial || !trial.skuFresh) {
    throw new Error("trial SKU missing or not participable");
  }

  process.stdout.write(
    JSON.stringify(
      {
        target: "production-render-api",
        operatorClicks: 0,
        cloudflareProduction: 0,
        rel701: 0,
        moneyReleased: "NO",
        health: {
          ok: live.ok,
          gitSha: live.gitSha,
          db: live.db,
          redis: live.redis,
        },
        resendPresent: true,
        trial: {
          program: true,
          welcomeKrw: trial.welcomeKrw,
          sku: TRIAL_SKU_ID,
          available: true,
          fresh: true,
        },
        repaired,
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((err) => {
  process.stderr.write(
    "[ops-auto-backend] FAIL: " + String(err && err.message ? err.message : err) + "\n",
  );
  process.exit(1);
});
