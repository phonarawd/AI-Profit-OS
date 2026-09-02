/**
 * staging: upsert deposit_config.usdt_onchain refs only (no API keys).
 * production: hard-blocked unless AIPO_PRODUCTION_APPROVAL=YES.
 */
const fs = require("fs");
const path = require("path");
const { applyTronLocalEnv } = require("./load-env.cjs");

const mode = (() => {
  const i = process.argv.indexOf("--mode");
  return i >= 0 ? String(process.argv[i + 1] || "") : "dry-run";
})();

const POLICY = {
  network: "TRC20",
  tronGridBaseUrl: "https://api.trongrid.io",
  chainWatcherMode: "event_stream",
  usdtUiConfirmations: 1,
  usdtLedgerConfirmations: 19,
  usdtContract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  usdtWithdrawNetworkFeeUsdt: "1",
  minTrxStakeForSweeper: "5000",
  energyDelegateEnabled: true,
  sweeperPaused: false,
  minHoldingHours: 24,
  priceStaleMaxSec: 3,
  requireMinProfitUsdt: true,
  hotWalletXpubRef: "env:TRON_HOT_WALLET_XPUB",
  treasuryHotAddressRef: "env:TRON_TREASURY_ADDRESS",
};

if (mode === "production" && process.env.AIPO_PRODUCTION_APPROVAL !== "YES") {
  console.error(
    "PRODUCTION_BLOCKED: set AIPO_PRODUCTION_APPROVAL=YES after explicit Founder approval",
  );
  process.exit(2);
}

if (mode === "dry-run") {
  console.log(
    JSON.stringify(
      {
        mode,
        policy: POLICY,
        secretsRejected: ["tronGridApiKey"],
        krw: "UNKNOWN invent 금지",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (mode !== "staging" && mode !== "production") {
  console.error("UNKNOWN_MODE");
  process.exit(1);
}

applyTronLocalEnv({ overwrite: true });

const url = (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "").trim();
if (!url) {
  // Without DATABASE_URL, emit SQL for operator/MCP apply (no secrets).
  const sql = `-- ${mode} deposit_config usdt_onchain patch (refs only; no API keys)
UPDATE public.deposit_config
SET usdt_onchain = COALESCE(usdt_onchain, '{}'::jsonb) || '${JSON.stringify(
    POLICY,
  ).replace(/'/g, "''")}'::jsonb,
    updated_at = now()
WHERE id IS NOT NULL;
`;
  const out = path.join(
    process.cwd(),
    "tooling",
    "tron",
    `_deposit-config.${mode}.sql`,
  );
  fs.writeFileSync(out, sql, "utf8");
  console.log(
    JSON.stringify({
      mode,
      ok: true,
      applied: false,
      reason: "DATABASE_URL_MISSING",
      sqlPath: out,
      secretsRejected: ["tronGridApiKey"],
    }),
  );
  process.exit(0);
}

console.error("DIRECT_PG_APPLY_NOT_IMPLEMENTED — use MCP/SQL path");
process.exit(3);
