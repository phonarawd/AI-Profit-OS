import { Module } from "@nestjs/common";
import { LedgerModule } from "../ledger/ledger.module";
import { MiningController } from "./mining.controller";
import { MiningProfitEngineService } from "./mining-profit-engine.service";
import { MiningService } from "./mining.service";

@Module({ imports: [LedgerModule], controllers: [MiningController], providers: [MiningService, MiningProfitEngineService], exports: [MiningService] })
export class MiningModule {}
