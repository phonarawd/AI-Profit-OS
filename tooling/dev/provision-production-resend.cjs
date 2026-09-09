#!/usr/bin/env node
/**
 * 운영 Nest에 Resend만 넣는다.
 * 전체 env PUT 금지(DATABASE_URL 등 유실 방지). 비밀값 출력 금지.
 * Cloudflare / REL-701 / 실돈 스위치와 무관.
 */
"use strict";

const { loadDotEnv } = require("../deploy/lib/env.cjs");

loadDotEnv();

const PRODUCTION_SERVICE = "srv-da5r1tqjobas73fl16dg";
const STAGING_SERVICE = "srv-dabph32fngtc73esj8rg";
const KEYS = ["RESEND_API_KEY", "RESEND_FROM_EMAIL"];

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

function pickResend(source, label) {
  const out = {};
  for (const key of KEYS) {
    const value = source[key] ? String(source[key]).trim() : "";
    if (!value) throw new Error(label + " missing " + key);
    out[key] = value;
  }
  if (!out.RESEND_FROM_EMAIL.endsWith("@hiptk.app")) {
    throw new Error("RESEND_FROM_EMAIL must be @hiptk.app");
  }
  if (out.RESEND_API_KEY.length < 20) {
    throw new Error("RESEND_API_KEY too short");
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
  let source = "staging";
  let values;
  try {
    values = pickResend(staging, "staging");
  } catch {
    source = "local-env";
    values = pickResend(process.env, "local");
  }

  const before = rowsToMap(await render("/services/" + serviceId + "/env-vars?limit=100"));
  const beforeCount = Object.keys(before).length;
  if (beforeCount < 10) throw new Error("refused: production env unexpectedly thin");

  for (const key of KEYS) {
    await render("/services/" + serviceId + "/env-vars/" + encodeURIComponent(key), {
      method: "PUT",
      body: JSON.stringify({ value: values[key] }),
    });
  }

  const after = rowsToMap(await render("/services/" + serviceId + "/env-vars?limit=100"));
  const afterCount = Object.keys(after).length;
  if (afterCount < beforeCount) throw new Error("refused: env count dropped");
  for (const key of KEYS) {
    if (!after[key]) throw new Error("missing after put: " + key);
  }

  process.stdout.write(
    JSON.stringify(
      {
        target: "production-render-api",
        cloudflareProduction: 0,
        rel701: 0,
        moneyReleased: "NO",
        source,
        beforeCount,
        afterCount,
        keysSet: KEYS,
        present: Object.fromEntries(KEYS.map((k) => [k, Boolean(after[k])])),
        fromDomain: String(after.RESEND_FROM_EMAIL || "").split("@")[1] || "",
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((err) => {
  process.stderr.write(
    "[provision-production-resend] FAIL: " +
      String(err && err.message ? err.message : err) +
      "\n",
  );
  process.exit(1);
});
