import { BadRequestException, Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";

const ALLOWED_STATUSES = [
  "draft",
  "confirmed",
  "auth_ok",
  "ledger_posted",
  "broadcasting",
  "queued",
  "completed",
  "rejected",
  "failed_refund_buckets",
] as const;

type WithdrawReviewRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  mode: string;
  amount_usdt: string;
  asset: string;
  debit_profit_usdt: string;
  debit_principal_usdt: string;
  status: string;
  destination: string | null;
  withdraw_fee_usdt: string | null;
  step_up_method: string | null;
  kyc_status: string | null;
  created_at: Date;
  updated_at: Date;
  total_count: string;
};

@Injectable()
export class WithdrawReviewAdminService {
  constructor(private readonly db: PostgresService) {}

  async list(input: { status?: string; limit?: number; offset?: number }) {
    const status = this.normalizeStatus(input.status);
    const limit = Math.min(Math.max(Number(input.limit) || 50, 1), 100);
    const offset = Math.min(Math.max(Number(input.offset) || 0, 0), 100000);

    const { rows } = await this.db.query<WithdrawReviewRow>(
      `SELECT
         w.id::text,
         w.user_id::text,
         p.display_name,
         u.email,
         w.mode,
         w.amount_usdt::text,
         w.asset,
         w.debit_profit_usdt::text,
         w.debit_principal_usdt::text,
         w.status,
         w.destination,
         w.withdraw_fee_usdt::text,
         w.step_up_method,
         k.kyc_status,
         w.created_at,
         w.updated_at,
         count(*) OVER()::text AS total_count
       FROM public.withdraw_intents w
       JOIN public.users u ON u.id = w.user_id
       LEFT JOIN public.user_profiles p ON p.user_id = w.user_id
       LEFT JOIN public.kyc_status k ON k.user_id = w.user_id
       WHERE ($1::text IS NULL OR w.status = $1)
       ORDER BY w.created_at DESC, w.id DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    );

    const total = Number(rows[0]?.total_count ?? 0);
    return {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        displayName: row.display_name,
        email: row.email,
        mode: row.mode,
        amountUsdt: row.amount_usdt,
        asset: row.asset,
        debitProfitUsdt: row.debit_profit_usdt,
        debitPrincipalUsdt: row.debit_principal_usdt,
        status: row.status,
        destination: row.destination,
        withdrawFeeUsdt: row.withdraw_fee_usdt,
        stepUpMethod: row.step_up_method,
        kycStatus: row.kyc_status,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      })),
      total,
      limit,
      offset,
      nextOffset: offset + rows.length < total ? offset + rows.length : null,
      readOnly: true,
    };
  }

  private normalizeStatus(value: string | undefined): string | null {
    const status = typeof value === "string" ? value.trim() : "";
    if (!status || status === "all") return null;
    if (!(ALLOWED_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException("withdraw status invalid");
    }
    return status;
  }
}
