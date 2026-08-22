import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { GrowthPublicController } from "./growth.public.controller";
import { GrowthPublicService } from "./growth-public.service";
import { GrowthTickerAdminController } from "./growth-ticker.admin.controller";

/** UI PART9g growth public-surface · Admin G4 PATCH = 동일 growth_ticker_config */
@Module({
  imports: [EventsModule],
  controllers: [GrowthPublicController, GrowthTickerAdminController],
  providers: [GrowthPublicService],
  exports: [GrowthPublicService],
})
export class GrowthModule {}
