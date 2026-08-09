import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { MembershipAdminController } from "./membership.admin.controller";
import { MembershipAdminService } from "./membership.admin.service";
import { MembershipUserController } from "./membership.user.controller";

/**
 * Engine §0.0.7 membership · Admin §9.8.10 force / matchStrictnessOverride.
 * User GET /me/membership (§0.9 E-R7) · fulfillRate read-only · successRatePercent path 0.
 */
@Module({
  imports: [EventsModule],
  controllers: [MembershipAdminController, MembershipUserController],
  providers: [MembershipAdminService],
  exports: [MembershipAdminService],
})
export class MembershipModule {}
