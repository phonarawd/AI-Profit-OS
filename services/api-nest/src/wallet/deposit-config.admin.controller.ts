import { Body, Controller, Get, Patch, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { DepositConfigService } from "./deposit-config.service";
import { WALLET_ADMIN_ROUTES } from "./wallet.routes";
import type { DepositConfigPatchInput } from "./wallet.types";

/**
 * Admin deposit-settings HTTP surface · /api/v1/admin/wallet/deposit-config
 * Auth/RBAC = AdminGuard (admin-rbac.v1).
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class DepositConfigAdminController {
  constructor(private readonly depositConfig: DepositConfigService) {}

  @Get(WALLET_ADMIN_ROUTES.depositConfig)
  get() {
    return this.depositConfig.get();
  }

  @Patch(WALLET_ADMIN_ROUTES.depositConfig)
  patch(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    const input: DepositConfigPatchInput = {
      updatedByAdminId: operatorId,
      changeReason: String(body.changeReason ?? ""),
      krw: body.krw as DepositConfigPatchInput["krw"],
      usdtOnchain: body.usdtOnchain as DepositConfigPatchInput["usdtOnchain"],
      withdrawGuards:
        body.withdrawGuards as DepositConfigPatchInput["withdrawGuards"],
      pricingGuards:
        body.pricingGuards as DepositConfigPatchInput["pricingGuards"],
    };
    return this.depositConfig.patch(input);
  }

  @Get(WALLET_ADMIN_ROUTES.depositConfigAudit)
  audit(@Query("limit") limitRaw?: string) {
    return this.depositConfig.listAudit({
      limit: limitRaw ? Number(limitRaw) : undefined,
    });
  }
}
