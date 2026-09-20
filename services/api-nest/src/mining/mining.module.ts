import { Module } from "@nestjs/common";
import { LedgerModule } from "../ledger/ledger.module";
import { MineCatalogController, MiningController } from "./mining.controller";
import { MiningInternalController } from "./mining.internal.controller";
import { MiningOperationCoordinatorService } from "./mining-operation-coordinator.service";
import { MiningProfitEngineService } from "./mining-profit-engine.service";
import { MiningReadService } from "./mining-read.service";
import { MiningService } from "./mining.service";

@Module({
  imports: [LedgerModule],
  controllers: [MineCatalogController, MiningController, MiningInternalController],
  providers: [
    MiningService,
    MiningProfitEngineService,
    MiningReadService,
    MiningOperationCoordinatorService,
  ],
  exports: [MiningService],
})
export class MiningModule {}
