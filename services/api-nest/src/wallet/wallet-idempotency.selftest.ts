/**
 * DB-free runtime proof for wallet create/retry idempotency.
 * Invoked only by tooling/verify/idempotency-conflict-detection.cjs after tsc.
 */
import "reflect-metadata";
import { ConflictException } from "@nestjs/common";
import type { PostgresService } from "../db/postgres";
import type { InProcessEventBus } from "../events/in-process.bus";
import type { KillSwitchService } from "../kill-switch/kill-switch.service";
import type { LedgerPostingService } from "../ledger/ledger.posting.service";
import type { LedgerProvisionService } from "../ledger/ledger.provision.service";
import type { RiskService } from "../risk/risk.service";
import { KrwDepositService } from "./krw-deposit.service";
import type { MinHoldingService } from "./min-holding.service";
import type { WithdrawFeeService } from "./withdraw-fee.service";
import { WithdrawIntentService } from "./withdraw-intent.service";
import type { WithdrawKycGuard } from "./withdraw-kyc.guard";
import type { WithdrawStepUpService } from "./withdraw-stepup.service";

type CheckResult = { name: string; ok: boolean; detail: string };
type Counters = Record<string, number>;

const results: CheckResult[] = [];
const record = (name: string, ok: boolean, detail: string) =>
  results.push({ name, ok, detail });

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-08-28T00:00:00.000Z");

const krwRow = {
  id: "33333333-3333-4333-8333-333333333333",
  user_id: USER_A,
  requested_amount_krw: 100_000,
  payable_amount_krw: 100_042,
  unique_suffix_krw: 42,
  deposit_code: "cafebabe",
  depositor_name: "홍길동",
  status: "pending" as const,
  expires_at: new Date("2026-08-28T00:30:00.000Z"),
  admin_note: null,
  ledger_journal_id: null,
  idempotency_key: "krw_retry_key_0001",
  decided_at: null,
  decided_by_admin_id: null,
  created_at: NOW,
};

const withdrawRow = {
  id: "44444444-4444-4444-8444-444444444444",
  user_id: USER_A,
  mode: "profit" as const,
  amount_usdt: "1",
  asset: "USDT" as const,
  destination: "0xabc",
  debit_profit_usdt: "1",
  debit_principal_usdt: "0",
  require_principal_confirm: false,
  principal_confirm_token: null,
  status: "auth_ok",
  idempotency_key: "wd_retry_key_0001",
  withdraw_fee_usdt: "0.1",
  step_up_method: "pin" as const,
  step_up_verified_at: NOW,
  created_at: NOW,
};

function krwService(db: PostgresService, counters: Counters): KrwDepositService {
  const killSwitch = {
    assertPath: async () => {
      counters.killSwitch += 1;
    },
  } as unknown as KillSwitchService;
  const bus = {
    emit: () => {
      counters.emits += 1;
    },
  } as unknown as InProcessEventBus;
  return new KrwDepositService(
    db,
    {} as LedgerPostingService,
    {} as LedgerProvisionService,
    bus,
    killSwitch,
  );
}

function withdrawService(
  db: PostgresService,
  counters: Counters,
): WithdrawIntentService {
  const kyc = {
    assertBeforeWithdraw: async () => {
      counters.kyc += 1;
    },
  } as unknown as WithdrawKycGuard;
  const stepUp = {
    assertStepUpToken: () => {
      counters.stepUp += 1;
      return { method: "pin" as const };
    },
  } as unknown as WithdrawStepUpService;
  const fee = {
    quote: async () => {
      counters.fee += 1;
      return { withdrawFeeUsdt: "0.1" };
    },
  } as unknown as WithdrawFeeService;
  const risk = {
    assertBeforeWithdraw: async () => {
      counters.risk += 1;
    },
  } as unknown as RiskService;
  const holding = {
    check: async () => {
      counters.holding += 1;
      return { allowed: true };
    },
  } as unknown as MinHoldingService;
  const bus = {
    emit: () => {
      counters.emits += 1;
    },
  } as unknown as InProcessEventBus;
  return new WithdrawIntentService(db, kyc, stepUp, fee, risk, holding, bus);
}

async function expectConflict(
  name: string,
  run: () => Promise<unknown>,
): Promise<void> {
  try {
    await run();
    record(name, false, "request unexpectedly succeeded");
  } catch (error) {
    const response =
      error instanceof ConflictException ? error.getResponse() : null;
    const serialized = JSON.stringify(response);
    record(
      name,
      error instanceof ConflictException &&
        error.getStatus() === 409 &&
        serialized.includes("IDEMPOTENCY_KEY_CONFLICT") &&
        !serialized.includes(USER_A) &&
        !serialized.includes(krwRow.id) &&
        !serialized.includes(withdrawRow.id),
      serialized,
    );
  }
}

async function main(): Promise<void> {
  {
    const counters: Counters = {
      killSwitch: 0,
      emits: 0,
      kyc: 0,
      stepUp: 0,
      fee: 0,
      risk: 0,
      holding: 0,
    };
    const db = {
      query: async () => ({ rows: [krwRow] }),
    } as unknown as PostgresService;
    const service = krwService(db, counters);
    const reused = await service.createRequest({
      userId: USER_A,
      requestedAmountKrw: 100_000,
      depositorName: "  홍길동  ",
      idempotencyKey: krwRow.idempotency_key,
    });
    record(
      "KRW exact retry reuses durable row before create-only gates",
      reused.id === krwRow.id && counters.killSwitch === 0 && counters.emits === 0,
      JSON.stringify({ id: reused.id, counters }),
    );
    await expectConflict("KRW changed amount conflicts without leaking row", () =>
      service.createRequest({
        userId: USER_A,
        requestedAmountKrw: 100_001,
        depositorName: "홍길동",
        idempotencyKey: krwRow.idempotency_key,
      }),
    );
    await expectConflict("KRW foreign owner conflicts without leaking row", () =>
      service.createRequest({
        userId: USER_B,
        requestedAmountKrw: 100_000,
        depositorName: "홍길동",
        idempotencyKey: krwRow.idempotency_key,
      }),
    );
  }

  {
    const counters: Counters = {
      killSwitch: 0,
      emits: 0,
      kyc: 0,
      stepUp: 0,
      fee: 0,
      risk: 0,
      holding: 0,
    };
    const db = {
      query: async () => ({ rows: [withdrawRow] }),
    } as unknown as PostgresService;
    const service = withdrawService(db, counters);
    const reused = await service.create({
      userId: USER_A,
      mode: "profit",
      amountUsdt: "1.0",
      asset: "USDT",
      destination: "  0xabc  ",
      idempotencyKey: withdrawRow.idempotency_key,
      stepUpToken: "step_up_token_0001",
    });
    record(
      "withdraw exact economic retry canonicalizes and bypasses create-only gates",
      reused.id === withdrawRow.id &&
        counters.kyc === 0 &&
        counters.stepUp === 0 &&
        counters.fee === 0 &&
        counters.risk === 0 &&
        counters.holding === 0 &&
        counters.emits === 0,
      JSON.stringify({ id: reused.id, counters }),
    );
    await expectConflict("withdraw changed destination conflicts", () =>
      service.create({
        userId: USER_A,
        mode: "profit",
        amountUsdt: "1",
        asset: "USDT",
        destination: "0xdef",
        idempotencyKey: withdrawRow.idempotency_key,
        stepUpToken: "step_up_token_0001",
      }),
    );
    await expectConflict("withdraw foreign owner conflicts without leaking row", () =>
      service.create({
        userId: USER_B,
        mode: "profit",
        amountUsdt: "1",
        asset: "USDT",
        destination: "0xabc",
        idempotencyKey: withdrawRow.idempotency_key,
        stepUpToken: "step_up_token_0001",
      }),
    );
  }

  {
    let selectCount = 0;
    const counters: Counters = {
      killSwitch: 0,
      emits: 0,
      kyc: 0,
      stepUp: 0,
      fee: 0,
      risk: 0,
      holding: 0,
    };
    const db = {
      query: async (sql: string) => {
        if (sql.includes("FROM public.krw_deposit_requests") && sql.includes("idempotency_key")) {
          selectCount += 1;
          return { rows: selectCount === 1 ? [] : [krwRow] };
        }
        if (sql.includes("INSERT INTO public.krw_deposit_requests")) {
          throw new Error("duplicate key violates krw_deposit_requests_idempotency_key_key");
        }
        return { rows: [] };
      },
    } as unknown as PostgresService;
    const reused = await krwService(db, counters).createRequest({
      userId: USER_A,
      requestedAmountKrw: 100_000,
      depositorName: "홍길동",
      idempotencyKey: krwRow.idempotency_key,
    });
    record(
      "KRW concurrent insert race converges on committed row without duplicate event",
      reused.id === krwRow.id && selectCount === 2 && counters.emits === 0,
      JSON.stringify({ id: reused.id, selectCount, counters }),
    );
  }

  {
    let selectCount = 0;
    const counters: Counters = {
      killSwitch: 0,
      emits: 0,
      kyc: 0,
      stepUp: 0,
      fee: 0,
      risk: 0,
      holding: 0,
    };
    const db = {
      query: async (sql: string) => {
        if (sql.includes("FROM public.withdraw_intents") && sql.includes("idempotency_key")) {
          selectCount += 1;
          return { rows: selectCount === 1 ? [] : [withdrawRow] };
        }
        if (sql.includes("FROM public.user_capability")) {
          return { rows: [{ withdraw_apply_blocked: false }] };
        }
        if (sql.includes("INSERT INTO public.withdraw_intents")) {
          throw new Error("duplicate key violates withdraw_intents_idempotency_key_key");
        }
        throw new Error(`unexpected query: ${sql.slice(0, 60)}`);
      },
    } as unknown as PostgresService;
    const reused = await withdrawService(db, counters).create({
      userId: USER_A,
      mode: "profit",
      amountUsdt: "1",
      asset: "USDT",
      destination: "0xabc",
      idempotencyKey: withdrawRow.idempotency_key,
      stepUpToken: "step_up_token_0001",
    });
    record(
      "withdraw concurrent insert race converges on committed row without duplicate event",
      reused.id === withdrawRow.id && selectCount === 2 && counters.emits === 0,
      JSON.stringify({ id: reused.id, selectCount, counters }),
    );
  }

  for (const result of results) {
    // eslint-disable-next-line no-console
    console.log(
      `${result.ok ? "PASS" : "FAIL"} - ${result.name} (${result.detail})`,
    );
  }
  if (results.some((result) => !result.ok)) process.exit(1);
  // eslint-disable-next-line no-console
  console.log(
    `[wallet-idempotency.selftest] ALL PASS - ${results.length} runtime checks`,
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[wallet-idempotency.selftest] FATAL", error);
  process.exit(1);
});
