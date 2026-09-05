/**
 * 매칭 수익 = 내부 장부(가상 머니). SYS:OPPORTUNITY_POOL 선적립을 요구하지 않는다.
 * 수익 원천 = SYS:MATCH_PROFIT_EXPENSE(없으면 SYS:OPS_POOL). debit-normal.
 * 실USDT/실KRW 솔벤시는 출금 broadcast에서만 검사한다.
 */

import { Injectable } from "@nestjs/common";
import { SYSTEM_ACCOUNT_CODES } from "./ledger.types";

export type TxClient = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Array<{ code?: string }> }>;
};

@Injectable()
export class PayoutReservationService {
  async resolveMatchProfitSource(client: TxClient): Promise<string> {
    const preferred = SYSTEM_ACCOUNT_CODES.MATCH_PROFIT_EXPENSE;
    const found = await client.query(
      `SELECT code FROM public.ledger_accounts WHERE code = $1`,
      [preferred],
    );
    return found.rows[0]?.code ?? SYSTEM_ACCOUNT_CODES.OPS_POOL;
  }

  /** 내부 장부 지급은 온체인 풀 잔액과 무관하다. */
  isInAppPayoutFeasible(): boolean {
    return true;
  }
}
