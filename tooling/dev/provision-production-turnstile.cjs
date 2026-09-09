#!/usr/bin/env node
/**
 * 운영 Nest에 Turnstile 시크릿만 넣는다.
 * 전체 env PUT 금지. 비밀값 출력 금지. Cloudflare 웹 승격 0.
 */
"use strict";

const { loadDotEnv } = require("../deploy/lib/env.cjs");

loadDotEnv();

const PRODUCTION_SERVICE = "srv-da5r1tqjobas73fl16dg";
const STAGING_SERVICE = "srv-dabph32fngtc73esj8rg";
const KEYS = ["TURNSTILE_SECRET_KEY", "TURNSTILE_SURFACE"];

async function render(pathname, init) {
  const token = process.env.RENDER_API_KEY || "";
  if (!token) throw new Error("RENDER_API_KEY missing");
  const res = await fetch("https://api.render.com/v1" + pathname, {
    ...init,
    headers: {
      authorization: "Bearer " + token,
      accept: "application/json",
      ...(init && init.body ? { "content-type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error("render http " + res.status + (text ? " " + text.slice(0, 80) : ""));
  }
  const raw = await res.text();
  return raw ? JSON.parse(raw) : {};
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
  const serviceId = process.env.RENDER_PRODUCTION_SERVICE_ID || PRODUCTION_SERVICE;
  if (serviceId === STAGING_SERVICE) throw new Error("refused: staging service id");
  if (serviceId !== PRODUCTION_SERVICE) throw new Error("refused: unknown service id");

  const staging = rowsToMap(
    await render("/services/" + STAGING_SERVICE + "/env-vars?limit=100"),
  );
  const secret =
    (staging.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY || "").trim();
  if (!secret || secret.length < 20) throw new Error("TURNSTILE_SECRET_KEY missing");

  const before = rowsToMap(
    await render("/services/" + serviceId + "/env-vars?limit=100"),
  );
  const beforeCount = Object.keys(before).length;
  if (beforeCount < 10) throw new Error("refused: production env unexpectedly thin");

  await render("/services/" + serviceId + "/env-vars/TURNSTILE_SECRET_KEY", {
    method: "PUT",
    body: JSON.stringify({ value: secret }),
  });
  await render("/services/" + serviceId + "/env-vars/TURNSTILE_SURFACE", {
    method: "PUT",
    body: JSON.stringify({ value: "production" }),
  });

  const after = rowsToMap(
    await render("/services/" + serviceId + "/env-vars?limit=100"),
  );
  if (Object.keys(after).length < beforeCount) {
    throw new Error("refused: env count dropped");
  }
  if (!after.TURNSTILE_SECRET_KEY) throw new Error("missing after put: TURNSTILE_SECRET_KEY");
  if (after.TURNSTILE_SURFACE !== "production") {
    throw new Error("TURNSTILE_SURFACE must be production");
  }

  process.stdout.write(
    JSON.stringify(
      {
        target: "production-render-api",
        keysSet: KEYS,
        present: {
          TURNSTILE_SECRET_KEY: true,
          TURNSTILE_SURFACE: after.TURNSTILE_SURFACE === "production",
        },
        rel701: 0,
        moneyReleased: "NO",
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((err) => {
  process.stderr.write(
    "[provision-production-turnstile] FAIL: " +
      String(err && err.message ? err.message : err) +
      "\n",
  );
  process.exit(1);
});
