import { Module } from "@nestjs/common";
import { KillSwitchAdminController } from "./kill-switch.admin.controller";
import { KillSwitchService } from "./kill-switch.service";

@Module({
  controllers: [KillSwitchAdminController],
  providers: [KillSwitchService],
  exports: [KillSwitchService],
})
export class KillSwitchModule {}
