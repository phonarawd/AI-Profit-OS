/**
 * GET/PATCH/POST /api/v1/me/product-onboarding*
 * JWT session userId only · query/body userId 권위 금지
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { parseProgressPatch } from "./product-onboarding.parse";
import { PRODUCT_ONBOARDING_USER_ROUTES } from "./product-onboarding.routes";
import { ProductOnboardingService } from "./product-onboarding.service";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

@UseGuards(JwtAuthGuard)
@Controller()
export class ProductOnboardingUserController {
  constructor(private readonly onboarding: ProductOnboardingService) {}

  @Get(PRODUCT_ONBOARDING_USER_ROUTES.get)
  getState(@Req() req: SessionReq) {
    return this.onboarding.getForUser(this.sessionUserId(req));
  }

  @Patch(PRODUCT_ONBOARDING_USER_ROUTES.progress)
  patchProgress(@Req() req: SessionReq, @Body() body: unknown) {
    const parsed = parseProgressPatch(body);
    if ("error" in parsed) {
      throw new BadRequestException(parsed.error);
    }
    return this.onboarding.progressForUser(this.sessionUserId(req), parsed);
  }

  @Post(PRODUCT_ONBOARDING_USER_ROUTES.complete)
  complete(@Req() req: SessionReq) {
    return this.onboarding.completeForUser(this.sessionUserId(req));
  }

  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) throw new UnauthorizedException("AUTH_REQUIRED");
    return userId;
  }
}
