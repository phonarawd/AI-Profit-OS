import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";

const req = createRequire(__filename);
const limiter = req(join(__dirname, "..", "..", "auth-rate-limit.cjs")) as {
  MESSAGE_KO: string;
  decideAuthRateLimit: (input: {
    ip?: string;
    account?: string;
    route?: string;
    nowMs?: number;
  }) => { allow: boolean; status?: number; messageKo?: string };
  extractAccountHint: (body: unknown) => string;
  extractClientIp: (req: unknown) => string;
};

/**
 * Auth 전 라우트 서버 limiter. 클라이언트 쓰로틀만으로는 통과 불가.
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<{
      method?: string;
      path?: string;
      url?: string;
      body?: unknown;
      ip?: string;
      headers?: Record<string, unknown>;
      socket?: { remoteAddress?: string };
    }>();
    const route = `${String(request.method || "GET")} ${String(request.path || request.url || "/")}`.trim();
    const decision = limiter.decideAuthRateLimit({
      ip: limiter.extractClientIp(request),
      account: limiter.extractAccountHint(request.body),
      route,
      nowMs: Date.now(),
    });
    if (!decision.allow) {
      throw new HttpException(
        { message: limiter.MESSAGE_KO },
        decision.status ?? 429,
      );
    }
    return true;
  }
}
