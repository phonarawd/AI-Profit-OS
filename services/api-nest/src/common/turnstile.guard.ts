/**
 * Per-route Turnstile guard (Section 6.3). Applied explicitly via
 * @UseGuards(TurnstileGuard) on the specific public write endpoints that
 * need a bot check (classic signup, password login, password-reset
 * request, find-id, magic-link request, email-verify resend) - never
 * controller-wide, since low-risk routes (session read, logout, refresh)
 * do not need it.
 *
 * Reads the token from `body.turnstileToken`. Never treats a missing
 * TurnstileService configuration as a pass (see TurnstileService itself).
 */

import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { TurnstileService } from "./turnstile.service";

type RequestWithTurnstile = {
  body?: { turnstileToken?: unknown };
  ip?: string;
  socket?: { remoteAddress?: string };
};

@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(private readonly turnstile: TurnstileService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTurnstile>();
    const remoteIp =
      typeof request.ip === "string" && request.ip
        ? request.ip
        : typeof request.socket?.remoteAddress === "string"
          ? request.socket.remoteAddress
          : undefined;
    const result = await this.turnstile.verify(request.body?.turnstileToken, {
      remoteIp,
    });
    if (result.ok) return true;
    if (result.reason === "VERIFY_UNAVAILABLE" || result.reason === "NOT_CONFIGURED") {
      throw new ServiceUnavailableException("TURNSTILE_UNAVAILABLE");
    }
    throw new BadRequestException("TURNSTILE_FAILED");
  }
}
