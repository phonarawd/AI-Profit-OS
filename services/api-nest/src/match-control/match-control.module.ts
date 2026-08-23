import { Module } from "@nestjs/common";
import { MatchControlAdminController } from "./match-control.admin.controller";
import { MatchControlService } from "./match-control.service";

@Module({
  controllers: [MatchControlAdminController],
  providers: [MatchControlService],
  exports: [MatchControlService],
})
export class MatchControlModule {}
