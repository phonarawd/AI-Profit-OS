import { Module } from "@nestjs/common";
import { PushModule } from "../push/push.module";
import { RiskModule } from "../risk/risk.module";
import { AdminAuditService } from "./admin-audit.service";
import { KillSwitchService } from "./kill-switch.service";

@Module({
  imports: [RiskModule, PushModule],
  providers: [AdminAuditService, KillSwitchService],
  exports: [AdminAuditService, KillSwitchService],
})
export class KillSwitchModule {}
