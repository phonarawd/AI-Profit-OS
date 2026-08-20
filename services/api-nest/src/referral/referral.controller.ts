import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ReferralEdgeService } from "./referral.edge.service";
import { ReferralProgramService } from "./referral.program.service";
import { REFERRAL_USER_ROUTES } from "./referral.routes";
import { ReferralShareService } from "./referral.share.service";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

/**
 * User referral surface · /api/v1/referral/*
 * Copy/explain Owns = UI §5.9.1a · this controller = bind/share/summary only
 * P0-1 fix — JwtAuthGuard populates req.user; body-supplied identity is no
 * longer trusted (previously body.refereeUserId/body.userId could override
 * the session, which would have been a privilege-escalation bypass once a
 * real guard existed).
 */
@UseGuards(JwtAuthGuard)
@Controller()
export class ReferralController {
  constructor(
    private readonly program: ReferralProgramService,
    private readonly edges: ReferralEdgeService,
    private readonly shareService: ReferralShareService,
  ) {}

  @Get(REFERRAL_USER_ROUTES.me)
  async me(@Req() req: SessionReq) {
    const userId = this.sessionUserId(req);
    const cfg = await this.program.get();
    const asReferrer = await this.edges.listByReferrer(userId);
    const asReferee = await this.edges.getByReferee(userId);
    const myReferralCode = await this.edges.getMyReferralCode(userId);
    return {
      enabled: cfg.enabled,
      rewardsEnabled: cfg.rewardsEnabled,
      /** UI §5.9.1a — never expose L1/L2/L3 english on user surface */
      copyOwner: "UI §5.9.1a",
      inviteCountUnlimited: true,
      sharePerUserPerDay: cfg.sharePerUserPerDay,
      myReferralCode,
      edges: asReferrer,
      myBinding: asReferee,
      /** Pool empty → show REFERRAL_POOL_WAIT copy · not invite failure */
      poolWaitToast: "REFERRAL_POOL_WAIT",
    };
  }

  @Post(REFERRAL_USER_ROUTES.bind)
  bind(@Body() body: Record<string, unknown>, @Req() req: SessionReq) {
    const refereeUserId = this.sessionUserId(req);
    return this.edges.bind({
      refereeUserId,
      referralCode: String(body.referralCode ?? body.code ?? ""),
    });
  }

  @Post(REFERRAL_USER_ROUTES.share)
  share(@Req() req: SessionReq) {
    const userId = this.sessionUserId(req);
    return this.shareService.recordShare(userId);
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
