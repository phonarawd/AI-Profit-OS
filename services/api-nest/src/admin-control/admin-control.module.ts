import { Module } from "@nestjs/common";
import { AdaptersModule } from "../adapters/adapters.module";
import { AdminAuditAdminController } from "./admin-audit.admin.controller";
import { AllocationAdminController } from "./allocation.admin.controller";
import { AllocationService } from "./allocation.service";
import { KillSwitchAdminController } from "./kill-switch.admin.controller";
import { KillSwitchModule } from "./kill-switch.module";
import { OpsModeAdminController } from "./ops-mode.admin.controller";
import { OpsModeService } from "./ops-mode.service";
import { SourceHealthAdminController } from "./source-health.admin.controller";
import { SourceHealthService } from "./source-health.service";

@Module({
  imports: [KillSwitchModule, AdaptersModule],
  controllers: [
    AdminAuditAdminController,
    KillSwitchAdminController,
    OpsModeAdminController,
    AllocationAdminController,
    SourceHealthAdminController,
  ],
  providers: [OpsModeService, AllocationService, SourceHealthService],
  exports: [OpsModeService, AllocationService, SourceHealthService],
})
export class AdminControlModule {}
