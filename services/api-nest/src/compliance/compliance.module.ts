import { Module } from "@nestjs/common";
import { KycAdminController } from "./kyc.admin.controller";
import { KycController } from "./kyc.controller";
import { KycR2Service } from "./kyc-r2.service";
import { KycService } from "./kyc.service";

@Module({
  controllers: [KycController, KycAdminController],
  providers: [KycService, KycR2Service],
  exports: [KycService, KycR2Service],
})
export class ComplianceModule {}
