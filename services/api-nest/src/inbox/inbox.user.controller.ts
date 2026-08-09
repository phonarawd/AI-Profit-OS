/**
 * User inbox · GET/POST /api/v1/me/inbox*
 * Notification prefs · GET/PUT /api/v1/me/notification-prefs
 * UI §5.9.4 · §50.1n · JWT session userId only
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { INBOX_USER_ROUTES } from "./inbox.user.routes";
import { NotificationPrefsService } from "./notification-prefs.service";
import { OpsInboxService } from "./ops-inbox.service";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

@UseGuards(JwtAuthGuard)
@Controller()
export class InboxUserController {
  constructor(
    private readonly inbox: OpsInboxService,
    private readonly prefs: NotificationPrefsService,
  ) {}

  @Get(INBOX_USER_ROUTES.list)
  list(@Req() req: SessionReq) {
    return this.inbox.listForUser(this.sessionUserId(req));
  }

  @Post(INBOX_USER_ROUTES.read)
  read(@Req() req: SessionReq, @Param("id") id: string) {
    return this.inbox.markRead(this.sessionUserId(req), id);
  }

  @Post(INBOX_USER_ROUTES.hide)
  hide(@Req() req: SessionReq, @Param("id") id: string) {
    return this.inbox.hide(this.sessionUserId(req), id);
  }

  @Get(INBOX_USER_ROUTES.prefsGet)
  getPrefs(@Req() req: SessionReq) {
    return this.prefs.getForUser(this.sessionUserId(req));
  }

  @Put(INBOX_USER_ROUTES.prefsPut)
  putPrefs(@Req() req: SessionReq, @Body() body: Record<string, unknown>) {
    return this.prefs.putForUser(this.sessionUserId(req), {
      master: typeof body.master === "boolean" ? body.master : undefined,
      opportunity:
        typeof body.opportunity === "boolean" ? body.opportunity : undefined,
      wallet: typeof body.wallet === "boolean" ? body.wallet : undefined,
      notice: typeof body.notice === "boolean" ? body.notice : undefined,
      campaign: typeof body.campaign === "boolean" ? body.campaign : undefined,
      opsMessage:
        typeof body.opsMessage === "boolean" ? body.opsMessage : undefined,
      strategyMatch:
        typeof body.strategyMatch === "boolean"
          ? body.strategyMatch
          : undefined,
    });
  }

  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) throw new UnauthorizedException("AUTH_REQUIRED");
    return userId;
  }
}
