import {
  CONFIG_NOT_READY,
  DepositConfigNotReadyError,
  parsePersistedDepositConfig,
} from "../../services/api-nest/src/wallet/deposit-config.ready.ts";

function validRow(over: Record<string, unknown> = {}) {
  return {
    config_version: 1,
    krw: {
      bankName: "KB",
      accountNumber: "123",
      accountHolder: "A",
      noticeKo: "n",
      krwWithdrawFeeKrw: 0,
    },
    usdt_onchain: {
      network: "TRC20",
      tronGridBaseUrl: "https://api.trongrid.io",
      chainWatcherMode: "event_stream",
      usdtUiConfirmations: 1,
      usdtLedgerConfirmations: 19,
      usdtContract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      hotWalletXpubRef: "secret:hot-wallet-xpub",
      treasuryHotAddressRef: "secret:treasury-hot",
      energyDelegateEnabled: true,
      usdtWithdrawNetworkFeeUsdt: "1",
      minTrxStakeForSweeper: "5000",
      sweeperPaused: false,
    },
    withdraw_guards: { minHoldingHours: 24 },
    pricing_guards: { priceStaleMaxSec: 3, requireMinProfitUsdt: true },
    updated_at: new Date("2026-08-31T00:00:00.000Z"),
    updated_by_admin_id: "00000000-0000-4000-8000-000000000001",
    ...over,
  };
}

function expectReady(row: unknown) {
  const cfg = parsePersistedDepositConfig(row);
  if (cfg.usdtOnchain.usdtWithdrawNetworkFeeUsdt !== "1") {
    throw new Error("valid persisted config should parse");
  }
}

function expectBlock(row: unknown, kind: string) {
  try {
    parsePersistedDepositConfig(row);
    throw new Error("expected CONFIG_NOT_READY for " + kind);
  } catch (err) {
    if (!(err instanceof DepositConfigNotReadyError)) throw err;
    if (err.code !== CONFIG_NOT_READY) {
      throw new Error("code must be CONFIG_NOT_READY");
    }
    if (!String(err.reason).includes(kind) && err.reason !== kind) {
      throw new Error("reason " + err.reason + " did not include " + kind);
    }
  }
}

expectBlock(null, "missing_row");
expectReady(validRow());

const missingFee = validRow();
delete (missingFee.usdt_onchain as { usdtWithdrawNetworkFeeUsdt?: string })
  .usdtWithdrawNetworkFeeUsdt;
expectBlock(missingFee, "partial");

const missingPause = validRow();
delete (missingPause.usdt_onchain as { sweeperPaused?: boolean }).sweeperPaused;
expectBlock(missingPause, "partial");

const missingHolding = validRow();
delete (missingHolding.withdraw_guards as { minHoldingHours?: number })
  .minHoldingHours;
expectBlock(missingHolding, "partial");

const badFee = validRow();
(badFee.usdt_onchain as { usdtWithdrawNetworkFeeUsdt: string }).usdtWithdrawNetworkFeeUsdt =
  "not-a-decimal";
expectBlock(badFee, "malformed");

const badNetwork = validRow();
(badNetwork.usdt_onchain as { network: string }).network = "ERC20";
expectBlock(badNetwork, "malformed");

const emptyXpub = validRow();
(emptyXpub.usdt_onchain as { hotWalletXpubRef: string }).hotWalletXpubRef = "";
expectBlock(emptyXpub, "partial");

const emptyBank = validRow();
(emptyBank.krw as { bankName: string }).bankName = "";
expectBlock(emptyBank, "partial");

const emptyAccount = validRow();
(emptyAccount.krw as { accountNumber: string }).accountNumber = "";
expectBlock(emptyAccount, "partial");

const emptyHolder = validRow();
(emptyHolder.krw as { accountHolder: string }).accountHolder = "";
expectBlock(emptyHolder, "partial");

const whitespaceBank = validRow();
(whitespaceBank.krw as { bankName: string }).bankName = "   ";
expectBlock(whitespaceBank, "partial");

const emptyNotice = validRow();
(emptyNotice.krw as { noticeKo: string }).noticeKo = "";
expectReady(emptyNotice);

console.log("[deposit-config-fail-closed.runtime] PASS");
