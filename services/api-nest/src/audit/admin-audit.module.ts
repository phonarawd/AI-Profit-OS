import { Module } from "@nestjs/common";
import { AdminAuditService } from "./admin-audit.service";
import { AuditEventsAdminController } from "./audit-events.admin.controller";

@Module({
  controllers: [AuditEventsAdminController],
  providers: [AdminAuditService],
  exports: [AdminAuditService],
})
export class AdminAuditModule {}
