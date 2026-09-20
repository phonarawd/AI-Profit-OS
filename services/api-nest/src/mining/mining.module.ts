import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../audit/admin-audit.module";
import { EventsModule } from "../events/events.module";
import { LedgerModule } from "../ledger/ledger.module";
import { MineCatalogController, MiningController } from "./mining.controller";
import { MiningAdminController } from "./mining.admin.controller";
import { MiningInternalController } from "./mining.internal.controller";
import { MiningProfitEngineService } from "./mining-profit-engine.service";
import { MiningService } from "./mining.service";

@Module({
  imports: [EventsModule, LedgerModule, AdminAuditModule],
  controllers: [
    MineCatalogController,
    MiningController,
    MiningAdminController,
    MiningInternalController,
  ],
  providers: [MiningService, MiningProfitEngineService],
  exports: [MiningService],
})
export class MiningModule {}
