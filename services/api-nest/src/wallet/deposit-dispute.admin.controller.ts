import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { DepositDisputeService } from "./deposit-dispute.service";
import { WALLET_ADMIN_ROUTES } from "./wallet.routes";
import type { DepositDisputeStatus } from "./wallet.types";

/**
 * Admin disputes HTTP · /api/v1/admin/wallet/deposit-disputes/*
 * UI tab = /admin/wallet?tab=disputes · Auth/RBAC = Admin todos.
 * Credit → admin_adjust · reject → journal 0 · audit every decide.
 */
@Controller("admin")
export class DepositDisputeAdminController {
  constructor(private readonly disputes: DepositDisputeService) {}

  @Get(WALLET_ADMIN_ROUTES.depositDisputes)
  list(
    @Query("status") statusRaw?: string,
    @Query("limit") limitRaw?: string,
  ) {
    const status = statusRaw as DepositDisputeStatus | undefined;
    return this.disputes.list({
      status,
      limit: limitRaw ? Number(limitRaw) : undefined,
    });
  }

  @Post(WALLET_ADMIN_ROUTES.depositDisputeCredit)
  credit(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.disputes.credit({
      id,
      adminId: String(body.adminId ?? body.updatedByAdminId ?? ""),
      amountUsdt: String(body.amountUsdt ?? ""),
      reason: String(body.reason ?? body.adminNote ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  @Post(WALLET_ADMIN_ROUTES.depositDisputeReject)
  reject(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.disputes.reject({
      id,
      adminId: String(body.adminId ?? body.updatedByAdminId ?? ""),
      reason: String(body.reason ?? body.adminNote ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }
}
