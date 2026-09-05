import { Controller, Get, Param, Query, Req, UseGuards } from "@nestjs/common";
import { AdminGuard, type RequestWithAdmin } from "../common/admin.guard";
import { AdminAuditService } from "../audit/admin-audit.service";
import {
  UsersAdminService,
  type AdminUserSignupMethod,
  type AdminUserStatusFilter,
} from "./users-admin.service";

const STATUS_VALUES: ReadonlySet<string> = new Set(["active", "banned", "deleted", "all"]);
const SIGNUP_METHOD_VALUES: ReadonlySet<string> = new Set([
  "classic",
  "kakao",
  "google",
  "passkey",
  "email_magic",
  "all",
]);

/**
 * Admin members directory (S1F Section 9.1).
 * GET /api/v1/admin/users - paginated list with search/filter/sort.
 * GET /api/v1/admin/users/:id - single-record detail (unmasked).
 */
@UseGuards(AdminGuard)
@Controller("admin/users")
export class UsersAdminController {
  constructor(
    private readonly users: UsersAdminService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  async list(
    @Query() query: Record<string, string | undefined>,
    @Req() req: RequestWithAdmin,
  ) {
    const status = STATUS_VALUES.has(String(query.status ?? ""))
      ? (query.status as AdminUserStatusFilter)
      : "all";
    const signupMethod = SIGNUP_METHOD_VALUES.has(String(query.signupMethod ?? ""))
      ? (query.signupMethod as AdminUserSignupMethod | "all")
      : "all";
    const order = query.order === "asc" ? "asc" : "desc";
    const search = typeof query.search === "string" ? query.search.slice(0, 200) : undefined;

    const result = await this.users.list({
      page: Number(query.page) || 1,
      pageSize: Number(query.pageSize) || 20,
      search,
      status,
      signupMethod,
      order,
    });

    const admin = req.admin;
    if (admin) {
      await this.audit
        .write({
          actorKey: admin.adminId,
          actorId: admin.adminId,
          role: admin.role,
          action: "admin.users.list",
          targetType: "user_directory",
          targetId: "list",
          mode: "n/a",
          result: "applied",
          payload: {
            hasSearch: Boolean(search),
            status,
            signupMethod,
            page: result.page,
            resultCount: result.items.length,
          },
        })
        .catch(() => undefined);
    }

    return result;
  }

  @Get(":id")
  async get(@Param("id") id: string, @Req() req: RequestWithAdmin) {
    const detail = await this.users.get(id);
    const admin = req.admin;
    if (admin) {
      await this.audit
        .write({
          actorKey: admin.adminId,
          actorId: admin.adminId,
          role: admin.role,
          action: "admin.users.get",
          targetType: "user",
          targetId: id,
          mode: "n/a",
          result: detail ? "applied" : "denied",
        })
        .catch(() => undefined);
    }
    return detail;
  }
}
