import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../audit/admin-audit.module";
import { UsersAdminController } from "./users.admin.controller";
import { UsersAdminService } from "./users-admin.service";

@Module({
  imports: [AdminAuditModule],
  controllers: [UsersAdminController],
  providers: [UsersAdminService],
})
export class UsersAdminModule {}
