import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { WALLET_ADMIN_ROUTES } from "./wallet.routes";
import { WithdrawCredentialsAdminService } from "./withdraw-credentials.admin.service";

/**
 * Admin §9.8.10E HTTP · Money §43.6a wipe/revoke contracts.
 * Paths: /api/v1/admin/users/:id/withdraw-pin/reset · .../webauthn/revoke
 * UI/RBAC Owns=Admin · plaintext PIN FORBIDDEN · ledger 불변.
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class WithdrawCredentialsAdminController {
  constructor(private readonly credentials: WithdrawCredentialsAdminService) {}

  @Post(WALLET_ADMIN_ROUTES.withdrawPinReset)
  resetPin(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.credentials.resetWithdrawPin({
      userId: id,
      adminId: String(body.adminId ?? body.updatedByAdminId ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
      reason: typeof body.reason === "string" ? body.reason : undefined,
    });
  }

  @Post(WALLET_ADMIN_ROUTES.webauthnRevoke)
  revokeWebauthn(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.credentials.revokeWebauthn({
      userId: id,
      adminId: String(body.adminId ?? body.updatedByAdminId ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
      reason: typeof body.reason === "string" ? body.reason : undefined,
    });
  }
}
