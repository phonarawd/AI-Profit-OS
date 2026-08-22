import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import type { RequestWithAdmin } from "../common/admin.guard";
import { Req } from "@nestjs/common";
import { KillSwitchService } from "./kill-switch.service";
import { ADMIN_CONTROL_ROUTES } from "./admin-control.routes";

@UseGuards(AdminGuard)
@Controller("admin")
export class KillSwitchAdminController {
  constructor(private readonly switches: KillSwitchService) {}

  @Get(ADMIN_CONTROL_ROUTES.switches)
  catalog() {
    return this.switches.catalog();
  }

  @Put(ADMIN_CONTROL_ROUTES.switchById)
  put(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.switches.put({
      id,
      engaged: body.engaged === true,
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      adminRole: req.admin?.role ?? null,
    });
  }
}
