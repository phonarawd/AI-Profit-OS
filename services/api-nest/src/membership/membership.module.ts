import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { MembershipAdminController } from "./membership.admin.controller";
import { MembershipAdminService } from "./membership.admin.service";

/**
 * Engine §0.0.7 membership · Admin §9.8.10 force / matchStrictnessOverride.
 * fulfillRate read-only · successRatePercent path 0.
 */
@Module({
  imports: [EventsModule],
  controllers: [MembershipAdminController],
  providers: [MembershipAdminService],
  exports: [MembershipAdminService],
})
export class MembershipModule {}
