import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { UserDirectoryAdminService } from "./user-directory.admin.service";

@UseGuards(AdminGuard)
@Controller("admin")
export class UserDirectoryAdminController {
  constructor(private readonly users: UserDirectoryAdminService) {}

  @Get("users")
  listUsers(
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string,
  ) {
    return this.users.list({
      q,
      status,
      limit: limitRaw ? Number(limitRaw) : undefined,
      offset: offsetRaw ? Number(offsetRaw) : undefined,
    });
  }
}
