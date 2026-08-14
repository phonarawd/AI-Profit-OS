/**
 * PTF-00C P0-B — real-time FX ingest repair.
 *
 * Root cause fixed here: `AdapterIngestBody.fx` (coingecko/frankfurter) was
 * accepted by the DTO but never read by AdaptersAdminService.ingest() — only
 * the hardcoded Day-1 bootstrap snapshot ever existed. This service durably
 * persists validated FX observations as new IMMUTABLE fx_snapshots rows
 * (never UPDATEs an existing row's rates — approxKrwFromSnapshot's "same
 * snapshot only" guarantee and every already-issued opportunity's
 * fx_snapshot_id both depend on that immutability).
 *
 * Marketplace-normalization legs (gbpUsd/eurUsd/audUsd/usdtPerUsd) are
 * carried forward from the latest row only while within a bounded freshness
 * window — past that, they go null (fail-closed, never fabricated). The
 * legacy KRW-approx-display leg keeps its pre-existing carry-forward
 * posture (display-only, not a money-authoritative gate) — repairing its
 * freshness policy is out of PTF-00C's price-denomination/resilience scope.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { isPositiveAmount } from "../ledger/ledger.money";
import { composeFxSnapshot, deriveMarketplaceLegs } from "./opportunities.mi";

/** CoinGecko cacheHintSec=120s → generous carry-forward bound for its legs. */
const COINGECKO_CARRY_FORWARD_MS = 15 * 60 * 1000;
/** Frankfurter cacheHintSec=3600s (daily-cadence rate) → wider bound. */
const FRANKFURTER_CARRY_FORWARD_MS = 6 * 60 * 60 * 1000;
/** Marketplace legs may be carried from either adapter's last tick — use the wider bound. */
const MARKETPLACE_LEG_CARRY_FORWARD_MS = FRANKFURTER_CARRY_FORWARD_MS;

export type FxNormalizationSnapshotRow = {
  id: string;
  gbpUsd: string | null;
  eurUsd: string | null;
  audUsd: string | null;
  usdtPerUsd: string | null;
  capturedAt: string;
};

type LegProvenance = { source: string; capturedAt: string };
type RateProvenance = Record<string, LegProvenance>;

type LatestRow = {
  id: string;
  usd_krw: string;
  usdt_usd: string | null;
  usd_krw_frank: string | null;
  gbp_usd: string | null;
  eur_usd: string | null;
  aud_usd: string | null;
  usdt_per_usd: string | null;
  formula_id: string;
  sources: string[] | null;
  rate_provenance: RateProvenance | null;
  captured_at: string;
};

export type FxIngestResult = {
  ok: boolean;
  snapshotId: string | null;
  created: boolean;
  reason?: string;
};

@Injectable()
export class FxSnapshotService {
  private readonly logger = new Logger(FxSnapshotService.name);

  constructor(private readonly db: PostgresService) {}

  /**
   * Latest snapshot usable for native→USDT normalization (catalog-runtime-seed
   * persistIngestListings). Legs never resolved stay null — callers must
   * fail closed, never assume/fabricate a rate.
   */
  async getLatestUsableSnapshot(): Promise<FxNormalizationSnapshotRow | null> {
    if (!this.db.configured()) return null;
    const row = await this.loadLatest();
    if (!row) return null;
    return {
      id: row.id,
      gbpUsd: row.gbp_usd,
      eurUsd: row.eur_usd,
      audUsd: row.aud_usd,
      usdtPerUsd: row.usdt_per_usd,
      capturedAt: row.captured_at,
    };
  }

  /**
   * PTF-00C P0-B entry point — call for adapterId=coingecko|frankfurter fx
   * ingest ticks. Idempotent: a composite result identical to the latest
   * row is a no-op (never inserts a byte-identical duplicate).
   */
  async recordFxIngest(input: {
    adapterId: "coingecko" | "frankfurter";
    fx: Record<string, unknown> | null | undefined;
    observedAt: string;
  }): Promise<FxIngestResult> {
    if (!this.db.configured()) {
      return { ok: false, snapshotId: null, created: false, reason: "DATABASE_URL_UNSET" };
    }
    const fx = input.fx && typeof input.fx === "object" ? input.fx : {};
    const observedAt = this.isIsoDate(input.observedAt)
      ? input.observedAt
      : new Date().toISOString();
    const nowMs = Date.parse(observedAt);

    const raw = this.readAdapterFields(input.adapterId, fx);
    if (Object.keys(raw).length === 0) {
      return { ok: false, snapshotId: null, created: false, reason: "FX_EMPTY_PAYLOAD" };
    }

    const prev = await this.loadLatest();
    const carryMarketplace =
      !!prev && nowMs - Date.parse(prev.captured_at) <= MARKETPLACE_LEG_CARRY_FORWARD_MS;

    // --- marketplace-normalization legs (P0-A/P0-B core) ---
    const freshLegs = deriveMarketplaceLegs({
      usdtUsd: raw.usdtUsd,
      usdGbp: raw.usdGbp,
      usdEur: raw.usdEur,
      usdAud: raw.usdAud,
    });
    const gbpUsd = freshLegs.gbpUsd ?? (carryMarketplace ? prev?.gbp_usd ?? null : null);
    const eurUsd = freshLegs.eurUsd ?? (carryMarketplace ? prev?.eur_usd ?? null : null);
    const audUsd = freshLegs.audUsd ?? (carryMarketplace ? prev?.aud_usd ?? null : null);
    let usdtPerUsd = freshLegs.usdtPerUsd ?? (carryMarketplace ? prev?.usdt_per_usd ?? null : null);

    // --- legacy KRW-approx display leg — unchanged carry-forward posture ---
    let usdtKrw: string;
    let usdtUsdOut: string | null;
    let usdKrwFrank: string | null;
    let formulaId: string;
    if (raw.usdtKrw) {
      const composed = composeFxSnapshot({
        fxSnapshotId: "tmp",
        primary: { usdtKrw: raw.usdtKrw },
        capturedAt: observedAt,
      });
      usdtKrw = composed.usdtKrw;
      usdtUsdOut = raw.usdtUsd ?? prev?.usdt_usd ?? null;
      usdKrwFrank = prev?.usd_krw_frank ?? null;
      formulaId = composed.formulaId;
    } else if (raw.usdtUsd && (prev?.usd_krw_frank || raw.usdKrw)) {
      const usdKrwLeg = raw.usdKrw ?? (prev?.usd_krw_frank as string);
      const composed = composeFxSnapshot({
        fxSnapshotId: "tmp",
        fallback: { usdtUsd: raw.usdtUsd, usdKrw: usdKrwLeg },
        capturedAt: observedAt,
      });
      usdtKrw = composed.usdtKrw;
      usdtUsdOut = composed.usdtUsd;
      usdKrwFrank = composed.usdKrwFrank;
      formulaId = composed.formulaId;
    } else if (raw.usdKrw && prev?.usdt_usd) {
      const composed = composeFxSnapshot({
        fxSnapshotId: "tmp",
        fallback: { usdtUsd: prev.usdt_usd, usdKrw: raw.usdKrw },
        capturedAt: observedAt,
      });
      usdtKrw = composed.usdtKrw;
      usdtUsdOut = composed.usdtUsd;
      usdKrwFrank = composed.usdKrwFrank;
      formulaId = composed.formulaId;
    } else if (prev) {
      // No fresh KRW-leg input this tick — carry forward unchanged
      // (pre-existing display-only posture; P0-B scope = marketplace legs).
      usdtKrw = prev.usd_krw;
      usdtUsdOut = prev.usdt_usd;
      usdKrwFrank = prev.usd_krw_frank;
      formulaId = prev.formula_id;
    } else {
      // No prior row at all (should not happen once Day-1 bootstrap has run)
      // and this tick alone cannot satisfy fx_snapshots.usd_krw NOT NULL —
      // fail closed rather than fabricate a KRW display rate.
      return { ok: false, snapshotId: null, created: false, reason: "FX_NO_KRW_LEG_AVAILABLE" };
    }
    // usdtPerUsd should track usdtUsdOut when both are known from the same
    // tick's coingecko reading and the marketplace leg carry-forward missed it.
    if (usdtPerUsd == null && usdtUsdOut != null && isPositiveAmount(usdtUsdOut)) {
      usdtPerUsd = deriveMarketplaceLegs({ usdtUsd: usdtUsdOut }).usdtPerUsd;
    }

    const sources = Array.from(
      new Set([...(prev?.sources ?? []), input.adapterId]),
    );
    const rateProvenance = this.mergeProvenance(prev?.rate_provenance ?? null, input.adapterId, observedAt, raw);

    const unchanged =
      !!prev &&
      prev.usd_krw === usdtKrw &&
      (prev.usdt_usd ?? null) === usdtUsdOut &&
      (prev.usd_krw_frank ?? null) === usdKrwFrank &&
      (prev.gbp_usd ?? null) === gbpUsd &&
      (prev.eur_usd ?? null) === eurUsd &&
      (prev.aud_usd ?? null) === audUsd &&
      (prev.usdt_per_usd ?? null) === usdtPerUsd;
    if (unchanged) {
      return { ok: true, snapshotId: prev!.id, created: false };
    }

    const id = `fx_rt_${Date.parse(observedAt) || Date.now()}_${input.adapterId}`;
    await this.db.query(
      `INSERT INTO public.fx_snapshots (
         id, usd_krw, source, captured_at, formula_id, sources,
         usdt_usd, usd_krw_frank, gbp_usd, eur_usd, aud_usd, usdt_per_usd, rate_provenance
       ) VALUES (
         $1, $2::numeric, $3, $4::timestamptz, $5, $6::text[],
         $7::numeric, $8::numeric, $9::numeric, $10::numeric, $11::numeric, $12::numeric, $13::jsonb
       )
       ON CONFLICT (id) DO NOTHING`,
      [
        id,
        usdtKrw,
        input.adapterId,
        observedAt,
        formulaId,
        sources,
        usdtUsdOut,
        usdKrwFrank,
        gbpUsd,
        eurUsd,
        audUsd,
        usdtPerUsd,
        JSON.stringify(rateProvenance),
      ],
    );
    this.logger.log(`fx_snapshots +1 id=${id} adapter=${input.adapterId}`);
    return { ok: true, snapshotId: id, created: true };
  }

  private async loadLatest(): Promise<LatestRow | null> {
    const { rows } = await this.db.query<LatestRow>(
      `SELECT id, usd_krw::text, usdt_usd::text, usd_krw_frank::text,
              gbp_usd::text, eur_usd::text, aud_usd::text, usdt_per_usd::text,
              formula_id, sources, rate_provenance, captured_at::text
         FROM public.fx_snapshots
        ORDER BY captured_at DESC
        LIMIT 1`,
    );
    return rows[0] ?? null;
  }

  private readAdapterFields(
    adapterId: "coingecko" | "frankfurter",
    fx: Record<string, unknown>,
  ): Partial<{ usdtKrw: string; usdtUsd: string; usdKrw: string; usdGbp: string; usdEur: string; usdAud: string }> {
    const out: Record<string, string> = {};
    const take = (key: string, field: string) => {
      const v = fx[key];
      if (v == null) return;
      const s = String(v);
      if (isPositiveAmount(s)) out[field] = s;
    };
    if (adapterId === "coingecko") {
      take("usdtKrw", "usdtKrw");
      take("usdtUsd", "usdtUsd");
    } else {
      take("usdKrw", "usdKrw");
      take("usdGbp", "usdGbp");
      take("usdEur", "usdEur");
      take("usdAud", "usdAud");
    }
    return out;
  }

  private mergeProvenance(
    prev: RateProvenance | null,
    adapterId: string,
    observedAt: string,
    raw: Partial<Record<string, string>>,
  ): RateProvenance {
    const merged: RateProvenance = { ...(prev ?? {}) };
    const keyForRaw: Record<string, string> = {
      usdtKrw: "usdtKrw",
      usdtUsd: "usdtPerUsd",
      usdGbp: "gbpUsd",
      usdEur: "eurUsd",
      usdAud: "audUsd",
    };
    for (const [rawKey, legKey] of Object.entries(keyForRaw)) {
      if (raw[rawKey] != null) {
        merged[legKey] = { source: adapterId, capturedAt: observedAt };
      }
    }
    return merged;
  }

  private isIsoDate(v: string | null | undefined): v is string {
    return typeof v === "string" && !Number.isNaN(Date.parse(v));
  }
}
