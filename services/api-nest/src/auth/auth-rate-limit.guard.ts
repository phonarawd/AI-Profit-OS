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
  UNAVAILABLE_MESSAGE_KO: string;
  decideAuthRateLimitAsync: (input: {
    ip?: string;
    account?: string;
    route?: string;
    nowMs?: number;
  }) => Promise<{
    allow: boolean;
    status?: number;
    messageKo?: string;
    degraded?: boolean;
    degradedReason?: string;
  }>;
  extractAccountHint: (body: unknown) => string;
  extractClientIp: (req: unknown) => string;
};

/**
 * Server-side limiter in front of every /auth/* route. A client-side
 * throttle alone can never satisfy this (REL-010). Distributed via Redis
 * when REDIS_URL is configured (Section 6.4); falls back to a single-
 * process in-memory window only when Redis was never configured at all
 * (local/CI/dev) - see services/api-nest/auth-rate-limit.cjs's own doc
 * comment for the full fail-open/fail-closed policy.
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
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
    const decision = await limiter.decideAuthRateLimitAsync({
      ip: limiter.extractClientIp(request),
      account: limiter.extractAccountHint(request.body),
      route,
      nowMs: Date.now(),
    });
    if (!decision.allow) {
      const message =
        decision.status === 503 ? limiter.UNAVAILABLE_MESSAGE_KO : limiter.MESSAGE_KO;
      throw new HttpException({ message }, decision.status ?? 429);
    }
    return true;
  }
}
