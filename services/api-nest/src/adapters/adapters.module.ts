import { Module, forwardRef } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { OpportunitiesModule } from "../opportunities/opportunities.module";
import { AdaptersAdminController } from "./adapters.admin.controller";
import { AdaptersAdminService } from "./adapters.admin.service";
import { AdaptersIngestController } from "./adapters.ingest.controller";

@Module({
  imports: [EventsModule, forwardRef(() => OpportunitiesModule)],
  controllers: [AdaptersAdminController, AdaptersIngestController],
  providers: [AdaptersAdminService],
  exports: [AdaptersAdminService],
})
export class AdaptersModule {}
