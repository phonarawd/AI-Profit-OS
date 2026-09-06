/**
 * S3 / B0 Admin 신원 · durable session · 로그인 API.
 */

import { Module } from "@nestjs/common";
import { AuthRateLimitGuard } from "../auth/auth-rate-limit.guard";
import { AdminApprovalsController } from "../admin-identity/approvals.admin.controller";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminSessionController } from "./admin-session.controller";
import { AdminSessionStoreService } from "./admin-session.store.pg";
import { TurnstileGuard } from "./turnstile.guard";
import { TurnstileService } from "./turnstile.service";

@Module({
  controllers: [
    AdminAuthController,
    AdminSessionController,
    AdminApprovalsController,
  ],
  providers: [
    AdminSessionStoreService,
    TurnstileService,
    TurnstileGuard,
    AuthRateLimitGuard,
  ],
})
export class AdminIdentityModule {}
