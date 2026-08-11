/**
 * Engine v7.23 R1 · HomeReadModelV1 orchestrator
 * Reuses HomeMoneyRead + OpportunitiesUser feed + GrowthPublic · mutation 0
 * App/React/CSS 변경 0 (UI R1 consumes later)
 */

import { Injectable } from "@nestjs/common";
import { GrowthPublicService } from "../growth/growth-public.service";
import { OpportunitiesUserService } from "../opportunities/opportunities.user.service";
import { HomeMoneyReadService } from "../wallet/home-money-read.service";
import { mapHomeReadModelV1 } from "./home-read.mi";

@Injectable()
export class HomeReadService {
  constructor(
    private readonly homeMoneyRead: HomeMoneyReadService,
    private readonly opportunities: OpportunitiesUserService,
    private readonly growth: GrowthPublicService,
  ) {}

  /**
   * Authenticated session only (controller JwtAuthGuard).
   * Guest/expired → SDK maps 401 to unauthorized DTO (no Fact invent).
   */
  async getForUser(userId: string): Promise<Record<string, unknown>> {
    const [money, feed, growth] = await Promise.all([
      this.homeMoneyRead.getForUser(userId),
      this.opportunities.listFeed(userId),
      this.growth.getPublicSurface(),
    ]);

    const items = Array.isArray(feed.items) ? feed.items : [];
    let oppAsOf: string | null = null;
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const pricedAt = (raw as Record<string, unknown>).pricedAt;
      if (typeof pricedAt === "string" && pricedAt) {
        if (!oppAsOf || pricedAt > oppAsOf) oppAsOf = pricedAt;
      }
    }

    return mapHomeReadModelV1({
      sessionStatus: "authenticated",
      money: {
        principalUsdt: money.principalUsdt,
        settlementCompletedTodayCount: money.settlementCompletedTodayCount,
        asOf: money.asOf,
        source: money.source,
        state: money.state,
        reasonCode: money.reasonCode,
      },
      opportunityItems: items,
      opportunityMeta: {
        affordableCount: feed.affordableCount,
        nearMissCount: feed.nearMissCount,
        lockedHighCount: feed.lockedHighCount,
        topSuggestDepositUsdt: feed.topSuggestDepositUsdt ?? null,
        asOf: oppAsOf,
      },
      growth: {
        tickerMode: growth.tickerMode,
        counterMode: growth.counterMode,
        ledgerTotal: growth.ledgerTotal,
        asOf: growth.asOf,
      },
    });
  }
}
