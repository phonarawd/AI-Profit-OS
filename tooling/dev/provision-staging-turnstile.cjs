#!/usr/bin/env node
/**
 * 로컬 .env의 TURNSTILE_SECRET_KEY 만 staging Render env에 병합한다.
 * TURNSTILE_SURFACE=staging 도 같이 넣는다.
 * 기존 env를 지우지 않는다. 값을 출력하지 않는다. production 거절.
 */
"use strict";

const { loadDotEnv } = require("../deploy/lib/env.cjs");

loadDotEnv();

const STAGING_SERVICE = "srv-dabph32fngtc73esj8rg";
const PRODUCTION_SERVICE = "srv-da5r1tqjobas73fl16dg";
const SECRET_KEY = "TURNSTILE_SECRET_KEY";
const SURFACE_KEY = "TURNSTILE_SURFACE";

async function render(pathname, init) {
  const token = process.env.RENDER_API_KEY || "";
  if (!token) throw new Error("RENDER_API_KEY missing");
  const res = await fetch("https://api.render.com/v1" + pathname, {
    ...init,
    headers: {
      authorization: "Bearer " + token,
      accept: "application/json",
      ...(init && init.body ? { "content-type": "application/json" } : {}),
      ...(init && init.headers ? init.headers : {}),
    },
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

async function main() {
  const serviceId = process.env.RENDER_STAGING_SERVICE_ID || STAGING_SERVICE;
  if (serviceId === PRODUCTION_SERVICE) throw new Error("refused: production service id");
  if (serviceId !== STAGING_SERVICE) throw new Error("refused: unknown service id");

  const secret = process.env[SECRET_KEY] ? String(process.env[SECRET_KEY]).trim() : "";
  if (!secret) throw new Error("local missing " + SECRET_KEY);

  const current = rowsToMap(await render("/services/" + serviceId + "/env-vars"));
  if (!current.DATABASE_URL) throw new Error("refused: staging DATABASE_URL missing before merge");
  const beforeCount = Object.keys(current).length;

  current[SECRET_KEY] = secret;
  current[SURFACE_KEY] = "staging";

  const body = Object.entries(current).map(([key, value]) => ({ key, value }));
  if (body.length < beforeCount) throw new Error("refused: merge would drop env vars");

  await render("/services/" + serviceId + "/env-vars", {
    method: "PUT",
    body: JSON.stringify(body),
  });

  const after = rowsToMap(await render("/services/" + serviceId + "/env-vars"));
  process.stdout.write(
    JSON.stringify(
      {
        target: "staging-render-service",
        productionApply: 0,
        beforeCount,
        afterCount: Object.keys(after).length,
        keysSet: [SECRET_KEY, SURFACE_KEY],
        present: {
          [SECRET_KEY]: Boolean(after[SECRET_KEY]),
          [SURFACE_KEY]: after[SURFACE_KEY] === "staging",
        },
        databaseUrlKept: Boolean(after.DATABASE_URL),
        valuesPrinted: false,
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((err) => {
  process.stderr.write(
    "[provision-staging-turnstile] FAIL: " +
      String(err && err.message ? err.message : err) +
      "\n",
  );
  process.exit(1);
});
