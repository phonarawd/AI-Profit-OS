#!/usr/bin/env node
/**
 * Local TRON readiness smoke — never prints secret values.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const { applyTronLocalEnv } = require("./load-env.cjs");
const { maskStatus, readEnvFile, LOCAL_ENV_FILE } = require("./lib/local-env.cjs");

const root = path.resolve(__dirname, "../..");
const fails = [];

function must(cond, msg) {
  if (!cond) fails.push(msg);
}

const applied = applyTronLocalEnv({ overwrite: true });
const mask = applied.mask;
for (const k of [
  "TRONGRID_API_KEY",
  "TATUM_MAINNET_API_KEY",
  "TATUM_TESTNET_API_KEY",
  "TRON_TREASURY_ADDRESS",
  "TRON_HOT_WALLET_XPUB",
  "TATUM_KMS_SIGNATURE_ID",
  "INTERNAL_WALLET_TICK_TOKEN",
]) {
  must(mask[k] === "set", `env missing: ${k}`);
}

must(
  /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(process.env.TRON_TREASURY_ADDRESS || ""),
  "treasury format",
);

async function trongrid() {
  const base = (process.env.TRONGRID_BASE_URL || "https://api.trongrid.io").replace(
    /\/$/,
    "",
  );
  const addr = process.env.TRON_TREASURY_ADDRESS;
  const res = await fetch(`${base}/v1/accounts/${addr}`, {
    headers: {
      Accept: "application/json",
      "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY,
    },
  });
  must(res.ok, `trongrid http ${res.status}`);
}

async function derive() {
  const r = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "-e",
      `
import { allocateCanonicalTrc20Address, resolveCanonicalTrc20Deriver } from './services/api-nest/src/wallet/tron-address.ts';
const d = resolveCanonicalTrc20Deriver();
if (!d) { console.log(JSON.stringify({ok:false})); process.exit(2); }
const a0 = allocateCanonicalTrc20Address({ derivationIndex: 0, persist: (x) => x });
console.log(JSON.stringify({ ok: true, index0: a0.trc20Address, len: a0.trc20Address.length }));
`,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    },
  );
  if (r.status !== 0) {
    fails.push("derive exit " + r.status);
    return null;
  }
  const line = (r.stdout || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("{"))
    .pop();
  try {
    const j = JSON.parse(line);
    must(j.ok === true && j.len >= 34, "derive address");
    return j;
  } catch {
    fails.push("derive parse");
    return null;
  }
}

function kmsVerify() {
  const r = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      "tooling/tron/verify-kms.ps1",
    ],
    { cwd: root, encoding: "utf8" },
  );
  must(r.status === 0, "kms verify");
}

(async () => {
  await trongrid();
  const d = await derive();
  kmsVerify();
  const out = {
    ok: fails.length === 0,
    mask: maskStatus(readEnvFile(LOCAL_ENV_FILE)),
    derive: d
      ? { index0: d.index0, len: d.len }
      : null,
    fails,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
