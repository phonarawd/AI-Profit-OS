#!/usr/bin/env node
/** Read-only health smoke for the isolated P0-C FX Workers. */
"use strict";

const API = "https://api.cloudflare.com/client/v4";
const TIMEOUT_MS = 8_000;
const WORKERS = Object.freeze({
  coingecko: { production: "coingecko-adapter", preview: "coingecko-adapter-preview" },
  frankfurter: { production: "frankfurter-adapter", preview: "frankfurter-adapter-preview" },
});

function parseCli(argv) {
  const kv = {};
  const positional = [];
  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq > 2) kv[arg.slice(2, eq)] = arg.slice(eq + 1);
      continue;
    }
    positional.push(arg);
  }
  return { kv, positional };
}

function normalizeTarget(target) {
  if (target === "prod") return "production";
  if (target === "staging") return "preview";
  if (target === "production" || target === "preview") return target;
  throw new Error(`invalid target ${target}`);
}

async function boundedFetch(url, init = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function cloudflareJson(url, token) {
  const res = await boundedFetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.success !== true) {
    throw new Error(`Cloudflare API read failed (${res.status})`);
  }
  return body.result;
}

async function accountWorkersSubdomain(accountId, token) {
  const result = await cloudflareJson(`${API}/accounts/${encodeURIComponent(accountId)}/workers/subdomain`, token);
  if (!result || typeof result.subdomain !== "string" || !result.subdomain.trim()) {
    throw new Error("workers.dev account subdomain missing");
  }
  return result.subdomain.trim();
}

async function assertScriptSubdomainEnabled(accountId, token, scriptName) {
  const result = await cloudflareJson(
    `${API}/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(scriptName)}/subdomain`,
    token,
  );
  if (!result || result.enabled !== true) {
    throw new Error(`${scriptName} workers.dev subdomain is not enabled`);
  }
}

function healthUrl(scriptName, subdomain) {
  return `https://${scriptName}.${subdomain}.workers.dev/health`;
}

function validateHealth(kind, target, body) {
  const expectedAdapter = kind === "coingecko" ? "coingecko" : "frankfurter";
  const expectedService = kind === "coingecko" ? "coingecko-adapter" : "frankfurter-adapter";
  const errors = [];
  if (!body || typeof body !== "object") errors.push("body missing");
  if (body?.ok !== true) errors.push("ok must be true");
  if (body?.adapterId !== expectedAdapter) errors.push(`adapterId must be ${expectedAdapter}`);
  if (body?.service !== expectedService) errors.push(`service must be ${expectedService}`);
  if (body?.role !== "fx") errors.push("role must be fx");

  if (target === "production") {
    if (body?.ingestConfigured !== true) errors.push("ingestConfigured must be true");
    if (body?.manualTickEnabled !== false) errors.push("manualTickEnabled must be false");
    if (kind === "coingecko" && body?.credentialsConfigured !== true) {
      errors.push("credentialsConfigured must be true");
    }
  } else if (body?.manualTickEnabled !== true) {
    errors.push("preview manualTickEnabled must be true");
  }
  return errors;
}

async function readHealth(url) {
  const res = await boundedFetch(url, { headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`health HTTP ${res.status}`);
  return body;
}

async function main() {
  const { kv, positional } = parseCli(process.argv);
  const target = normalizeTarget(positional[0] || "preview");
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const token = process.env.CLOUDFLARE_API_TOKEN || "";

  let coingeckoUrl = kv["coingecko-url"] || "";
  let frankfurterUrl = kv["frankfurter-url"] || "";

  if (!coingeckoUrl || !frankfurterUrl) {
    if (!accountId || !token) {
      throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required when explicit health URLs are not supplied");
    }
    const subdomain = await accountWorkersSubdomain(accountId, token);
    const cgScript = WORKERS.coingecko[target];
    const ffScript = WORKERS.frankfurter[target];
    await Promise.all([
      assertScriptSubdomainEnabled(accountId, token, cgScript),
      assertScriptSubdomainEnabled(accountId, token, ffScript),
    ]);
    coingeckoUrl = healthUrl(cgScript, subdomain);
    frankfurterUrl = healthUrl(ffScript, subdomain);
  }

  const [coingecko, frankfurter] = await Promise.all([
    readHealth(coingeckoUrl),
    readHealth(frankfurterUrl),
  ]);

  const failures = [
    ...validateHealth("coingecko", target, coingecko).map((x) => `coingecko: ${x}`),
    ...validateHealth("frankfurter", target, frankfurter).map((x) => `frankfurter: ${x}`),
  ];
  if (failures.length) {
    console.error("[cf:fx-health] FAIL\n- " + failures.join("\n- "));
    process.exit(1);
  }

  console.log(`target=${target}`);
  console.log("coingecko_health=PASS");
  console.log("frankfurter_health=PASS");
  console.log("mutation=0");
  console.log("[cf:fx-health] PASS · read-only");
}

const exported = {
  API,
  TIMEOUT_MS,
  WORKERS,
  parseCli,
  normalizeTarget,
  healthUrl,
  validateHealth,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`[cf:fx-health] FAIL: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
} else {
  module.exports = exported;
}
