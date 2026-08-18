import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { KrwDepositService } from "./krw-deposit.service";
import { WALLET_ADMIN_ROUTES } from "./wallet.routes";
import type { KrwDepositStatus } from "./wallet.types";

/**
 * Admin krw-pending HTTP surface · /api/v1/admin/wallet/krw-deposits/*
 * UI tab = /admin/wallet?tab=krw-pending · Auth/RBAC = AdminGuard (admin-rbac.v1).
 * Day-1 = 승인/거절 only · CSV Auto-Recon = L2+ (endpoint 0).
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class KrwDepositAdminController {
  constructor(private readonly krwDeposit: KrwDepositService) {}

  @Get(WALLET_ADMIN_ROUTES.krwDepositRequests)
  list(
    @Query("status") statusRaw?: string,
    @Query("limit") limitRaw?: string,
  ) {
    const status = (statusRaw || "pending") as KrwDepositStatus;
    return this.krwDeposit.list({
      status,
      limit: limitRaw ? Number(limitRaw) : undefined,
    });
  }

  @Get(WALLET_ADMIN_ROUTES.krwDepositRequestById)
  getById(@Param("id") id: string) {
    return this.krwDeposit.getById(id);
  }

  @Post(WALLET_ADMIN_ROUTES.krwDepositApprove)
  approve(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.krwDeposit.approve({
      id,
      adminId: operatorId,
      idempotencyKey: String(body.idempotencyKey ?? ""),
      fxSnapshotId: body.fxSnapshotId
        ? String(body.fxSnapshotId)
        : undefined,
    });
  }

  @Post(WALLET_ADMIN_ROUTES.krwDepositReject)
  reject(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.krwDeposit.reject({
      id,
      adminId: operatorId,
      idempotencyKey: String(body.idempotencyKey ?? ""),
      reason: String(body.reason ?? body.adminNote ?? ""),
    });
  }
}
