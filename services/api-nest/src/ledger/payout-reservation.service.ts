/**
 * 매칭 수익 = 내부 장부(가상 머니). SYS:OPPORTUNITY_POOL 선적립을 요구하지 않는다.
 * 수익 원천 = SYS:MATCH_PROFIT_EXPENSE 만. 없으면 fail-closed.
 * SYS:OPS_POOL 대체 금지. 실USDT/실KRW 솔벤시는 출금 broadcast에서만 검사한다.
 */

import { Injectable } from "@nestjs/common";
import { SYSTEM_ACCOUNT_CODES } from "./ledger.types";

export type TxClient = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Array<{ code?: string }> }>;
};

export class MatchProfitExpenseMissingError extends Error {
  readonly code = "MATCH_PROFIT_EXPENSE_MISSING";

  constructor() {
    super("MATCH_PROFIT_EXPENSE_MISSING");
    this.name = "MatchProfitExpenseMissingError";
  }
}

@Injectable()
export class PayoutReservationService {
  async resolveMatchProfitSource(client: TxClient): Promise<string> {
    const preferred = SYSTEM_ACCOUNT_CODES.MATCH_PROFIT_EXPENSE;
    const found = await client.query(
      `SELECT code FROM public.ledger_accounts WHERE code = $1`,
      [preferred],
    );
    if (found.rows[0]?.code !== preferred) {
      throw new MatchProfitExpenseMissingError();
    }
    return preferred;
  }

  /** 내부 장부 지급은 온체인 풀 잔액과 무관하다. */
  isInAppPayoutFeasible(): boolean {
    return true;
  }
}
