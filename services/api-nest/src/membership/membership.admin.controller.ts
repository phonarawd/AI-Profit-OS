import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { MembershipAdminService } from "./membership.admin.service";
import { MEMBERSHIP_ADMIN_ROUTES } from "./membership.routes";
import type {
  ForceMembershipRequest,
  GrantBonusMatchesRequest,
  MembershipId,
  PutGradeDailyCapRequest,
  PutMatchPolicyOverrideRequest,
  PutMemberDailyMatchCapRequest,
  ReclaimBonusMatchesRequest,
} from "./membership.types";

/**
 * Admin §9.8.10 HTTP · /api/v1/admin/users/:id/membership*
 * UI = /admin/users/:id?tab=membership · Auth/RBAC = AdminGuard (admin-rbac.v1).
 * fulfillRate = read-only · successRatePercent FORBIDDEN
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class MembershipAdminController {
  constructor(private readonly membership: MembershipAdminService) {}

  @Get(MEMBERSHIP_ADMIN_ROUTES.userDirectory)
  listUsers(
    @Query("q") q: string,
    @Query("cursor") cursor: string,
    @Query("limit") limit: string,
    @AdminOperator() operatorId: string,
  ) {
    return this.membership.searchUsers({ q, cursor, limit, operatorId });
  }

  @Get(MEMBERSHIP_ADMIN_ROUTES.userProfile)
  getUser(@Param("id") id: string) {
    return this.membership.getUserProfile(id);
  }

  @Get(MEMBERSHIP_ADMIN_ROUTES.membership)
  get(@Param("id") id: string) {
    return this.membership.getMembership(id);
  }

  @Put(MEMBERSHIP_ADMIN_ROUTES.membership)
  force(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    if (body && typeof body === "object" && "successRatePercent" in body) {
      throw new BadRequestException("successRatePercent FORBIDDEN");
    }
    if (body && typeof body === "object" && "fulfillRate7d" in body) {
      throw new BadRequestException(
        "fulfillRate7d is read-only · FORBIDDEN on write",
      );
    }
    const input: ForceMembershipRequest = {
      membership: String(body.membership ?? "") as MembershipId,
      reason: String(body.reason ?? ""),
      updatedByAdminId: operatorId,
      clearForce: body.clearForce === true,
    };
    return this.membership.forceMembership(id, input);
  }

  @Get(MEMBERSHIP_ADMIN_ROUTES.matchPolicyOverride)
  getMatchPolicy(@Param("id") id: string) {
    return this.membership.getMatchPolicyOverride(id);
  }

  @Put(MEMBERSHIP_ADMIN_ROUTES.matchPolicyOverride)
  putMatchPolicy(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    if (body && typeof body === "object" && "successRatePercent" in body) {
      throw new BadRequestException("successRatePercent FORBIDDEN");
    }
    if (body && typeof body === "object" && "fulfillRate7d" in body) {
      throw new BadRequestException(
        "fulfillRate7d FORBIDDEN on match-policy write",
      );
    }
    const input: PutMatchPolicyOverrideRequest = {
      matchStrictnessOverride: body.matchStrictnessOverride
        ? (String(body.matchStrictnessOverride) as PutMatchPolicyOverrideRequest["matchStrictnessOverride"])
        : undefined,
      minProfitUsdt:
        body.minProfitUsdt != null ? String(body.minProfitUsdt) : undefined,
      staleAllowanceSec:
        body.staleAllowanceSec != null
          ? Number(body.staleAllowanceSec)
          : undefined,
      maxRematchCount:
        body.maxRematchCount != null
          ? Number(body.maxRematchCount)
          : undefined,
      dailyUserMatchCap:
        body.dailyUserMatchCap != null && body.dailyUserMatchCap !== ""
          ? Number(body.dailyUserMatchCap)
          : undefined,
      reason: String(body.reason ?? ""),
      updatedByAdminId: operatorId,
      clear: body.clear === true,
      capOnly: body.capOnly === true,
    };
    return this.membership.putMatchPolicyOverride(id, input);
  }

  @Get(MEMBERSHIP_ADMIN_ROUTES.dailyMatchCap)
  getDailyMatchCap(@Param("id") id: string) {
    return this.membership.effectivePreview(id, "micro");
  }

  @Put(MEMBERSHIP_ADMIN_ROUTES.dailyMatchCap)
  putDailyMatchCap(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    const input: PutMemberDailyMatchCapRequest = {
      dailyUserMatchCap:
        body.dailyUserMatchCap != null && body.dailyUserMatchCap !== ""
          ? Number(body.dailyUserMatchCap)
          : undefined,
      reason: String(body.reason ?? ""),
      updatedByAdminId: operatorId,
      clear: body.clear === true,
    };
    return this.membership.putMemberDailyMatchCap(id, input);
  }

  @Get(MEMBERSHIP_ADMIN_ROUTES.effectivePreview)
  effectivePreview(
    @Param("id") id: string,
    @Query("capitalBand") capitalBand?: string,
  ) {
    return this.membership.effectivePreview(id, capitalBand || "micro");
  }

  @Get(MEMBERSHIP_ADMIN_ROUTES.gradeDailyCaps)
  listGradeDailyCaps() {
    return this.membership.listGradeDailyCaps();
  }

  @Put(MEMBERSHIP_ADMIN_ROUTES.gradeDailyCaps)
  putGradeDailyCaps(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    const input: PutGradeDailyCapRequest = {
      grade: String(body.grade ?? "") as MembershipId,
      dailyUserMatchCap: Number(body.dailyUserMatchCap),
      reason: String(body.reason ?? ""),
      updatedByAdminId: operatorId,
      expectedRevision:
        body.expectedRevision != null ? Number(body.expectedRevision) : undefined,
    };
    return this.membership.putGradeDailyCap(input);
  }

  @Get(MEMBERSHIP_ADMIN_ROUTES.bonusGrants)
  listBonus(@Param("id") id: string) {
    return this.membership.listBonus(id);
  }

  @Put(MEMBERSHIP_ADMIN_ROUTES.bonusGrants)
  grantBonus(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    const input: GrantBonusMatchesRequest = {
      amount: Number(body.amount),
      reason: String(body.reason ?? ""),
      updatedByAdminId: operatorId,
      idempotencyKey: String(body.idempotencyKey ?? ""),
    };
    return this.membership.grantBonus(id, input);
  }

  @Put(MEMBERSHIP_ADMIN_ROUTES.bonusReclaim)
  reclaimBonus(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    const input: ReclaimBonusMatchesRequest = {
      amount: body.amount != null ? Number(body.amount) : undefined,
      reason: String(body.reason ?? ""),
      updatedByAdminId: operatorId,
    };
    return this.membership.reclaimBonus(id, input);
  }

  @Get(MEMBERSHIP_ADMIN_ROUTES.quotaProjection)
  quotaProjection(@Param("id") id: string) {
    return this.membership.quotaProjection(id);
  }

  @Get(MEMBERSHIP_ADMIN_ROUTES.presentationProfile)
  listPresentationProfile() {
    return this.membership.listPresentationProfile();
  }

  @Put(MEMBERSHIP_ADMIN_ROUTES.presentationProfile)
  putPresentationProfile(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.membership.putPresentationProfile({
      profile: (body.profile && typeof body.profile === "object"
        ? body.profile
        : body) as object,
      reason: String(body.reason ?? ""),
      updatedByAdminId: operatorId,
      expectedRevision:
        body.expectedRevision != null
          ? Number(body.expectedRevision)
          : undefined,
    });
  }
}
