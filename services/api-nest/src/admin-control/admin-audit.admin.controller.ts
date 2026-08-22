import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminAuditService } from "./admin-audit.service";
import { ADMIN_CONTROL_ROUTES } from "./admin-control.routes";

@UseGuards(AdminGuard)
@Controller("admin")
export class AdminAuditAdminController {
  constructor(private readonly audit: AdminAuditService) {}

  @Get(ADMIN_CONTROL_ROUTES.audit)
  list(@Query("limit") limit?: string) {
    return this.audit.list(limit ? Number(limit) : 50);
  }
}
