import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { EventsModule } from "./events/events.module";
import { HealthController } from "./health.controller";
import { LedgerModule } from "./ledger/ledger.module";
import { AdaptersModule } from "./adapters/adapters.module";
import { ExecutionPolicyModule } from "./execution-policy/execution-policy.module";
import { MembershipModule } from "./membership/membership.module";
import { InboxModule } from "./inbox/inbox.module";
import { LoopModule } from "./loop/loop.module";
import { OpportunitiesModule } from "./opportunities/opportunities.module";
import { MissionModule } from "./missions/mission.module";
import { ReferralModule } from "./referral/referral.module";
import { RiskModule } from "./risk/risk.module";
import { SimulationModule } from "./simulation/simulation.module";
import { AiModule } from "./ai/ai.module";
import { TradesModule } from "./trades/trades.module";
import { WalletModule } from "./wallet/wallet.module";
import { GrowthModule } from "./growth/growth.module";
import { HomeReadModule } from "./home-read/home-read.module";

@Module({
  imports: [
    EventsModule,
    LedgerModule,
    WalletModule,
    GrowthModule,
    HomeReadModule,
    ComplianceModule,
    RiskModule,
    ReferralModule,
    MissionModule,
    OpportunitiesModule,
    TradesModule,
    ExecutionPolicyModule,
    MembershipModule,
    InboxModule,
    LoopModule,
    AdaptersModule,
    SimulationModule,
    AiModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
