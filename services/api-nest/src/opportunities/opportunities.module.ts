import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { AssetImageR2Service } from "./asset-image-r2.service";
import { OpportunitiesAdminController } from "./opportunities.admin.controller";
import { OpportunitiesAdminService } from "./opportunities.admin.service";
import { UserOpportunityOverrideAdminController } from "./user-opportunity-override.admin.controller";
import { UserOpportunityOverrideAdminService } from "./user-opportunity-override.admin.service";

@Module({
  imports: [EventsModule],
  controllers: [
    OpportunitiesAdminController,
    UserOpportunityOverrideAdminController,
  ],
  providers: [
    AssetImageR2Service,
    OpportunitiesAdminService,
    UserOpportunityOverrideAdminService,
  ],
  exports: [
    AssetImageR2Service,
    OpportunitiesAdminService,
    UserOpportunityOverrideAdminService,
  ],
})
export class OpportunitiesModule {}
