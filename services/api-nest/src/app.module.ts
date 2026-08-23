import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { AdminGuard } from "./common/admin.guard";
import { CommonModule } from "./common/common.module";
import { AuthModule } from "./auth/auth.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { EventsModule } from "./events/events.module";
import { HealthController } from "./health.controller";
import { LedgerModule } from "./ledger/ledger.module";
import { AdaptersModule } from "./adapters/adapters.module";
import { ExecutionPolicyModule } from "./execution-policy/execution-policy.module";
import { MembershipModule } from "./membership/membership.module";
import { InboxModule } from "./inbox/inbox.module";
import { PushModule } from "./push/push.module";
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
import { AdminAuditModule } from "./audit/admin-audit.module";
import { KillSwitchModule } from "./kill-switch/kill-switch.module";
import { ObsExceptionFilter } from "./observability/obs.exception-filter";

@Module({
  imports: [
    CommonModule,
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
    PushModule,
    LoopModule,
    AdaptersModule,
    SimulationModule,
    AiModule,
    AuthModule,
    AdminAuditModule,
    KillSwitchModule,
  ],
  controllers: [HealthController],
  // Global admin boundary — an admin controller added without @UseGuards is
  // still deny-by-default (§9.9). Non-admin routes pass straight through.
  providers: [
    { provide: APP_GUARD, useClass: AdminGuard },
    { provide: APP_FILTER, useClass: ObsExceptionFilter },
  ],
})
export class AppModule {}
