/**
 * PTF-00C P0-B — real-time FX ingest repair.
 *
 * Adapter FX observations are persisted as IMMUTABLE fx_snapshots rows.
 * No existing rate row is UPDATEd: opportunity fx_snapshot_id bindings and
 * same-snapshot calculations depend on immutability.
 *
 * P0-C: every carried FX leg expires from its own provider provenance time,
 * never from the enclosing row captured_at. A fresh CoinGecko row therefore
 * cannot make an old Frankfurter fiat leg look current.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { isPositiveAmount } from "../ledger/ledger.money";
import {
  classifyFxFreshness,
  composeFxSnapshot,
  deriveMarketplaceLegs,
  detectUsdtKrwAnomaly,
  krwDisplayAvailable,
} from "./opportunities.mi";

/** CoinGecko is collected every 10m; allow one 5m collection grace. */
const COINGECKO_CARRY_FORWARD_MS = 15 * 60 * 1000;
/** Frankfurter is re-confirmed hourly; a bounded outage may reuse the last confirmed official quote. */
const FRANKFURTER_CARRY_FORWARD_MS = 6 * 60 * 60 * 1000;

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
   * Latest snapshot usable for native→USDT normalization. Each returned leg
   * has already passed its own bounded provenance carry-forward at ingest.
   * Missing/expired legs stay null and callers fail closed.
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
   * REL-508 / P0-C — latest row for USDT→KRW display only.
   * Missing/invalid/too-stale → null. Never invent usdtKrw. Never ₩0 fabricate.
   */
  async getLatestKrwDisplaySnapshot(): Promise<{
    id: string;
    capturedAt: string;
    usdtKrw: string;
    status: "FRESH" | "STALE";
    ageMs: number | null;
  } | null> {
    if (!this.db.configured()) return null;
    const row = await this.loadLatest();
    if (!row || !row.usd_krw || !isPositiveAmount(row.usd_krw)) return null;
    const observedAt = row.rate_provenance?.usdtKrw?.capturedAt;
    if (!observedAt) return null;
    const classified = classifyFxFreshness(observedAt, Date.now());
    if (!krwDisplayAvailable(classified.status)) return null;
    if (classified.status !== "FRESH" && classified.status !== "STALE") {
      return null;
    }
    return {
      id: row.id,
      capturedAt: observedAt,
      usdtKrw: row.usd_krw,
      status: classified.status,
      ageMs: classified.ageMs,
    };
  }

  /**
   * P0-C FX ingest. Numeric equality does NOT erase a new provider observation:
   * if an authoritative observation timestamp advances, a new immutable row
   * records that freshness even when the numeric quote is unchanged.
   */
  async recordFxIngest(input: {
    adapterId: "coingecko" | "frankfurter";
    fx: Record<string, unknown> | null | undefined;
    observedAt: string;
  }): Promise<FxIngestResult> {
    if (!this.db.configured()) {
      return {
        ok: false,
        snapshotId: null,
        created: false,
        reason: "DATABASE_URL_UNSET",
      };
    }

    const fx = input.fx && typeof input.fx === "object" ? input.fx : {};
    const observedAt = this.isIsoDate(input.observedAt)
      ? input.observedAt
      : new Date().toISOString();
    const nowMs = Date.parse(observedAt);
    const raw = this.readAdapterFields(input.adapterId, fx);
    if (Object.keys(raw).length === 0) {
      return {
        ok: false,
        snapshotId: null,
        created: false,
        reason: "FX_EMPTY_PAYLOAD",
      };
    }

    const prev = await this.loadLatest();
    const prevUsdtUsdFresh = this.carryLeg(
      prev,
      "usdtPerUsd",
      prev?.usdt_usd ?? null,
      nowMs,
      COINGECKO_CARRY_FORWARD_MS,
      "coingecko",
    );
    const prevUsdtPerUsdFresh = this.carryLeg(
      prev,
      "usdtPerUsd",
      prev?.usdt_per_usd ?? null,
      nowMs,
      COINGECKO_CARRY_FORWARD_MS,
      "coingecko",
    );
    const prevUsdKrwFrankFresh = this.carryLeg(
      prev,
      "usdKrwFrank",
      prev?.usd_krw_frank ?? null,
      nowMs,
      FRANKFURTER_CARRY_FORWARD_MS,
      "frankfurter",
    );
    const prevGbpUsdFresh = this.carryLeg(
      prev,
      "gbpUsd",
      prev?.gbp_usd ?? null,
      nowMs,
      FRANKFURTER_CARRY_FORWARD_MS,
      "frankfurter",
    );
    const prevEurUsdFresh = this.carryLeg(
      prev,
      "eurUsd",
      prev?.eur_usd ?? null,
      nowMs,
      FRANKFURTER_CARRY_FORWARD_MS,
      "frankfurter",
    );
    const prevAudUsdFresh = this.carryLeg(
      prev,
      "audUsd",
      prev?.aud_usd ?? null,
      nowMs,
      FRANKFURTER_CARRY_FORWARD_MS,
      "frankfurter",
    );

    // Cross-provider validation is fail-closed only when the reference was
    // confirmed inside its own bounded provenance window. A stale fiat row
    // must never veto a fresh CoinGecko market quote.
    const anomalyReference = raw.usdKrw ?? prevUsdKrwFrankFresh;
    if (raw.usdtKrw && raw.usdtUsd && anomalyReference) {
      const anomaly = detectUsdtKrwAnomaly(
        raw.usdtKrw,
        raw.usdtUsd,
        anomalyReference,
      );
      if (anomaly.anomalous) {
        this.logger.error(
          `fx anomaly rejected adapter=${input.adapterId} primary=${raw.usdtKrw} reference=${anomaly.reference} ratio=${anomaly.ratio}`,
        );
        return {
          ok: false,
          snapshotId: null,
          created: false,
          reason: "FX_ANOMALY_REJECTED",
        };
      }
    }

    const freshLegs = deriveMarketplaceLegs({
      usdtUsd: raw.usdtUsd,
      usdGbp: raw.usdGbp,
      usdEur: raw.usdEur,
      usdAud: raw.usdAud,
    });
    const gbpUsd = freshLegs.gbpUsd ?? prevGbpUsdFresh;
    const eurUsd = freshLegs.eurUsd ?? prevEurUsdFresh;
    const audUsd = freshLegs.audUsd ?? prevAudUsdFresh;
    let usdtPerUsd = freshLegs.usdtPerUsd ?? prevUsdtPerUsdFresh;

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
      usdtUsdOut = raw.usdtUsd ?? prevUsdtUsdFresh;
      usdKrwFrank = raw.usdKrw ?? prevUsdKrwFrankFresh;
      formulaId = composed.formulaId;
    } else if (raw.usdtUsd && (raw.usdKrw || prevUsdKrwFrankFresh)) {
      const usdKrwLeg = raw.usdKrw ?? (prevUsdKrwFrankFresh as string);
      const composed = composeFxSnapshot({
        fxSnapshotId: "tmp",
        fallback: { usdtUsd: raw.usdtUsd, usdKrw: usdKrwLeg },
        capturedAt: observedAt,
      });
      usdtKrw = composed.usdtKrw;
      usdtUsdOut = composed.usdtUsd;
      usdKrwFrank = composed.usdKrwFrank;
      formulaId = composed.formulaId;
    } else if (raw.usdKrw && prevUsdtUsdFresh) {
      const composed = composeFxSnapshot({
        fxSnapshotId: "tmp",
        fallback: { usdtUsd: prevUsdtUsdFresh, usdKrw: raw.usdKrw },
        capturedAt: observedAt,
      });
      usdtKrw = composed.usdtKrw;
      usdtUsdOut = composed.usdtUsd;
      usdKrwFrank = composed.usdKrwFrank;
      formulaId = composed.formulaId;
    } else if (prev) {
      // Frankfurter may still publish fresh fiat legs while the primary KRW
      // keeps its ORIGINAL provenance. Display freshness may therefore expire.
      usdtKrw = prev.usd_krw;
      usdtUsdOut = prevUsdtUsdFresh;
      usdKrwFrank = raw.usdKrw ?? prevUsdKrwFrankFresh;
      formulaId = prev.formula_id;
    } else {
      return {
        ok: false,
        snapshotId: null,
        created: false,
        reason: "FX_NO_KRW_LEG_AVAILABLE",
      };
    }

    if (usdtPerUsd == null && usdtUsdOut && isPositiveAmount(usdtUsdOut)) {
      usdtPerUsd = deriveMarketplaceLegs({ usdtUsd: usdtUsdOut }).usdtPerUsd;
    }

    const sources = Array.from(
      new Set([...(prev?.sources ?? []), input.adapterId]),
    );
    const rateProvenance = this.mergeProvenance(
      prev?.rate_provenance ?? null,
      input.adapterId,
      observedAt,
      raw,
    );

    const observationUnchanged = this.rawObservationUnchanged(
      prev?.rate_provenance ?? null,
      input.adapterId,
      observedAt,
      raw,
    );
    const unchanged =
      !!prev &&
      observationUnchanged &&
      prev.usd_krw === usdtKrw &&
      (prev.usdt_usd ?? null) === usdtUsdOut &&
      (prev.usd_krw_frank ?? null) === usdKrwFrank &&
      (prev.gbp_usd ?? null) === gbpUsd &&
      (prev.eur_usd ?? null) === eurUsd &&
      (prev.aud_usd ?? null) === audUsd &&
      (prev.usdt_per_usd ?? null) === usdtPerUsd;

    if (unchanged) {
      return { ok: true, snapshotId: prev.id, created: false };
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
  ): Partial<{
    usdtKrw: string;
    usdtUsd: string;
    usdKrw: string;
    usdGbp: string;
    usdEur: string;
    usdAud: string;
  }> {
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
    for (const [rawKey, legKey] of Object.entries(this.provenanceKeyMap())) {
      if (raw[rawKey] != null) {
        merged[legKey] = { source: adapterId, capturedAt: observedAt };
      }
    }
    return merged;
  }

  private rawObservationUnchanged(
    prev: RateProvenance | null,
    adapterId: string,
    observedAt: string,
    raw: Partial<Record<string, string>>,
  ): boolean {
    for (const [rawKey, legKey] of Object.entries(this.provenanceKeyMap())) {
      if (raw[rawKey] == null) continue;
      const p = prev?.[legKey];
      if (!p || p.source !== adapterId || p.capturedAt !== observedAt) {
        return false;
      }
    }
    return true;
  }

  private provenanceKeyMap(): Record<string, string> {
    return {
      usdtKrw: "usdtKrw",
      usdtUsd: "usdtPerUsd",
      usdKrw: "usdKrwFrank",
      usdGbp: "gbpUsd",
      usdEur: "eurUsd",
      usdAud: "audUsd",
    };
  }

  private carryLeg(
    row: LatestRow | null,
    provenanceKey: string,
    value: string | null,
    nowMs: number,
    maxAgeMs: number,
    expectedSource: "coingecko" | "frankfurter",
  ): string | null {
    if (!row || !value || !isPositiveAmount(value)) return null;
    const p = row.rate_provenance?.[provenanceKey];
    if (!p || p.source !== expectedSource) return null;
    const capturedMs = Date.parse(p.capturedAt);
    if (!Number.isFinite(capturedMs)) return null;
    const ageMs = nowMs - capturedMs;
    if (ageMs < 0 || ageMs > maxAgeMs) return null;
    return value;
  }

  private isIsoDate(v: string | null | undefined): v is string {
    return typeof v === "string" && !Number.isNaN(Date.parse(v));
  }
}
