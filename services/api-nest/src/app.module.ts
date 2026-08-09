import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { EventsModule } from "./events/events.module";
import { HealthController } from "./health.controller";
import { LedgerModule } from "./ledger/ledger.module";
import { ReferralModule } from "./referral/referral.module";
import { RiskModule } from "./risk/risk.module";
import { WalletModule } from "./wallet/wallet.module";

@Module({
  imports: [
    EventsModule,
    LedgerModule,
    WalletModule,
    ComplianceModule,
    RiskModule,
    ReferralModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
