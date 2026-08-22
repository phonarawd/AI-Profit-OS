import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AdminGuard, type RequestWithAdmin } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { ADMIN_CONTROL_ROUTES } from "./admin-control.routes";
import { SourceHealthService } from "./source-health.service";

@UseGuards(AdminGuard)
@Controller("admin")
export class SourceHealthAdminController {
  constructor(private readonly source: SourceHealthService) {}

  @Get(ADMIN_CONTROL_ROUTES.sourceHealth)
  health() {
    return this.source.health();
  }

  @Get(ADMIN_CONTROL_ROUTES.policyVersions)
  versions() {
    return this.source.versions();
  }

  @Post(ADMIN_CONTROL_ROUTES.policyRollback)
  rollback(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.source.rollback({
      version: body.version,
      reason: String(body.reason ?? ""),
      adminId: operatorId,
    });
  }

  @Post(ADMIN_CONTROL_ROUTES.founderOverride)
  founderOverride(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.source.founderOverridePut({
      engaged: body.engaged === true,
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      adminRole: req.admin?.role ?? null,
    });
  }
}
