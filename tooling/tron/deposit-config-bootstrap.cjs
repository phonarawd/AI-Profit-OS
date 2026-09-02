const mode = (() => { const i = process.argv.indexOf("--mode"); return i>=0 ? String(process.argv[i+1]||"") : "dry-run"; })();
const POLICY = { network:"TRC20", tronGridBaseUrl:"https://api.trongrid.io", chainWatcherMode:"event_stream", usdtUiConfirmations:1, usdtLedgerConfirmations:19, usdtContract:"TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", usdtWithdrawNetworkFeeUsdt:"1", minTrxStakeForSweeper:"5000", energyDelegateEnabled:true, sweeperPaused:false, minHoldingHours:24, priceStaleMaxSec:3, requireMinProfitUsdt:true, hotWalletXpubRef:"env:TRON_HOT_WALLET_XPUB", treasuryHotAddressRef:"env:TRON_TREASURY_ADDRESS" };
if (mode === "production" && process.env.AIPO_PRODUCTION_APPROVAL !== "YES") {
  console.error("PRODUCTION_BLOCKED: set AIPO_PRODUCTION_APPROVAL=YES after explicit Founder approval");
  process.exit(2);
}
if (mode === "production") {
  console.error("PRODUCTION_MUTATION_NOT_IMPLEMENTED_IN_THIS_SLICE");
  process.exit(3);
}
console.log(JSON.stringify({ mode, policy: POLICY, secretsRejected:["tronGridApiKey"], krw:"UNKNOWN invent 금지" }, null, 2));
