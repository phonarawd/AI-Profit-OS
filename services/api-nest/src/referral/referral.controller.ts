import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ReferralEdgeService } from "./referral.edge.service";
import { ReferralProgramService } from "./referral.program.service";
import { REFERRAL_USER_ROUTES } from "./referral.routes";
import { ReferralShareService } from "./referral.share.service";

/**
 * User referral surface · /api/v1/referral/*
 * Copy/explain Owns = UI §5.9.1a · this controller = bind/share/summary only
 */
@Controller()
export class ReferralController {
  constructor(
    private readonly program: ReferralProgramService,
    private readonly edges: ReferralEdgeService,
    private readonly shareService: ReferralShareService,
  ) {}

  @Get(REFERRAL_USER_ROUTES.me)
  async me(@Req() req: { user?: { userId?: string; sub?: string } }) {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    const cfg = await this.program.get();
    const asReferrer = userId
      ? await this.edges.listByReferrer(userId)
      : [];
    const asReferee = userId ? await this.edges.getByReferee(userId) : null;
    return {
      enabled: cfg.enabled,
      rewardsEnabled: cfg.rewardsEnabled,
      /** UI §5.9.1a — never expose L1/L2/L3 english on user surface */
      copyOwner: "UI §5.9.1a",
      inviteCountUnlimited: true,
      sharePerUserPerDay: cfg.sharePerUserPerDay,
      edges: asReferrer,
      myBinding: asReferee,
      /** Pool empty → show REFERRAL_POOL_WAIT copy · not invite failure */
      poolWaitToast: "REFERRAL_POOL_WAIT",
    };
  }

  @Post(REFERRAL_USER_ROUTES.bind)
  bind(
    @Body() body: Record<string, unknown>,
    @Req() req: { user?: { userId?: string; sub?: string } },
  ) {
    const refereeUserId = String(
      body.refereeUserId ?? req.user?.userId ?? req.user?.sub ?? "",
    );
    return this.edges.bind({
      refereeUserId,
      referralCode: String(body.referralCode ?? body.code ?? ""),
    });
  }

  @Post(REFERRAL_USER_ROUTES.share)
  share(
    @Body() body: Record<string, unknown>,
    @Req() req: { user?: { userId?: string; sub?: string } },
  ) {
    const userId = String(
      body.userId ?? req.user?.userId ?? req.user?.sub ?? "",
    );
    return this.shareService.recordShare(userId);
  }
}
