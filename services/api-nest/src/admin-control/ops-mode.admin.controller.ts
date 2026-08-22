import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard, type RequestWithAdmin } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { ADMIN_CONTROL_ROUTES } from "./admin-control.routes";
import { OpsModeService } from "./ops-mode.service";

@UseGuards(AdminGuard)
@Controller("admin")
export class OpsModeAdminController {
  constructor(private readonly ops: OpsModeService) {}

  @Get(ADMIN_CONTROL_ROUTES.opsMode)
  get() {
    return this.ops.getMode();
  }

  @Put(ADMIN_CONTROL_ROUTES.opsMode)
  put(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.ops.setMode({
      mode: body.mode,
      confirm: body.confirm,
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      adminRole: req.admin?.role ?? null,
    });
  }

  @Post(ADMIN_CONTROL_ROUTES.previewAsUser)
  previewAsUser(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.ops.previewAsUser({
      userId: body.userId,
      adminId: operatorId,
    });
  }

  @Post(ADMIN_CONTROL_ROUTES.impactPreview)
  impactPreview(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.ops.previewImpact({
      verb: body.verb,
      targetIds: body.targetIds,
      adminId: operatorId,
    });
  }

  @Post(ADMIN_CONTROL_ROUTES.impactConfirm)
  impactConfirm(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.ops.confirmImpact({ id: body.id, adminId: operatorId });
  }

  @Post(ADMIN_CONTROL_ROUTES.impactApply)
  impactApply(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.ops.applyImpact({ id: body.id, adminId: operatorId });
  }

  @Get(ADMIN_CONTROL_ROUTES.impactGet)
  impactGet(@Param("id") id: string) {
    return this.ops.getImpact(id);
  }

  @Post(ADMIN_CONTROL_ROUTES.impactRollback)
  impactRollback(
    @Param("id") id: string,
    @AdminOperator() operatorId: string,
  ) {
    return this.ops.rollbackImpact({ id, adminId: operatorId });
  }
}
