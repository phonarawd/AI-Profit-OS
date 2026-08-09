import { Module } from "@nestjs/common";
import { AdaptersModule } from "../adapters/adapters.module";
import { EventsModule } from "../events/events.module";
import { PlatformReserveAdminController } from "./platform-reserve.admin.controller";
import { PlatformReserveAdminService } from "./platform-reserve.admin.service";
import { SimulationAdminController } from "./simulation.admin.controller";
import { SimulationAdminService } from "./simulation.admin.service";

/**
 * Engine §51.4 M0.5 + §0.0.4.3 platform_reserve
 * Growth ON gate · S1~S4 KPI · Admin growth?tab=simulation · system-control?tab=reserve
 */
@Module({
  imports: [EventsModule, AdaptersModule],
  controllers: [SimulationAdminController, PlatformReserveAdminController],
  providers: [SimulationAdminService, PlatformReserveAdminService],
  exports: [SimulationAdminService, PlatformReserveAdminService],
})
export class SimulationModule {}
