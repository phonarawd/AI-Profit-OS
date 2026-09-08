/**
 * Phase0 in-process FASHIONPHILE pull.
 * Worker cron과 동일 추출·ingest. 운영자 tick 0.
 * Listing-leg persist = 0.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { AdaptersAdminService } from "./adapters.admin.service";
import {
  fetchFashionphileObservationCatalog,
} from "./adapters.mi";

const PULL_INTERVAL_MS = 1_800_000;
const BOOT_DELAY_MS = 20_000;

@Injectable()
export class FashionphileObservationPullService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger(FashionphileObservationPullService.name);
  private boot: ReturnType<typeof setTimeout> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly adapters: AdaptersAdminService) {}

  onModuleInit() {
    if (process.env.FASHIONPHILE_OBSERVATION_PULL === "0") return;
    if (process.env.NODE_ENV === "test") return;
    this.boot = setTimeout(() => {
      void this.tick();
    }, BOOT_DELAY_MS);
    this.timer = setInterval(() => {
      void this.tick();
    }, PULL_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.boot) clearTimeout(this.boot);
    if (this.timer) clearInterval(this.timer);
    this.boot = null;
    this.timer = null;
  }

  async tick(): Promise<{
    ok: boolean;
    skipped?: boolean;
    observations?: number;
    observationMatches?: number;
    error?: string;
  }> {
    if (this.running) return { ok: true, skipped: true };
    this.running = true;
    try {
      const catalog = await fetchFashionphileObservationCatalog();
      const observedAt = new Date().toISOString();
      const ingested = await this.adapters.ingest({
        adapterId: "fashionphile",
        worker: "in-process",
        role: "observation",
        observedAt,
        listings: [],
        observations: catalog.accepted,
        error:
          catalog.accepted.length === 0 ? catalog.fetchErrors[0] : undefined,
      });
      this.log.log(
        `fashionphile pull raw=${catalog.rawProducts} accepted=${catalog.accepted.length} matched=${ingested.observationMatches ?? 0}`,
      );
      return {
        ok: ingested.ok,
        observations: catalog.accepted.length,
        observationMatches: ingested.observationMatches,
        error: catalog.fetchErrors[0],
      };
    } catch (err) {
      const error =
        err instanceof Error ? err.message.slice(0, 160) : "pull_failed";
      this.log.warn(`fashionphile pull failed: ${error}`);
      return { ok: false, error };
    } finally {
      this.running = false;
    }
  }
}
