import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { MatchingPolicyAdminController } from "./matching-policy.admin.controller";
import { MatchingPolicyAdminService } from "./matching-policy.admin.service";
import { MatchingPolicyService } from "./matching-policy.service";

@Module({
  imports: [EventsModule],
  controllers: [MatchingPolicyAdminController],
  providers: [MatchingPolicyService, MatchingPolicyAdminService],
  exports: [MatchingPolicyService],
})
export class MatchingPolicyModule {}
