/**
 * Provision user bucket accounts via SQL SECURITY DEFINER helper.
 * Called on Nest signup (Stage A) — never Dashboard DDL.
 */

import { Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";

@Injectable()
export class LedgerProvisionService {
  constructor(private readonly db: PostgresService) {}

  /**
   * Creates principal/profit/locked/practice rows (ON CONFLICT DO NOTHING).
   * Idempotent — safe to call on every signup path.
   */
  async provisionUserBucketAccounts(userId: string): Promise<void> {
    if (!this.db.configured()) {
      throw new Error("DATABASE_URL unset · cannot provision_user_bucket_accounts");
    }
    if (!userId || userId === "pending-user") {
      throw new Error("provision_user_bucket_accounts requires a real user uuid");
    }
    await this.db.query(
      `SELECT public.provision_user_bucket_accounts($1::uuid)`,
      [userId],
    );
  }
}
