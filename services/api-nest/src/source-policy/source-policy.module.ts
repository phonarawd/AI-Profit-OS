import { Module } from "@nestjs/common";
import { AdaptersModule } from "../adapters/adapters.module";
import { SourcePolicyAdminController } from "./source-policy.admin.controller";
import { SourcePolicyService } from "./source-policy.service";

@Module({
  imports: [AdaptersModule],
  controllers: [SourcePolicyAdminController],
  providers: [SourcePolicyService],
  exports: [SourcePolicyService],
})
export class SourcePolicyModule {}
