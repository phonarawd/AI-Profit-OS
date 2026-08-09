/**
 * User membership · GET /api/v1/me/membership
 * Engine §0.0.7 / §0.9 E-R7
 * Display-only: ladder · aiPerkFlags · fulfillRate7d · Rule 입력 0
 * userId = JWT session only (§0.9.3 · query/body userId FORBIDDEN)
 */

import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MembershipAdminService } from "./membership.admin.service";
import { MEMBERSHIP_USER_ROUTES } from "./membership.user.routes";
import {
  MEMBERSHIP_ENUM,
  membershipDefaults,
} from "./membership.mi";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

/** P0-1 fix — JwtAuthGuard populates req.user from a real verified session */
@UseGuards(JwtAuthGuard)
@Controller()
export class MembershipUserController {
  constructor(private readonly membership: MembershipAdminService) {}

  @Get(MEMBERSHIP_USER_ROUTES.get)
  async get(@Req() req: SessionReq) {
    const userId = this.sessionUserId(req);
    const full = await this.membership.getMembership(userId);
    const m = full.membership;
    const aiPerkFlags = Array.isArray(m.aiPerkFlags)
      ? [...m.aiPerkFlags]
      : [...full.ladder.aiPerkFlags];

    return {
      membership: m.membership,
      labelKo: full.labelKo,
      maxCapitalBand: m.maxCapitalBand,
      dailyUserMatchCap: m.dailyUserMatchCap,
      dailyMatchesUsed: m.dailyMatchesUsed,
      matchStrictness: m.matchStrictness,
      aiPerkFlags,
      fulfillRate7d: m.fulfillRate7d ?? null,
      /** Display-only KPI · NEVER evaluateMatchSuccess / mergeEffectivePolicy */
      fulfillRateReadOnly: true as const,
      ruleInputExcluded: true as const,
      /** Current rung defaults (cap · flags · band) */
      current: full.ladder,
      /** Full ladder for membership-home UI (copy Owns=UI) */
      ladder: MEMBERSHIP_ENUM.map((id) => membershipDefaults(id)),
    };
  }

  /** §0.9.3 — never trust query/body userId */
  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    return userId;
  }
}
