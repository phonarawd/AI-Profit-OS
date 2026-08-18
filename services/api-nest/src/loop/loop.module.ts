import { Module } from "@nestjs/common";
import { DayPulseService } from "./day-pulse.service";
import { DayPulseUserController } from "./day-pulse.user.controller";
import { PreflightService } from "./preflight.service";

/**
 * UI §51.24 Loop Psychology · DayPulse · PreCTA token
 */
@Module({
  controllers: [DayPulseUserController],
  providers: [DayPulseService, PreflightService],
  exports: [DayPulseService, PreflightService],
})
export class LoopModule {}
