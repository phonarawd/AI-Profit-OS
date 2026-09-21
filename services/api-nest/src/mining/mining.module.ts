import { Module } from "@nestjs/common";
import { KillSwitchModule } from "../kill-switch/kill-switch.module";
import { LedgerModule } from "../ledger/ledger.module";
import { MiningAdminController } from "./mining.admin.controller";
import { MiningAdminService } from "./mining-admin.service";
import { MineCatalogController, MiningController } from "./mining.controller";
import { MiningHighValueService } from "./mining-high-value.service";
import { MiningInternalController } from "./mining.internal.controller";
import { MiningOperationCoordinatorService } from "./mining-operation-coordinator.service";
import { MiningProfitEngineService } from "./mining-profit-engine.service";
import { MiningRateActivationService } from "./mining-rate-activation.service";
import { MiningReadService } from "./mining-read.service";
import { MiningService } from "./mining.service";

@Module({
  imports: [LedgerModule, KillSwitchModule],
  controllers: [
    MineCatalogController,
    MiningController,
    MiningInternalController,
    MiningAdminController,
  ],
  providers: [
    MiningService,
    MiningProfitEngineService,
    MiningReadService,
    MiningHighValueService,
    MiningOperationCoordinatorService,
    MiningAdminService,
    MiningRateActivationService,
  ],
  exports: [MiningService],
})
export class MiningModule {}
