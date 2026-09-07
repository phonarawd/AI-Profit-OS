#!/usr/bin/env node
/**
 * 전용 staging origin + staging API health 실측.
 * J0/J1/J2/J3 PASS를 선언하지 않는다. secret을 출력하지 않는다.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const OUT = path.join(root, "governance/release-master/S5-STAGING-ORIGIN-PROBE.v1.json");

const TARGETS = [
  { id: "staging-api-health", url: "https://ai-profit-os-staging.onrender.com/api/v1/health", kind: "json" },
  { id: "dedicated-web-home", url: "https://ai-profit-web-dedicated.ebay-adapter.workers.dev/", kind: "html" },
  { id: "dedicated-web-login", url: "https://ai-profit-web-dedicated.ebay-adapter.workers.dev/auth/login", kind: "html" },
  { id: "dedicated-web-signup", url: "https://ai-profit-web-dedicated.ebay-adapter.workers.dev/auth/signup", kind: "html" },
  { id: "dedicated-web-onboarding", url: "https://ai-profit-web-dedicated.ebay-adapter.workers.dev/onboarding", kind: "html" },
  { id: "dedicated-web-complete-profile", url: "https://ai-profit-web-dedicated.ebay-adapter.workers.dev/auth/complete-profile", kind: "html" },
  { id: "dedicated-ops-admin", url: "https://ai-profit-ops-dedicated.ebay-adapter.workers.dev/admin", kind: "admin" },
  { id: "staging-auth-login-unauth", url: "https://ai-profit-os-staging.onrender.com/api/v1/auth/login", kind: "auth-deny", method: "POST" },
  { id: "staging-onboarding-unauth", url: "https://ai-profit-os-staging.onrender.com/api/v1/me/product-onboarding", kind: "auth-deny", method: "GET" },
];

function redact(text) {
  return String(text || "")
    .replace(/postgres(?:ql)?:\/\/[^\s"'\\]+/gi, "postgres://redacted")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "redacted@host");
}

async function probe(target) {
  const started = Date.now();
  try {
    const method = target.method || "GET";
    const headers = {
      accept: target.kind === "html" || target.kind === "admin" ? "text/html" : "application/json",
    };
    if (method === "POST") headers["content-type"] = "application/json";
    const res = await fetch(target.url, {
      method,
      redirect: "manual",
      headers,
      body: method === "POST" ? "{}" : undefined,
    });
    const loc = res.headers.get("location") || "";
    const raw = await res.text();
    const body = redact(raw).slice(0, 1200);
    const row = {
      id: target.id,
      status: res.status,
      locationHost: loc ? new URL(loc, target.url).host : null,
      accessRedirect: /cloudflareaccess\.com|cdn-cgi\/access/i.test(loc),
      xOpenNext: res.headers.get("x-opennext") === "1",
      ms: Date.now() - started,
    };
    if (target.kind === "json") {
      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
      row.ok = parsed && parsed.ok === true && parsed.service === "api-nest";
      row.gitSha = parsed && typeof parsed.gitSha === "string" ? parsed.gitSha : null;
      row.environment = parsed && parsed.environment ? parsed.environment : null;
      row.migrationHead = parsed && parsed.migrationHead ? parsed.migrationHead : null;
      row.dbOk = parsed && parsed.db && parsed.db.ok === true;
      row.redisOk = parsed && parsed.redis && parsed.redis.ok === true;
    } else if (target.kind === "auth-deny") {
      row.ok = res.status === 400 || res.status === 401 || res.status === 403 || res.status === 503;
      if (/TURNSTILE_UNAVAILABLE/.test(body)) {
        row.turnstileUnavailable = true;
      }
      if (/TURNSTILE_FAILED/.test(body)) {
        row.turnstileFailedClosed = true;
      }
    } else if (target.kind === "admin") {
      row.ok =
        res.status === 401 ||
        res.status === 403 ||
        res.status === 503 ||
        (res.status === 302 && row.accessRedirect) ||
        res.status === 200 ||
        res.status === 307 ||
        res.status === 308;
      row.reachedHtml = /퍼뜩|admin|로그인|login/i.test(body);
    } else {
      row.ok = res.status === 200 && (row.xOpenNext || /퍼뜩|Next\.js/i.test(body));
    }
    return row;
  } catch (err) {
    return {
      id: target.id,
      ok: false,
      status: 0,
      error: redact(err && err.message ? err.message : err),
      ms: Date.now() - started,
    };
  }
}

async function main() {
  const probes = [];
  for (const target of TARGETS) {
    probes.push(await probe(target));
  }
  const health = probes.find((p) => p.id === "staging-api-health") || {};
  const ops = probes.find((p) => p.id === "dedicated-ops-admin") || {};
  const evidence = {
    schema: "s5-staging-origin-probe.v1",
    recordedAt: new Date().toISOString(),
    productionDeploy: 0,
    j0: "NOT_RUN",
    j1: "NOT_RUN",
    j2: "NOT_RUN",
    j3: "NOT_RUN",
    note: "HTTP origin probe only. Not auth E2E. Not J0. Dedicated web 200 is not Access/J0. Empty-token login 400/503 is fail-closed, not J1 PASS.",
    stagingApi: {
      gitSha: health.gitSha || null,
      environment: health.environment || null,
      migrationHead: health.migrationHead || null,
      dbOk: health.dbOk === true,
      redisOk: health.redisOk === true,
    },
    turnstileConfigured: probes.some((p) => p.turnstileUnavailable === true)
      ? false
      : probes.some((p) => p.turnstileFailedClosed === true)
        ? true
        : null,
    accessEdgeOnDedicatedOps: ops.accessRedirect === true,
    probes,
  };
  fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2) + "\n");
  process.stdout.write(JSON.stringify(evidence, null, 2) + "\n");
}

main().catch((err) => {
  process.stderr.write("[s5-staging-origin-probe] FAIL: " + redact(err) + "\n");
  process.exit(1);
});
