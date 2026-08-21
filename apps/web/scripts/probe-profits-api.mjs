/**
 * Phase 10 — API chain only. secret/token 출력 금지.
 * REAL_RUNTIME_E2E 증거로 쓰지 않는다.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "../../..");
const require = createRequire(path.join(root, "tooling/verify/stack-lock.cjs"));
const { loadDotEnv } = require(path.join(root, "tooling/deploy/lib/env.cjs"));
const jwtCore = require(path.join(root, "services/api-nest/jwt.core.cjs"));

loadDotEnv();

const outDir = path.join(root, "_tmp_spark_dash_refs");
const apiBase = (process.env.API_HOST ?? "http://localhost:4000").startsWith("http")
  ? process.env.API_HOST.replace(/\/$/, "")
  : `http://${process.env.API_HOST ?? "localhost:4000"}`;
const url = `${apiBase}/api/v1/opportunities`;

function redact(body) {
  if (body == null || typeof body !== "object") return body;
  const copy = JSON.parse(JSON.stringify(body));
  for (const key of Object.keys(copy)) {
    if (/secret|token|authorization|password|cookie/i.test(key)) {
      copy[key] = "[redacted]";
    }
  }
  return copy;
}

async function getFeed(headers) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", ...headers },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

const unauth = await getFeed({});
let authed = null;
const secret = process.env.JWT_USER_SECRET ?? "";
if (secret.length >= 32) {
  const token = jwtCore.sign(
    { sub: "00000000-0000-4000-8000-000000000001" },
    secret,
    {
      issuer: "ai-profit-os-nest",
      audience: "peotteok-user",
      expiresInSec: 180,
    },
  );
  authed = await getFeed({ Authorization: `Bearer ${token}` });
}

const first = Array.isArray(authed?.json?.items) ? authed.json.items[0] : null;
const report = {
  schema: "profits.api-runtime-evidence.v1",
  url,
  unauth: {
    status: unauth.status,
    message: unauth.json?.message ?? null,
    authRequired: unauth.status === 401 && String(unauth.json?.message ?? "").includes("AUTH_REQUIRED"),
  },
  authed: authed
    ? {
        status: authed.status,
        itemCount: Array.isArray(authed.json?.items) ? authed.json.items.length : null,
        hasPricingKey: first ? Object.hasOwn(first, "pricing") : false,
        envelopeHasPricing: authed.json && Object.hasOwn(authed.json, "pricing"),
        firstKeys: first ? Object.keys(first).sort() : [],
        buyMarketLabelKo: first?.buyMarketLabelKo ?? null,
        assetImageUrlPresent: first ? Object.hasOwn(first, "assetImageUrl") : false,
        money: first
          ? {
              expectedProfitUsdtType: typeof first.expectedProfitUsdt,
              requiredCapitalUsdtType: typeof first.requiredCapitalUsdt,
              marginPctType: typeof first.marginPct,
              expectedProfitKrwApproxType: typeof first.expectedProfitKrwApprox,
            }
          : null,
        ghost: first
          ? {
              official: Object.hasOwn(first, "official"),
              partner: Object.hasOwn(first, "partner"),
              partnerLabel: Object.hasOwn(first, "partnerLabel"),
            }
          : null,
      }
    : { status: null, reason: "JWT_USER_SECRET unavailable or short" },
  freshness: {
    canonicalFilter: "isPriceFresh + DEFAULT_PRICE_STALE_MAX_SEC=3",
    expectedEmptyWhenAllStale: true,
  },
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "profits-api-runtime-evidence.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(redact(report), null, 2));

const okUnauth = report.unauth.authRequired;
const okAuthed =
  !authed ||
  (authed.status === 200 &&
    Array.isArray(authed.json?.items) &&
    report.authed.hasPricingKey === false &&
    report.authed.envelopeHasPricing === false);
if (!okUnauth || !okAuthed) process.exit(1);
