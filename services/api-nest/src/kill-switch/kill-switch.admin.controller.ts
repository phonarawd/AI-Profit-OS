/**
 * REL-406 9종 목록/토글 · /api/v1/admin/system-control/switches
 * 유저 JWT 200 금지. 사유 ≥10. audit 필수.
 */

import { Body, Controller, Get, Put, Req, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import type { RequestWithAdmin } from "../common/admin.guard";
import { KILL_SWITCH_ADMIN_ROUTES } from "./kill-switch.routes";
import { KillSwitchService } from "./kill-switch.service";

@UseGuards(AdminGuard)
@Controller("admin")
export class KillSwitchAdminController {
  constructor(private readonly kill: KillSwitchService) {}

  @Get(KILL_SWITCH_ADMIN_ROUTES.list)
  list() {
    return this.kill.list();
  }

  @Put(KILL_SWITCH_ADMIN_ROUTES.put)
  put(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.kill.set({
      id: String(body.id ?? body.switchId ?? ""),
      engaged: body.engaged === true,
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      role: req.admin?.role ?? "unknown",
    });
  }
}
