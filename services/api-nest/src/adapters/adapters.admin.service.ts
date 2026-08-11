import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
  forwardRef,
} from "@nestjs/common";
import {
  DAY1_AUTO_PUBLISH_YAHOO_JP,
  DAY1_LEG_PAIRS,
  EBAY_MARKETPLACE_IDS,
  KPI_THRESHOLDS,
  PARTNER_LISTING_ADAPTERS,
  SIGNUP_READY_ADAPTERS,
  allDeployAdapters,
  assertNotForbidden,
  evaluateAdapterMatchingKpi,
  evaluateSkuMatchAttempt,
  healthStatusFromKpi,
  isForbiddenAdapterId,
  isIngestableAdapterId,
  resolveEbayIngestListings,
  assertNoQueryAssetIds,
  simulationS4InputFromKpi,
} from "./adapters.mi";
import { InProcessEventBus } from "../events/in-process.bus";
import { CatalogRuntimeSeedService } from "../opportunities/catalog-runtime-seed.service";
import { ADAPTER_EVENTS } from "./adapters.events";
import type {
  AdapterHealthRow,
  AdapterHealthStatus,
  AdapterIngestBody,
  AdapterKpiAlert,
  AdapterMatchAttemptBody,
  AdapterMatchingKpiResponse,
  ListingLegsSummary,
} from "./adapters.types";

const LABEL_KO: Record<string, string> = {
  ebay: "이베이 시세",
  amazon: "아마존 시세",
  yahoo_jp: "야후 일본 경매 시세",
  pokemontcg: "포켓몬 카드 목록",
  ygoprodeck: "유희왕 카드 목록",
  coingecko: "코인 환율",
  frankfurter: "법정화폐 환율",
};

type HealthState = {
  status: AdapterHealthStatus;
  lastIngestAt: string | null;
  lastError: string | null;
  observationCount24h: number;
  marketplaceIds?: string[];
  /** ingest-forced red/yellow wins over KPI tint */
  ingestStatus?: AdapterHealthStatus;
};

type StoredAttempt = {
  adapterId?: string;
  matched: boolean;
  gradeMismatch?: boolean;
  reason?: string;
  at: string;
};

type StoredListing = {
  id?: string;
  adapterId?: string;
  staleAt?: string;
};

type StoredCatalogItem = {
  compareReady?: boolean;
};

const MAX_ATTEMPTS = 5000;
const MAX_LISTINGS = 2000;
const MAX_CATALOG = 2000;
const MAX_IDENTITY_REVIEW = 2000;

export type IdentityReviewQueueItem = Record<string, unknown>;

@Injectable()
export class AdaptersAdminService {
  private readonly state = new Map<string, HealthState>();
  private readonly deployAdapters = allDeployAdapters();
  private attempts: StoredAttempt[] = [];
  private listings: StoredListing[] = [];
  private catalog: StoredCatalogItem[] = [];
  /** §0.10 unmatched ebay identity — Ops-visible · silent drop 금지 */
  private identityReview: IdentityReviewQueueItem[] = [];

  constructor(
    private readonly bus: InProcessEventBus,
    @Optional()
    @Inject(forwardRef(() => CatalogRuntimeSeedService))
    private readonly catalogSeed?: CatalogRuntimeSeedService,
  ) {
    for (const a of this.deployAdapters) {
      this.state.set(a.adapterId, {
        status: "unknown",
        lastIngestAt: null,
        lastError: null,
        observationCount24h: 0,
        marketplaceIds:
          a.adapterId === "ebay"
            ? [...EBAY_MARKETPLACE_IDS]
            : a.adapterId === "amazon"
              ? ["amazon_us", "amazon_jp", "amazon_de"]
              : a.adapterId === "yahoo_jp"
                ? ["yahoo_jp"]
                : undefined,
      });
    }
  }

  listHealth(): {
    items: AdapterHealthRow[];
    day1AutoPublishYahooJp: false;
    phase1Partners: string[];
    nearMissCapOwns: "execution-policy";
    matchingKpi: Omit<AdapterMatchingKpiResponse, "items">;
  } {
    const kpi = this.computeKpi();
    return {
      items: this.deployAdapters.map((a) => this.toRow(a.adapterId, kpi)),
      day1AutoPublishYahooJp: DAY1_AUTO_PUBLISH_YAHOO_JP,
      phase1Partners: PARTNER_LISTING_ADAPTERS.map((a) => a.adapterId),
      nearMissCapOwns: "execution-policy",
      matchingKpi: this.toKpiResponse(kpi),
    };
  }

  getHealth(adapterId: string): AdapterHealthRow {
    assertNotForbidden({ adapterId });
    if (isForbiddenAdapterId(adapterId)) {
      throw new BadRequestException(`FORBIDDEN adapter: ${adapterId}`);
    }
    const known = this.deployAdapters.find((a) => a.adapterId === adapterId);
    if (!known) {
      throw new BadRequestException(`unknown adapter: ${adapterId}`);
    }
    return this.toRow(adapterId, this.computeKpi(adapterId));
  }

  matchingKpi(): AdapterMatchingKpiResponse {
    const kpi = this.computeKpi();
    return {
      ...this.toKpiResponse(kpi),
      items: this.deployAdapters.map((a) => this.toRow(a.adapterId, kpi)),
    };
  }

  /**
   * Simulation-engine S4 선행 입력 (§51.4 adapterMatchFailureRate).
   */
  simulationS4Input(): {
    adapterMatchFailureRate: number;
    s4: {
      pass: boolean;
      threshold: number;
      rate: number;
      failAction: "adapter_alert";
    };
    day1AutoPublishYahooJp: false;
  } {
    const kpi = this.computeKpi();
    const frag = simulationS4InputFromKpi(kpi);
    return {
      ...frag,
      day1AutoPublishYahooJp: DAY1_AUTO_PUBLISH_YAHOO_JP,
    };
  }

  listingLegs(): ListingLegsSummary {
    return {
      day1: "ebay multi marketplaceId | admin",
      pairs: DAY1_LEG_PAIRS.map((p) => ({
        buy: p.buy,
        sell: p.sell,
        priority: p.priority,
      })),
      day1AutoPublishYahooJp: DAY1_AUTO_PUBLISH_YAHOO_JP,
      phase1Partners: ["amazon", "yahoo_jp"],
      forbidden: ["bunjang", "joonggonara", "daangn", "chrono24", "tcgplayer"],
    };
  }

  /**
   * Record SKU match attempts (Admin/test · pipeline). Emits health.changed on alert.
   */
  recordMatchAttempts(
    attempts: AdapterMatchAttemptBody[],
    opts?: { adapterId?: string },
  ): { accepted: number; kpi: Omit<AdapterMatchingKpiResponse, "items"> } {
    const nowIso = new Date().toISOString();
    let accepted = 0;
    for (const raw of attempts || []) {
      if (typeof raw?.matched !== "boolean") continue;
      this.attempts.push({
        adapterId: raw.adapterId || opts?.adapterId,
        matched: raw.matched,
        gradeMismatch: Boolean(raw.gradeMismatch),
        reason: raw.reason,
        at: raw.at || nowIso,
      });
      accepted += 1;
    }
    this.trimAttempts();
    const kpi = this.computeKpi(opts?.adapterId);
    this.applyKpiToHealth(kpi);
    return { accepted, kpi: this.toKpiResponse(kpi) };
  }

  /**
   * Evaluate + record a single SKU match (grade pipeline §51.12).
   */
  evaluateAndRecordSkuMatch(input: {
    category: string;
    assetMeta: object;
    listingMeta?: object;
    listingTitle?: string;
    listingCaption?: string;
    adapterId?: string;
  }): {
    attempt: ReturnType<typeof evaluateSkuMatchAttempt>;
    kpi: Omit<AdapterMatchingKpiResponse, "items">;
  } {
    const attempt = evaluateSkuMatchAttempt({
      ...input,
      adapterId: input.adapterId || "ebay",
      at: new Date().toISOString(),
    });
    this.recordMatchAttempts([
      {
        adapterId: attempt.adapterId,
        matched: attempt.matched,
        gradeMismatch: attempt.gradeMismatch,
        reason: attempt.reason,
        at: attempt.at,
      },
    ]);
    return { attempt, kpi: this.toKpiResponse(this.computeKpi()) };
  }

  /**
   * §0.10 Admin/Ops surface — unmatched ebay identity review queue.
   */
  identityReviewQueue(): {
    items: IdentityReviewQueueItem[];
    count: number;
    silentDrop: false;
  } {
    return {
      items: [...this.identityReview],
      count: this.identityReview.length,
      silentDrop: false,
    };
  }

  async ingest(body: AdapterIngestBody): Promise<{
    ok: true;
    adapterId: string;
    accepted: number;
    matchAttemptsAccepted: number;
    listingsPersisted?: number;
    identityMatched?: number;
    identityUnmatchedQueued?: number;
  }> {
    const adapterId = String(body.adapterId ?? "");
    assertNotForbidden({ adapterId, source: adapterId });
    if (isForbiddenAdapterId(adapterId)) {
      throw new BadRequestException(`FORBIDDEN adapter: ${adapterId}`);
    }
    if (!isIngestableAdapterId(adapterId)) {
      throw new BadRequestException(`unknown adapter: ${adapterId}`);
    }

    const observedAt = body.observedAt || new Date().toISOString();
    const obsCount = Array.isArray(body.observations)
      ? body.observations.length
      : 0;
    const listingCount = Array.isArray(body.listings) ? body.listings.length : 0;
    const catalogCount = Array.isArray(body.catalog) ? body.catalog.length : 0;
    const accepted = obsCount + listingCount + catalogCount;

    let status: AdapterHealthStatus = "green";
    if (body.error) status = "red";
    else if (body.dryRun && accepted === 0) status = "yellow";
    else if (accepted === 0) status = "yellow";

    const prev = this.state.get(adapterId) ?? {
      status: "unknown" as AdapterHealthStatus,
      lastIngestAt: null,
      lastError: null,
      observationCount24h: 0,
    };
    const next: HealthState = {
      status,
      ingestStatus: status,
      lastIngestAt: observedAt,
      lastError: body.error ?? null,
      observationCount24h: prev.observationCount24h + obsCount,
      marketplaceIds:
        body.marketplaceIds ??
        body.marketIds ??
        (adapterId === "ebay" ? [...EBAY_MARKETPLACE_IDS] : prev.marketplaceIds),
    };
    this.state.set(adapterId, next);

    if (Array.isArray(body.listings)) {
      for (const raw of body.listings) {
        if (!raw || typeof raw !== "object") continue;
        const L = raw as Record<string, unknown>;
        this.listings.push({
          id: typeof L.id === "string" ? L.id : undefined,
          adapterId:
            typeof L.adapterId === "string" ? L.adapterId : adapterId,
          staleAt: typeof L.staleAt === "string" ? L.staleAt : undefined,
        });
      }
      this.trimListings();
    }

    if (Array.isArray(body.catalog)) {
      for (const raw of body.catalog) {
        if (!raw || typeof raw !== "object") continue;
        const C = raw as Record<string, unknown>;
        this.catalog.push({
          compareReady:
            typeof C.compareReady === "boolean" ? C.compareReady : undefined,
        });
      }
      this.trimCatalog();
    }

    let listingsForPersist: unknown[] = Array.isArray(body.listings)
      ? body.listings
      : [];
    let identityMatched = 0;
    let identityUnmatchedQueued = 0;

    // §0.10 — ebay ingest: resolve query:* → Asset Master exact id · unmatched → review queue
    if (
      adapterId === "ebay" &&
      Array.isArray(body.listings) &&
      body.listings.length > 0 &&
      !body.dryRun
    ) {
      const resolved = resolveEbayIngestListings({
        listings: body.listings,
        now: observedAt,
      });
      assertNoQueryAssetIds(resolved.matched);
      this.enqueueIdentityReview(resolved.unmatched);
      identityMatched = resolved.matched.length;
      identityUnmatchedQueued = resolved.unmatched.length;
      listingsForPersist = resolved.matched;
      if (resolved.matchAttempts.length > 0) {
        this.recordMatchAttempts(resolved.matchAttempts, { adapterId: "ebay" });
      }
    }

    let matchAttemptsAccepted = 0;
    if (Array.isArray(body.matchAttempts) && body.matchAttempts.length > 0) {
      matchAttemptsAccepted = this.recordMatchAttempts(body.matchAttempts, {
        adapterId,
      }).accepted;
    } else {
      const kpi = this.computeKpi(adapterId);
      this.applyKpiToHealth(kpi);
    }

    let listingsPersisted = 0;
    if (
      this.catalogSeed &&
      listingsForPersist.length > 0 &&
      (adapterId === "ebay" || adapterId === "admin") &&
      !body.dryRun
    ) {
      const persisted = await this.catalogSeed.persistIngestListings(
        listingsForPersist,
        adapterId,
      );
      listingsPersisted = persisted.upserted;

      if (adapterId === "ebay") {
        for (const raw of listingsForPersist) {
          if (!raw || typeof raw !== "object") continue;
          const L = raw as Record<string, unknown>;
          const assetId = typeof L.assetId === "string" ? L.assetId : "";
          const imageUrl = typeof L.imageUrl === "string" ? L.imageUrl : "";
          if (!assetId || assetId.startsWith("query:") || !imageUrl) continue;
          await this.catalogSeed.applyEbayImageProvenance({
            assetId,
            imageUrl,
          });
        }
      }
    }

    const row = this.toRow(adapterId, this.computeKpi(adapterId));
    this.bus.emit(ADAPTER_EVENTS.healthChanged, row);
    this.bus.emit(ADAPTER_EVENTS.observationIngested, {
      adapterId,
      accepted,
      observedAt,
      dryRun: Boolean(body.dryRun),
      matchAttemptsAccepted,
      identityMatched,
      identityUnmatchedQueued,
    });

    return {
      ok: true,
      adapterId,
      accepted,
      matchAttemptsAccepted,
      listingsPersisted,
      identityMatched,
      identityUnmatchedQueued,
    };
  }

  private enqueueIdentityReview(items: IdentityReviewQueueItem[]): void {
    for (const item of items) {
      const key = String(
        item.externalItemId ?? item.listingId ?? item.id ?? "",
      );
      if (key) {
        this.identityReview = this.identityReview.filter((x) => {
          const xk = String(x.externalItemId ?? x.listingId ?? x.id ?? "");
          return xk !== key;
        });
      }
      this.identityReview.unshift({
        ...item,
        queuedAt: new Date().toISOString(),
      });
    }
    if (this.identityReview.length > MAX_IDENTITY_REVIEW) {
      this.identityReview = this.identityReview.slice(0, MAX_IDENTITY_REVIEW);
    }
  }

  private computeKpi(adapterId?: string) {
    return evaluateAdapterMatchingKpi({
      attempts: this.attempts,
      catalog: this.catalog,
      listings: this.listings,
      adapterId,
      now: Date.now(),
    });
  }

  private toKpiResponse(
    kpi: ReturnType<typeof evaluateAdapterMatchingKpi>,
  ): Omit<AdapterMatchingKpiResponse, "items"> {
    const s4 = simulationS4InputFromKpi(kpi).s4;
    return {
      skuMatchFailureRate: kpi.skuMatchFailureRate,
      skuAttempts: kpi.skuAttempts,
      skuFailures: kpi.skuFailures,
      gradeMismatchCount: kpi.gradeMismatchCount,
      compareReadyFalseRatio: kpi.compareReadyFalseRatio,
      compareReadyFalseCount: kpi.compareReadyFalseCount,
      catalogTotal: kpi.catalogTotal,
      adapterMatchFailureRate: kpi.adapterMatchFailureRate,
      windowHours: 24,
      thresholds: {
        skuMatchFailRateMax: 0.15,
        compareReadyFalseRatioMax: 0.4,
        windowHours: 24,
        s4AdapterMatchFailureRateMax: 0.15,
      },
      alerts: kpi.alerts as AdapterKpiAlert[],
      reduceAutoPublish: kpi.reduceAutoPublish,
      seedReviewQueue: kpi.seedReviewQueue,
      hideStaleOpps: kpi.hideStaleOpps,
      top2Red: kpi.top2Red,
      day1AutoPublishYahooJp: DAY1_AUTO_PUBLISH_YAHOO_JP,
      s4,
    };
  }

  private applyKpiToHealth(
    kpi: ReturnType<typeof evaluateAdapterMatchingKpi>,
  ): void {
    for (const a of this.deployAdapters) {
      const st = this.state.get(a.adapterId);
      if (!st) continue;
      const kpiStatus = healthStatusFromKpi(kpi, a.adapterId);
      // ingest red wins; else KPI can raise yellow/red
      if (st.ingestStatus === "red" || st.lastError) {
        st.status = "red";
      } else if (kpiStatus === "red") {
        st.status = "red";
      } else if (kpiStatus === "yellow") {
        st.status = st.ingestStatus === "green" ? "yellow" : st.ingestStatus || "yellow";
      } else if (st.ingestStatus) {
        st.status = st.ingestStatus;
      }
      this.state.set(a.adapterId, st);
    }
    if ((kpi.alerts || []).length > 0) {
      this.bus.emit(ADAPTER_EVENTS.healthChanged, {
        alerts: kpi.alerts,
        adapterMatchFailureRate: kpi.adapterMatchFailureRate,
        reduceAutoPublish: kpi.reduceAutoPublish,
      });
    }
  }

  private toRow(
    adapterId: string,
    kpi: ReturnType<typeof evaluateAdapterMatchingKpi>,
  ): AdapterHealthRow {
    const meta = this.deployAdapters.find((a) => a.adapterId === adapterId)!;
    const st = this.state.get(adapterId)!;
    const isPartner = PARTNER_LISTING_ADAPTERS.some(
      (a) => a.adapterId === adapterId,
    );
    const isSignup = SIGNUP_READY_ADAPTERS.some((a) => a.adapterId === adapterId);
    const adapterKpi = evaluateAdapterMatchingKpi({
      attempts: this.attempts,
      catalog: this.catalog,
      listings: this.listings,
      adapterId,
      now: Date.now(),
    });
    const alerts = (adapterKpi.alerts || []).filter(
      (a) => !a.adapterId || a.adapterId === adapterId,
    ) as AdapterKpiAlert[];
    // include global compare_ready alerts on Day-1 listing adapter
    if (adapterId === "ebay") {
      for (const a of kpi.alerts || []) {
        if (
          a.kind === "compare_ready_false" &&
          !alerts.some((x) => x.kind === "compare_ready_false")
        ) {
          alerts.push(a as AdapterKpiAlert);
        }
      }
    }
    const skuRate =
      adapterKpi.skuAttempts > 0 ? adapterKpi.skuMatchFailureRate : null;
    const day1Auto =
      isSignup &&
      meta.role === "listing" &&
      adapterId === "ebay" &&
      !adapterKpi.reduceAutoPublish;

    return {
      adapterId,
      worker: meta.worker,
      role: meta.role,
      status: st.status,
      phase: "1",
      day1AutoPublish: day1Auto,
      officialPartner: true,
      listingLegPhase: isPartner
        ? "Phase1+"
        : adapterId === "ebay"
          ? "Day-1"
          : undefined,
      lastIngestAt: st.lastIngestAt,
      lastError: st.lastError,
      listingLeg: meta.role === "listing",
      marketplaceIds: st.marketplaceIds,
      observationCount24h: st.observationCount24h,
      skuMatchFailureRate: skuRate,
      gradeMismatchCount: adapterKpi.gradeMismatchCount,
      alerts,
      reduceAutoPublish: adapterKpi.reduceAutoPublish,
      cacheHintSec: meta.cacheHintSec,
      labelKo: LABEL_KO[adapterId] ?? adapterId,
    };
  }

  private trimAttempts(): void {
    const cutoff =
      Date.now() - KPI_THRESHOLDS.windowHours * 3600_000;
    this.attempts = this.attempts
      .filter((a) => Date.parse(a.at) >= cutoff)
      .slice(-MAX_ATTEMPTS);
  }

  private trimListings(): void {
    if (this.listings.length > MAX_LISTINGS) {
      this.listings = this.listings.slice(-MAX_LISTINGS);
    }
  }

  private trimCatalog(): void {
    if (this.catalog.length > MAX_CATALOG) {
      this.catalog = this.catalog.slice(-MAX_CATALOG);
    }
  }
}
