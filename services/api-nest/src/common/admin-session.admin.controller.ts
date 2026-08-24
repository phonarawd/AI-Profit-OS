import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AdminGuard, type RequestWithAdmin } from "./admin.guard";

/**
 * Browser admin shell truth probe.
 * A token is considered connected only after the normal AdminGuard verifies
 * signature, issuer, known role and the server-side RBAC matrix.
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class AdminSessionAdminController {
  @Get("session")
  me(@Req() req: RequestWithAdmin) {
    return {
      connected: true,
      adminId: req.admin?.adminId ?? null,
      role: req.admin?.role ?? null,
    };
  }
}
