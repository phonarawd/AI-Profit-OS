/**
 * 공개 쓰기 경로에만 붙인다. 설정이 없으면 통과가 아니라 막는다.
 */

import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  TurnstileService,
  type TurnstileAction,
} from "./turnstile.service";

type RequestWithTurnstile = {
  body?: { turnstileToken?: unknown };
  ip?: string;
  socket?: { remoteAddress?: string };
  path?: string;
  url?: string;
};

export function turnstileActionFromPath(path: string): TurnstileAction | undefined {
  const p = String(path || "");
  if (p.includes("signup/classic") || p.endsWith("/signup")) return "signup";
  if (p.endsWith("/login") || p.includes("/auth/login")) return "login";
  if (p.includes("find-id")) return "find-id";
  if (p.includes("password-reset")) return "password-reset";
  if (p.includes("email/resend")) return "email-resend";
  if (p.includes("magic-link")) return "magic-link";
  if (p.includes("admin") && p.includes("login")) return "admin-login";
  return undefined;
}

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
    const path = String(request.path || request.url || "");
    const result = await this.turnstile.verify(request.body?.turnstileToken, {
      remoteIp,
      expectedAction: turnstileActionFromPath(path),
    });
    if (result.ok) return true;
    if (
      result.reason === "VERIFY_UNAVAILABLE" ||
      result.reason === "NOT_CONFIGURED"
    ) {
      throw new ServiceUnavailableException("TURNSTILE_UNAVAILABLE");
    }
    throw new BadRequestException("TURNSTILE_FAILED");
  }
}
