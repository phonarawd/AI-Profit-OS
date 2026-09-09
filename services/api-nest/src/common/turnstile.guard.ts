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
import { createRequire } from "node:module";
import { join } from "node:path";
import {
  TurnstileService,
  type TurnstileAction,
} from "./turnstile.service";

const policy = createRequire(__filename)(
  join(__dirname, "..", "..", "turnstile.policy.cjs"),
) as {
  turnstileActionFromPath: (path: string) => TurnstileAction | undefined;
};

type RequestWithTurnstile = {
  body?: { turnstileToken?: unknown };
  ip?: string;
  socket?: { remoteAddress?: string };
  path?: string;
  url?: string;
};

export function turnstileActionFromPath(path: string): TurnstileAction | undefined {
  return policy.turnstileActionFromPath(path);
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
