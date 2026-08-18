import { Module, forwardRef } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { OpportunitiesModule } from "../opportunities/opportunities.module";
import { AdaptersAdminController } from "./adapters.admin.controller";
import { AdaptersAdminService } from "./adapters.admin.service";
import { AdaptersIngestController } from "./adapters.ingest.controller";
import { ProviderHealthService } from "./provider-health.service";

@Module({
  imports: [EventsModule, forwardRef(() => OpportunitiesModule)],
  controllers: [AdaptersAdminController, AdaptersIngestController],
  providers: [AdaptersAdminService, ProviderHealthService],
  exports: [AdaptersAdminService, ProviderHealthService],
})
export class AdaptersModule {}
