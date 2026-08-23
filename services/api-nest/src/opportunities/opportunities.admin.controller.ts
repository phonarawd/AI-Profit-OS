import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import type { RequestWithAdmin } from "../common/admin.guard";
import { PriceOverrideService } from "../price-override/price-override.service";
import { CatalogRuntimeSeedService } from "./catalog-runtime-seed.service";
import { OpportunitiesAdminService } from "./opportunities.admin.service";
import { isCapitalBand } from "./opportunities.mi";
import { OPPORTUNITY_ADMIN_ROUTES } from "./opportunities.routes";
import type {
  CapitalBand,
  OpportunityAdminListQuery,
  UpdateOpportunityPricingRequest,
} from "./opportunities.types";

/**
 * Admin opportunities · /api/v1/admin/opportunities/*
 * UI = /admin/opportunities · ?tab=assets · Auth/RBAC = AdminGuard (admin-rbac.v1).
 * Independent /admin/assets route FORBIDDEN (sidebar 13).
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class OpportunitiesAdminController {
  constructor(
    private readonly opportunities: OpportunitiesAdminService,
    private readonly catalogSeed: CatalogRuntimeSeedService,
    private readonly priceOverride: PriceOverrideService,
  ) {}

  @Get(OPPORTUNITY_ADMIN_ROUTES.assets)
  listAssets(
    @Query("image_missing") imageMissingRaw?: string,
    @Query("category") category?: string,
    @Query("limit") limitRaw?: string,
  ) {
    const q: {
      image_missing?: boolean;
      category?: string;
      limit?: number;
    } = {
      category: category || undefined,
      limit: limitRaw ? Number(limitRaw) : undefined,
    };
    if (imageMissingRaw != null && imageMissingRaw !== "") {
      q.image_missing =
        imageMissingRaw === "true" || imageMissingRaw === "1";
    }
    return this.opportunities.listAssets(q);
  }

  @Get(OPPORTUNITY_ADMIN_ROUTES.list)
  list(
    @Query("compareReady") compareReadyRaw?: string,
    @Query("gradeMismatch") gradeMismatchRaw?: string,
    @Query("image_missing") imageMissingRaw?: string,
    @Query("capitalBand") capitalBand?: string,
    @Query("status") status?: string,
    @Query("category") category?: string,
    @Query("limit") limitRaw?: string,
  ) {
    if (capitalBand != null && capitalBand !== "" && !isCapitalBand(capitalBand)) {
      throw new Error(
        "capitalBand must be micro|small|mid|high|whale",
      );
    }
    const q: OpportunityAdminListQuery = {
      capitalBand: capitalBand
        ? (capitalBand as CapitalBand)
        : undefined,
      status: status as OpportunityAdminListQuery["status"],
      category: category as OpportunityAdminListQuery["category"],
      limit: limitRaw ? Number(limitRaw) : undefined,
    };
    if (compareReadyRaw != null && compareReadyRaw !== "") {
      q.compareReady = compareReadyRaw === "true" || compareReadyRaw === "1";
    }
    if (gradeMismatchRaw != null && gradeMismatchRaw !== "") {
      q.gradeMismatch =
        gradeMismatchRaw === "true" || gradeMismatchRaw === "1";
    }
    if (imageMissingRaw != null && imageMissingRaw !== "") {
      q.image_missing =
        imageMissingRaw === "true" || imageMissingRaw === "1";
    }
    return this.opportunities.list(q);
  }

  @Get(OPPORTUNITY_ADMIN_ROUTES.get)
  get(@Param("id") id: string) {
    return this.opportunities.get(id);
  }

  @Get(OPPORTUNITY_ADMIN_ROUTES.priceLayers)
  getPriceLayers(@Param("id") id: string) {
    return this.priceOverride.describe(id);
  }

  @Patch(OPPORTUNITY_ADMIN_ROUTES.patchPricing)
  patchPricing(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    const patch: UpdateOpportunityPricingRequest = {
      adminBuyUsdt: body.adminBuyUsdt != null ? String(body.adminBuyUsdt) : undefined,
      adminSellUsdt:
        body.adminSellUsdt != null ? String(body.adminSellUsdt) : undefined,
      adminMarginPct:
        body.adminMarginPct != null ? String(body.adminMarginPct) : undefined,
      useAdminOverride: Boolean(body.useAdminOverride),
      expectedPricingVersion: Number(body.expectedPricingVersion),
      buyMarketId: body.buyMarketId as UpdateOpportunityPricingRequest["buyMarketId"],
      sellMarketId:
        body.sellMarketId as UpdateOpportunityPricingRequest["sellMarketId"],
      updatedByAdminId: operatorId,
      reason: String(body.reason ?? ""),
      reasonCode: String(body.reasonCode ?? ""),
      role: req.admin?.role ?? "unknown",
    };
    return this.opportunities.patchPricing(id, patch);
  }

  @Put(OPPORTUNITY_ADMIN_ROUTES.assets)
  upsertAsset(@Body() body: Record<string, unknown>) {
    return this.opportunities.upsertAsset(body);
  }

  @Post(OPPORTUNITY_ADMIN_ROUTES.seedTradingCards)
  seedTradingCards() {
    return this.opportunities.seedTradingCardAssets();
  }

  @Post(OPPORTUNITY_ADMIN_ROUTES.seedLuxuryBags)
  seedLuxuryBags() {
    return this.opportunities.seedLuxuryBagAssets();
  }

  @Post(OPPORTUNITY_ADMIN_ROUTES.seedWatches)
  seedWatches() {
    return this.opportunities.seedWatchAssets();
  }

  @Post(OPPORTUNITY_ADMIN_ROUTES.catalogRuntimeSeed)
  catalogRuntimeSeed() {
    return this.catalogSeed.ensureMinCatalog();
  }

  @Post(OPPORTUNITY_ADMIN_ROUTES.evaluateGrade)
  evaluateGrade(@Body() body: Record<string, unknown>) {
    return this.opportunities.evaluateGradeMismatch(body);
  }

  @Post(OPPORTUNITY_ADMIN_ROUTES.evaluateBagMatch)
  evaluateBagMatch(@Body() body: Record<string, unknown>) {
    return this.opportunities.evaluateBagMatch(body);
  }

  @Post(OPPORTUNITY_ADMIN_ROUTES.evaluateWatchMatch)
  evaluateWatchMatch(@Body() body: Record<string, unknown>) {
    return this.opportunities.evaluateWatchMatch(body);
  }

  @Post(OPPORTUNITY_ADMIN_ROUTES.assetImage)
  registerAssetImage(
    @Param("assetId") assetId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.opportunities.registerAssetImage(assetId, body);
  }
}
