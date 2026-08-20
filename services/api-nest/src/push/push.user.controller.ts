/**
 * REL-020 유저 구독 · JWT session userId only
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PUSH_USER_ROUTES } from "./push.routes";
import { PushSubscriptionService } from "./push-subscription.service";

type SessionReq = {
  user?: { userId?: string; sub?: string };
  headers?: Record<string, string | string[] | undefined>;
};

@UseGuards(JwtAuthGuard)
@Controller()
export class PushUserController {
  constructor(private readonly subs: PushSubscriptionService) {}

  @Get(PUSH_USER_ROUTES.vapidPublic)
  vapidPublic() {
    const publicKey = String(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        process.env.VAPID_PUBLIC_KEY ||
        "",
    ).trim();
    if (!publicKey) {
      return { available: false, publicKey: null };
    }
    return { available: true, publicKey };
  }

  @Post(PUSH_USER_ROUTES.subscribe)
  subscribe(@Req() req: SessionReq, @Body() body: Record<string, unknown>) {
    const keys =
      body.keys && typeof body.keys === "object"
        ? (body.keys as Record<string, unknown>)
        : {};
    return this.subs.upsert(this.sessionUserId(req), {
      endpoint: String(body.endpoint ?? ""),
      p256dh: String(keys.p256dh ?? body.p256dh ?? ""),
      auth: String(keys.auth ?? body.auth ?? ""),
      platform: body.platform != null ? String(body.platform) : undefined,
      userAgent: header(req, "user-agent"),
    });
  }

  @Delete(PUSH_USER_ROUTES.unsubscribe)
  unsubscribe(@Req() req: SessionReq, @Body() body: Record<string, unknown>) {
    return this.subs.remove(this.sessionUserId(req), String(body.endpoint ?? ""));
  }

  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) throw new UnauthorizedException("AUTH_REQUIRED");
    return userId;
  }
}

function header(req: SessionReq, name: string): string | undefined {
  const raw = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}
