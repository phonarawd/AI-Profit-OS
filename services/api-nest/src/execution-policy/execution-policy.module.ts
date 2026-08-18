import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { ExecutionPolicyAdminController } from "./execution-policy.admin.controller";
import { ExecutionPolicyAdminService } from "./execution-policy.admin.service";

/**
 * Engine §48.13.3 matchStrictness policy · Admin HTTP surface.
 * Observed KPI read-only · successRatePercent path 0.
 */
@Module({
  imports: [EventsModule],
  controllers: [ExecutionPolicyAdminController],
  providers: [ExecutionPolicyAdminService],
  exports: [ExecutionPolicyAdminService],
})
export class ExecutionPolicyModule {}
