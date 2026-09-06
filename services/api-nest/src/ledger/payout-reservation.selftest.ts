/**
 * 매칭 수익 원천 = SYS:MATCH_PROFIT_EXPENSE 만. OPS_POOL 대체 0.
 */
import {
  MatchProfitExpenseMissingError,
  PayoutReservationService,
} from "./payout-reservation.service";
import { SYSTEM_ACCOUNT_CODES } from "./ledger.types";

type CheckResult = { name: string; ok: boolean; detail: string };
const results: CheckResult[] = [];
const record = (name: string, ok: boolean, detail: string) =>
  results.push({ name, ok, detail });

class FakeClient {
  constructor(private readonly codes: string[]) {}

  async query(
    _sql: string,
    params: unknown[] = [],
  ): Promise<{ rows: Array<{ code?: string }> }> {
    const want = String(params[0] ?? "");
    const hit = this.codes.includes(want);
    return { rows: hit ? [{ code: want }] : [] };
  }
}

async function main() {
  const svc = new PayoutReservationService();

  {
    const source = await svc.resolveMatchProfitSource(
      new FakeClient([SYSTEM_ACCOUNT_CODES.MATCH_PROFIT_EXPENSE]),
    );
    record(
      "account present returns MATCH_PROFIT_EXPENSE",
      source === SYSTEM_ACCOUNT_CODES.MATCH_PROFIT_EXPENSE,
      `source=${source}`,
    );
  }

  {
    let thrown: unknown = null;
    try {
      await svc.resolveMatchProfitSource(
        new FakeClient([SYSTEM_ACCOUNT_CODES.OPS_POOL]),
      );
    } catch (err) {
      thrown = err;
    }
    record(
      "OPS_POOL present is not a substitute",
      thrown instanceof MatchProfitExpenseMissingError &&
        thrown.code === "MATCH_PROFIT_EXPENSE_MISSING",
      `thrown=${thrown instanceof Error ? thrown.message : String(thrown)}`,
    );
  }

  {
    let thrown: unknown = null;
    try {
      await svc.resolveMatchProfitSource(new FakeClient([]));
    } catch (err) {
      thrown = err;
    }
    record(
      "missing account fail-closed MATCH_PROFIT_EXPENSE_MISSING",
      thrown instanceof MatchProfitExpenseMissingError,
      `thrown=${thrown instanceof Error ? thrown.message : String(thrown)}`,
    );
  }

  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`${r.ok ? "PASS" : "FAIL"} - ${r.name} (${r.detail})`);
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(
    "[payout-reservation.selftest] ALL PASS - MATCH_PROFIT_EXPENSE fail-closed",
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[payout-reservation.selftest] FATAL", e);
  process.exit(1);
});
