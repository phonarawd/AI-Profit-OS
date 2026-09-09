/**
 * S3 / B0 maker-checker. 자기 승인은 서버에서 거부한다.
 */

import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard, type RequestWithAdmin } from "../common/admin.guard";
import { getAdminIdentityStore } from "../common/admin-session.store";
import {
  decideAdminApproval,
  submitAdminApproval,
} from "../common/admin-auth.flow";
import { isMakerCheckerAction } from "../common/admin-identity.policy";

@Controller("admin/approvals")
@UseGuards(AdminGuard)
export class AdminApprovalsController {
  @Get()
  async list(@Req() req: RequestWithAdmin) {
    if (!req.admin) throw new UnauthorizedException("ADMIN_AUTH_REQUIRED");
    const store = getAdminIdentityStore();
    if (!store) throw new UnauthorizedException("ADMIN_SESSION_UNAVAILABLE");
    return { items: [] as unknown[] };
  }

  @Post()
  async submit(@Body() body: Record<string, unknown>, @Req() req: RequestWithAdmin) {
    if (!req.admin) throw new UnauthorizedException("ADMIN_AUTH_REQUIRED");
    const actionType = String(body.actionType ?? "");
    const reason = String(body.reason ?? "");
    if (!isMakerCheckerAction(actionType) || reason.trim().length < 8) {
      throw new ForbiddenException("ADMIN_APPROVAL_INVALID");
    }
    const created = await submitAdminApproval({
      actionType,
      makerAdminId: req.admin.adminId,
      reason,
      payload:
        body.payload && typeof body.payload === "object"
          ? (body.payload as Record<string, unknown>)
          : {},
    });
    return { id: created.id, status: "pending" };
  }

  @Post(":id/decide")
  async decide(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithAdmin,
  ) {
    if (!req.admin) throw new UnauthorizedException("ADMIN_AUTH_REQUIRED");
    const result = await decideAdminApproval({
      id,
      checkerAdminId: req.admin.adminId,
      approve: body.approve !== false,
    });
    if (!result.ok) {
      throw new ForbiddenException(result.code);
    }
    return { id, status: result.status };
  }
}
