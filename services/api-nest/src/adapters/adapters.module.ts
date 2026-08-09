import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { AdaptersAdminController } from "./adapters.admin.controller";
import { AdaptersAdminService } from "./adapters.admin.service";
import { AdaptersIngestController } from "./adapters.ingest.controller";

@Module({
  imports: [EventsModule],
  controllers: [AdaptersAdminController, AdaptersIngestController],
  providers: [AdaptersAdminService],
  exports: [AdaptersAdminService],
})
export class AdaptersModule {}
