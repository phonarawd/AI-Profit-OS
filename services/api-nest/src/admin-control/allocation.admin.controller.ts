import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { ADMIN_CONTROL_ROUTES } from "./admin-control.routes";
import { AllocationService } from "./allocation.service";

@UseGuards(AdminGuard)
@Controller("admin")
export class AllocationAdminController {
  constructor(private readonly allocation: AllocationService) {}

  @Post(ADMIN_CONTROL_ROUTES.allocationPreview)
  preview(@Body() body: Record<string, unknown>) {
    return this.allocation.preview({
      verb: body.verb,
      targetIds: body.targetIds,
    });
  }

  @Post(ADMIN_CONTROL_ROUTES.allocationApply)
  apply(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.allocation.apply({
      verb: body.verb,
      targetIds: body.targetIds,
      reason: String(body.reason ?? ""),
      confirm: body.confirm,
      previewed: body.previewed,
      adminId: operatorId,
      idempotencyKey: body.idempotencyKey,
    });
  }
}
