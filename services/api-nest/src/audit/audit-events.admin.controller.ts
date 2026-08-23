import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminAuditService } from "./admin-audit.service";
import { AUDIT_ADMIN_ROUTES } from "./audit.routes";

/**
 * REL-405 Admin audit list/get · /api/v1/admin/audit/events
 * delete/wipe 엔드포인트 0. UI live-wire는 REL-214 honest empty 유지.
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class AuditEventsAdminController {
  constructor(private readonly audit: AdminAuditService) {}

  @Get(AUDIT_ADMIN_ROUTES.events)
  list(@Query("limit") limitRaw?: string) {
    return this.audit.list(limitRaw ? Number(limitRaw) : undefined);
  }

  @Get(AUDIT_ADMIN_ROUTES.event)
  get(@Param("id") id: string) {
    return this.audit.get(id);
  }
}
