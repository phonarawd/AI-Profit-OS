import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { KillSwitchModule } from "../kill-switch/kill-switch.module";
import { GrowthPublicController } from "./growth.public.controller";
import { GrowthPublicService } from "./growth-public.service";

/** UI PART9g growth public-surface · Admin ticker PATCH pointer only */
@Module({
  imports: [EventsModule, KillSwitchModule],
  controllers: [GrowthPublicController],
  providers: [GrowthPublicService],
  exports: [GrowthPublicService],
})
export class GrowthModule {}
