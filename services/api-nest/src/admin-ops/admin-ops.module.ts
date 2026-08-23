import { Module } from "@nestjs/common";
import { AdminOpsAdminController } from "./admin-ops.admin.controller";
import { AdminOpsService } from "./admin-ops.service";

@Module({
  controllers: [AdminOpsAdminController],
  providers: [AdminOpsService],
  exports: [AdminOpsService],
})
export class AdminOpsModule {}
