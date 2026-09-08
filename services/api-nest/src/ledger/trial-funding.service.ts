/**
 * Server decides trial vs own_principal. Client must not send funding_source.
 */

import { ForbiddenException, Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import { PostgresService } from "../db/postgres";
import { cmpAmount } from "./ledger.money";
import { LedgerProvisionService } from "./ledger.provision.service";
import { usdtToKrwInt } from "./trial-fx";
import type { UserBucket } from "./ledger.types";

export type FundingSource = "trial" | "own_principal";

export type FundingDecision = {
  source: FundingSource;
  fromBucket: UserBucket;
  toBucket: UserBucket;
};

type ProgramRow = {
  profit_cap_krw: number;
  required_capital_krw_min: number;
  required_capital_krw_max: number;
};

type StateRow = {
  max_participations: number;
  participations_used: number;
  profit_credited_krw: string;
};

@Injectable()
export class TrialFundingService {
  constructor(
    private readonly db: PostgresService,
    private readonly provision: LedgerProvisionService,
  ) {}

  async decide(input: {
    userId: string;
    trialEligible: boolean;
    amountUsdt: string;
    trialPrincipalUsdt: string;
    principalUsdt: string;
    usdKrw?: string | null;
  }): Promise<FundingDecision> {
    await this.provision.provisionUserBucketAccounts(input.userId);

    const canTrial = await this.canUseTrial(input);
    if (canTrial) {
      return {
        source: "trial",
        fromBucket: "trial_principal",
        toBucket: "trial_locked",
      };
    }
    if (cmpAmount(input.amountUsdt, input.principalUsdt) <= 0) {
      return {
        source: "own_principal",
        fromBucket: "principal",
        toBucket: "locked",
      };
    }
    throw new ForbiddenException({
      code: "INSUFFICIENT_PRINCIPAL",
      toastCode: "INSUFFICIENT_PRINCIPAL",
      statusCode: 403,
    });
  }

  async consumeParticipation(
    client: PoolClient,
    userId: string,
  ): Promise<void> {
    const used = await client.query(
      `UPDATE public.trial_user_state
          SET participations_used = participations_used + 1,
              updated_at = now()
        WHERE user_id = $1::uuid
          AND participations_used < max_participations
        RETURNING user_id`,
      [userId],
    );
    if (used.rows.length === 0) {
      throw new ForbiddenException({
        code: "TRIAL_COUNT_EXHAUSTED",
        toastCode: "TRIAL_COUNT_EXHAUSTED",
        statusCode: 403,
      });
    }
  }

  async remainingCapKrw(client: PoolClient, userId: string): Promise<number> {
    const program = await this.program(client);
    const state = await client.query<StateRow>(
      `SELECT max_participations, participations_used, profit_credited_krw::text
         FROM public.trial_user_state
        WHERE user_id = $1::uuid
        FOR UPDATE`,
      [userId],
    );
    const credited = Number(state.rows[0]?.profit_credited_krw ?? 0);
    return Math.max(0, program.profit_cap_krw - credited);
  }

  async addCreditedProfitKrw(
    client: PoolClient,
    userId: string,
    profitKrw: number,
  ): Promise<void> {
    if (profitKrw <= 0) return;
    await client.query(
      `UPDATE public.trial_user_state
          SET profit_credited_krw = profit_credited_krw + $2,
              updated_at = now()
        WHERE user_id = $1::uuid`,
      [userId, profitKrw],
    );
  }

  async recordSettlement(
    client: PoolClient,
    input: {
      tradeId: string;
      userId: string;
      fundingSource: FundingSource;
      profitUsdt: string;
      profitKrw: number;
      capped: boolean;
      status: "settled" | "unlocked" | "profit_held_fx";
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO public.trial_settlements (
         trade_id, user_id, funding_source, profit_usdt, profit_krw, capped, status
       ) VALUES ($1::uuid, $2::uuid, $3, $4::numeric, $5, $6, $7)
       ON CONFLICT (trade_id) DO NOTHING`,
      [
        input.tradeId,
        input.userId,
        input.fundingSource,
        input.profitUsdt,
        input.profitKrw,
        input.capped,
        input.status,
      ],
    );
  }

  private async canUseTrial(input: {
    userId: string;
    trialEligible: boolean;
    amountUsdt: string;
    trialPrincipalUsdt: string;
    usdKrw?: string | null;
  }): Promise<boolean> {
    if (!input.trialEligible) return false;
    if (cmpAmount(input.amountUsdt, input.trialPrincipalUsdt) > 0) return false;

    const program = await this.program();
    const state = await this.db.query<StateRow>(
      `SELECT max_participations, participations_used, profit_credited_krw::text
         FROM public.trial_user_state
        WHERE user_id = $1::uuid`,
      [input.userId],
    );
    const row = state.rows[0];
    if (!row) return false;
    if (row.participations_used >= row.max_participations) return false;
    if (Number(row.profit_credited_krw) >= program.profit_cap_krw) return false;
    if (!input.usdKrw) return false;
    const requiredKrw = usdtToKrwInt(input.amountUsdt, input.usdKrw);
    if (
      requiredKrw < program.required_capital_krw_min ||
      requiredKrw > program.required_capital_krw_max
    ) {
      return false;
    }
    return true;
  }

  private async program(client?: PoolClient): Promise<ProgramRow> {
    const sql = `SELECT profit_cap_krw, required_capital_krw_min, required_capital_krw_max
         FROM public.trial_program_config WHERE id = 1`;
    const r = client
      ? await client.query<ProgramRow>(sql)
      : await this.db.query<ProgramRow>(sql);
    return (
      r.rows[0] ?? {
        profit_cap_krw: 5000,
        required_capital_krw_min: 1000,
        required_capital_krw_max: 10000,
      }
    );
  }
}
