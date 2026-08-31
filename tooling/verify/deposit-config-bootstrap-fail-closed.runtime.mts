/**
 * Admin bootstrap/repair behavioral tests.
 * Incomplete PATCH must not INSERT/UPDATE deposit_config.
 */
import {
  CONFIG_NOT_READY,
  DepositConfigNotReadyError,
  DepositConfigWriteCore,
  DepositConfigWriteError,
  parsePersistedDepositConfig,
  type DepositConfigRow,
} from "../../services/api-nest/src/wallet/deposit-config.ready.ts";
import {
  DAY1_DEPOSIT_CONFIG_DEFAULTS,
  type DepositConfigPatchInput,
} from "../../services/api-nest/src/wallet/wallet.types.ts";

const ADMIN_ID = "00000000-0000-4000-8000-000000000001";

type MockState = {
  row: DepositConfigRow | null;
  inserts: number;
  updates: number;
  audits: number;
};

function validRow(over: Partial<DepositConfigRow> = {}): DepositConfigRow {
  return {
    config_version: 1,
    krw: {
      bankName: "KB국민",
      accountNumber: "123-456-789",
      accountHolder: "퍼뜩",
      noticeKo: "입금자명 확인",
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
    updated_by_admin_id: ADMIN_ID,
    ...over,
  };
}

function completeBootstrap(
  over: Partial<DepositConfigPatchInput> = {},
): DepositConfigPatchInput {
  return {
    updatedByAdminId: ADMIN_ID,
    changeReason: "initial config",
    krw: {
      bankName: "KB국민",
      accountNumber: "123-456-789",
      accountHolder: "퍼뜩",
      noticeKo: "",
      krwWithdrawFeeKrw: 0,
    },
    usdtOnchain: {
      tronGridBaseUrl: "https://api.trongrid.io",
      hotWalletXpubRef: "secret:hot-wallet-xpub",
      treasuryHotAddressRef: "secret:treasury-hot",
      energyDelegateEnabled: true,
      usdtWithdrawNetworkFeeUsdt: "1",
      minTrxStakeForSweeper: "5000",
      sweeperPaused: false,
    },
    withdrawGuards: { minHoldingHours: 24 },
    pricingGuards: { priceStaleMaxSec: 3 },
    ...over,
  };
}

function rowFromParams(params: unknown[]): DepositConfigRow {
  return {
    config_version: params[0] as number,
    krw: JSON.parse(String(params[1])),
    usdt_onchain: JSON.parse(String(params[2])),
    withdraw_guards: JSON.parse(String(params[3])),
    pricing_guards: JSON.parse(String(params[4])),
    updated_at: new Date("2026-09-01T00:00:00.000Z"),
    updated_by_admin_id: String(params[5]),
  };
}

function makeHarness(row: DepositConfigRow | null) {
  const state: MockState = { row, inserts: 0, updates: 0, audits: 0 };
  const db = {
    async query(text: string) {
      if (text.includes("FROM public.deposit_config WHERE id = 1")) {
        return { rows: state.row ? [state.row] : [], rowCount: state.row ? 1 : 0 };
      }
      throw new Error("unexpected query: " + text);
    },
    async withTransaction<T>(
      fn: (client: {
        query: (
          text: string,
          params?: unknown[],
        ) => Promise<{ rows: unknown[]; rowCount: number }>;
      }) => Promise<T>,
    ) {
      const client = {
        async query(text: string, params: unknown[] = []) {
          if (text.includes("FOR UPDATE")) {
            return {
              rows: state.row ? [{ id: 1 }] : [],
              rowCount: state.row ? 1 : 0,
            };
          }
          if (text.includes("INSERT INTO public.deposit_config (")) {
            state.inserts += 1;
            state.row = rowFromParams(params);
            return { rows: [state.row], rowCount: 1 };
          }
          if (text.includes("UPDATE public.deposit_config")) {
            state.updates += 1;
            state.row = rowFromParams(params);
            return { rows: [state.row], rowCount: 1 };
          }
          if (text.includes("INSERT INTO public.deposit_config_audit")) {
            state.audits += 1;
            return { rows: [], rowCount: 1 };
          }
          throw new Error("unexpected tx query: " + text);
        },
      };
      return fn(client);
    },
  };
  return { core: new DepositConfigWriteCore(db), state };
}

function fail(msg: string): never {
  throw new Error(msg);
}

async function expectBlockedPatch(
  label: string,
  core: DepositConfigWriteCore,
  state: MockState,
  input: DepositConfigPatchInput,
) {
  const insertsBefore = state.inserts;
  const updatesBefore = state.updates;
  try {
    await core.patch(input);
    fail(label + ": expected BLOCK");
  } catch (err) {
    if (!(err instanceof DepositConfigWriteError) || err.status !== 400) {
      fail(label + ": expected DepositConfigWriteError 400, got " + String(err));
    }
  }
  if (state.inserts !== insertsBefore) {
    fail(label + ": INSERT count must stay " + insertsBefore);
  }
  if (state.updates !== updatesBefore) {
    fail(label + ": UPDATE count must stay " + updatesBefore);
  }
}

async function expectNotReady(core: DepositConfigWriteCore) {
  try {
    await core.requirePersisted();
    fail("requirePersisted must throw CONFIG_NOT_READY");
  } catch (err) {
    if (!(err instanceof DepositConfigNotReadyError)) {
      fail("requirePersisted must be CONFIG_NOT_READY, got " + String(err));
    }
    if (err.code !== CONFIG_NOT_READY || err.reason !== "missing_row") {
      fail("requirePersisted must be missing_row");
    }
  }
}

async function run() {
  {
    const { core, state } = makeHarness(null);
    await expectBlockedPatch("1 missing no-op", core, state, {
      updatedByAdminId: ADMIN_ID,
      changeReason: "initial config",
    });
    if (state.inserts !== 0) fail("1: INSERT must be 0");
  }

  {
    const { core, state } = makeHarness(null);
    await expectBlockedPatch("2 missing partial", core, state, {
      updatedByAdminId: ADMIN_ID,
      changeReason: "partial bootstrap",
      krw: { bankName: "KB국민" },
    });
    if (state.inserts !== 0) fail("2: INSERT must be 0");
  }

  {
    const { core, state } = makeHarness(null);
    const saved = await core.patch(completeBootstrap());
    if (state.inserts !== 1) fail("3: INSERT must be 1, got " + state.inserts);
    if (state.updates !== 0) fail("3: UPDATE must be 0");
    if (saved.krw.bankName !== "KB국민") fail("3: bankName not persisted");
    if (saved.krw.noticeKo !== "") fail("3: explicit empty noticeKo must persist");
    if (saved.usdtOnchain.hotWalletXpubRef !== "secret:hot-wallet-xpub") {
      fail("3: secret ref architecture must be preserved");
    }
    const ready = await core.requirePersisted();
    if (ready.krw.accountHolder !== "퍼뜩") fail("3: requirePersisted must PASS");
  }

  {
    const malformed = validRow();
    malformed.usdt_onchain = { ...malformed.usdt_onchain, network: "ERC20" as never };
    const { core, state } = makeHarness(malformed);
    await expectBlockedPatch("4 malformed partial", core, state, {
      updatedByAdminId: ADMIN_ID,
      changeReason: "pause sweeper only",
      usdtOnchain: { sweeperPaused: true },
    });
    if (state.updates !== 0) fail("4: UPDATE must be 0");
  }

  {
    const partial = validRow();
    delete (
      partial.usdt_onchain as { usdtWithdrawNetworkFeeUsdt?: string }
    ).usdtWithdrawNetworkFeeUsdt;
    const { core, state } = makeHarness(partial);
    await expectBlockedPatch("5 partial row partial patch", core, state, {
      updatedByAdminId: ADMIN_ID,
      changeReason: "unrelated fee tweak",
      krw: { krwWithdrawFeeKrw: 100 },
    });
    if (state.updates !== 0) fail("5: UPDATE must be 0");
  }

  {
    const malformed = validRow();
    malformed.usdt_onchain = { ...malformed.usdt_onchain, network: "ERC20" as never };
    const { core, state } = makeHarness(malformed);
    const saved = await core.patch(
      completeBootstrap({ changeReason: "full repair payload" }),
    );
    if (state.updates !== 1) fail("6: UPDATE must be 1, got " + state.updates);
    if (state.inserts !== 0) fail("6: INSERT must be 0");
    if (saved.usdtOnchain.network !== "TRC20") fail("6: repair must restore TRC20");
    await core.requirePersisted();
  }

  {
    const { core, state } = makeHarness(validRow());
    const saved = await core.patch({
      updatedByAdminId: ADMIN_ID,
      changeReason: "pause sweeper",
      usdtOnchain: { sweeperPaused: true },
    });
    if (state.updates !== 1) fail("7: UPDATE must be 1");
    if (state.inserts !== 0) fail("7: INSERT must be 0");
    if (saved.usdtOnchain.sweeperPaused !== true) fail("7: partial patch must apply");
    if (saved.krw.bankName !== "KB국민") fail("7: existing bank identity kept");
  }

  {
    const { core, state } = makeHarness(null);
    await expectBlockedPatch(
      "8 empty bankName",
      core,
      state,
      completeBootstrap({
        krw: {
          bankName: "",
          accountNumber: "123-456-789",
          accountHolder: "퍼뜩",
          noticeKo: "n",
          krwWithdrawFeeKrw: 0,
        },
      }),
    );
    await expectBlockedPatch(
      "8 whitespace accountHolder",
      core,
      state,
      completeBootstrap({
        krw: {
          bankName: "KB국민",
          accountNumber: "123-456-789",
          accountHolder: "   ",
          noticeKo: "n",
          krwWithdrawFeeKrw: 0,
        },
      }),
    );
    if (state.inserts !== 0) fail("8: INSERT must be 0");
  }

  {
    const { core, state } = makeHarness(null);
    await expectNotReady(core);
    if (state.inserts !== 0 || state.updates !== 0) {
      fail("9: requirePersisted must not mutate");
    }
  }

  {
    const defaults = DAY1_DEPOSIT_CONFIG_DEFAULTS;
    if (defaults.krw.bankName !== "" || defaults.krw.accountHolder !== "") {
      fail("10: fixture still uses empty KRW identity");
    }
    try {
      parsePersistedDepositConfig({
        config_version: defaults.configVersion,
        krw: defaults.krw,
        usdt_onchain: defaults.usdtOnchain,
        withdraw_guards: defaults.withdrawGuards,
        pricing_guards: defaults.pricingGuards,
        updated_at: new Date(0),
        updated_by_admin_id: "system:bootstrap",
      });
      fail("10: Day-1 default row must not parse as ready");
    } catch (err) {
      if (!(err instanceof DepositConfigNotReadyError)) {
        fail("10: Day-1 default parse must be CONFIG_NOT_READY");
      }
    }
    const { core, state } = makeHarness(null);
    await expectBlockedPatch("10 defaults via no-op PATCH", core, state, {
      updatedByAdminId: ADMIN_ID,
      changeReason: "use day1 defaults",
    });
    if (state.inserts !== 0) fail("10: Day-1 default INSERT must be 0");
  }

  console.log(
    "[deposit-config-bootstrap-fail-closed.runtime] PASS (10 cases · INSERT/UPDATE fail-closed)",
  );
}

await run();
