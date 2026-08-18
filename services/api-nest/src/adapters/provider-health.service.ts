/**
 * PTF-00C P0-C/P0-D/§9/§10 — durable provider/marketplace health + circuit
 * breaker. Root cause fixed here: AdaptersAdminService previously tracked
 * health only in an in-process `Map` (`private readonly state = new Map()`)
 * — a Nest restart/redeploy silently erased every failure signal, so a
 * provider that had just tripped OPEN would come back reporting "unknown"/
 * green with zero memory of the outage. This service persists every
 * heartbeat tick to `provider_runtime_health` (survives restart) and derives
 * CLOSED/OPEN/HALF_OPEN + HEALTHY/DEGRADED/STALE/BLOCKED from that durable
 * evidence via the pure functions in provider-health.cjs — this class only
 * loads/stores rows and calls them; it owns zero decision logic itself.
 *
 * "eBay down != Peotteok down": BLOCKED here must only ever gate new
 * auto-publish (adapters.mi/day1Auto), never mutate settled ledger/money.
 *
 * PTF-00C-R1 §2 (heartbeat idempotency) — a single real scheduled worker
 * tick can arrive here more than once: the worker splits listings into
 * batches and (pre-R1) repeated the SAME `marketplaceHealth` evidence on
 * every batch, network retry can redeliver the same ingest POST, and a
 * duplicate/manual ingest call can replay an already-recorded tick. Every
 * `recordTick()` call now claims a durable, uniqueness-checked row in
 * `provider_tick_ledger` keyed on (providerId, marketplaceId,
 * providerTickId) BEFORE it is allowed to touch the cumulative
 * attempted/success/failure counters or the circuit-state transition. A
 * conflict on that claim means this exact tick's evidence for this exact
 * marketplace was already durably recorded — the call becomes a pure no-op
 * (current snapshot returned unchanged, no double counting, no spurious
 * extra circuit transition). Callers that omit `providerTickId` (older/
 * manual callers) get a fresh random id per call, i.e. unchanged pre-R1
 * behavior (always applied, no dedup possible without a caller-supplied id).
 *
 * PTF-00C-R1 §5 (circuit breaker honesty) — CLOSED/OPEN/HALF_OPEN here is
 * durable OUTAGE/HEALTH EVIDENCE ONLY. The ebay-adapter worker does NOT
 * consult this state before calling eBay — it never has, and this closure
 * does not wire that up (Option B of PTF-00C-R1 §5). OPEN must never be
 * read as "the worker will skip its scheduled upstream calls while this is
 * OPEN" — see `upstreamGating` below, which is always `"NONE"` in this
 * wave. Upstream call volume during an outage is bounded by a completely
 * separate mechanism: retry-policy.cjs's bounded attempts + the worker's
 * own tick deadline/budget (constants.ts TICK_BUDGET_MS) — not by this
 * breaker. If the product later wants OPEN to actually gate upstream calls,
 * that is a new, explicit change (PTF-R1+), not an implicit side effect of
 * this state machine's existence.
 */
import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import {
  deriveDisplayCircuitState,
  deriveHealthStatus,
  healthStatusToLegacyTint,
  nextCircuitState,
  worstTint,
  type LegacyHealthTint,
  type ProviderCircuitRecord,
} from "./adapters.mi";

/** '' sentinel marketplace_id = provider-level aggregate row (see migration). */
const PROVIDER_LEVEL_MARKETPLACE = "";

type ProviderHealthRow = {
  provider_id: string;
  marketplace_id: string;
  circuit_state: "CLOSED" | "OPEN";
  consecutive_failures: number;
  opened_at: Date | null;
  attempted_count: number;
  success_count: number;
  failure_count: number;
  last_success_at: Date | null;
  last_failure_at: Date | null;
  last_error_class: string | null;
  last_tick_at: Date;
  last_tick_had_partial_failure: boolean;
};

export type ProviderHealthSnapshot = {
  providerId: string;
  marketplaceId: string | null;
  circuitState: "CLOSED" | "OPEN";
  displayCircuitState: "CLOSED" | "OPEN" | "HALF_OPEN";
  healthStatus: "HEALTHY" | "DEGRADED" | "STALE" | "BLOCKED";
  legacyTint: LegacyHealthTint;
  consecutiveFailures: number;
  attemptedCount: number;
  successCount: number;
  failureCount: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastErrorClass: string | null;
  lastTickAt: string | null;
  /**
   * PTF-00C-R1 §5 — always `"NONE"` in this wave: `circuitState`/
   * `displayCircuitState` are durable evidence only and never gate/skip the
   * worker's scheduled upstream eBay calls. See class docstring.
   */
  upstreamGating: "NONE";
};

export type RecordTickInput = {
  providerId: string;
  /** Omit/undefined for a provider-level aggregate tick. */
  marketplaceId?: string | null;
  attempted: number;
  successCount: number;
  failureCount: number;
  errorClass?: string | null;
  observedAt: string;
  /**
   * PTF-00C-R1 §2 — durable idempotency key for the ONE real scheduled tick
   * this evidence came from. Every listing batch/retry/duplicate delivery
   * of the SAME tick must carry the SAME id so this call becomes a no-op
   * after the first. Omitted (older/manual callers) = always applied, same
   * as pre-R1 behavior — no dedup is attempted without a caller-supplied id.
   */
  providerTickId?: string | null;
};

@Injectable()
export class ProviderHealthService {
  constructor(private readonly db: PostgresService) {}

  /**
   * Persist one heartbeat tick (P0-D — must be called even when
   * successCount=0/attempted=0, so a full outage stays durably observable
   * instead of silently sending nothing).
   */
  async recordTick(input: RecordTickInput): Promise<ProviderHealthSnapshot> {
    const marketplaceId = input.marketplaceId ?? PROVIDER_LEVEL_MARKETPLACE;
    const observedAt = this.safeIso(input.observedAt);
    const nowMs = Date.parse(observedAt);

    if (!this.db.configured()) {
      return this.unknownSnapshot(input.providerId, input.marketplaceId ?? null);
    }

    // PTF-00C-R1 §2 — claim this exact (provider, marketplace, tick) triple
    // BEFORE touching any cumulative counter or circuit transition. A
    // caller with no providerTickId gets a fresh random one (always claims
    // successfully = always applied, matching pre-R1 behavior exactly).
    const providerTickId = this.normalizeTickId(input.providerTickId);
    const claimed = await this.claimTick(input.providerId, marketplaceId, providerTickId);
    if (!claimed) {
      // Duplicate delivery of already-recorded evidence for this tick — a
      // pure no-op. Never re-add to attempted/success/failure, never run
      // the circuit transition again (§2 "no false circuit trip from
      // duplicate delivery"). Return the CURRENT durable state unchanged.
      const existing = await this.loadRow(input.providerId, marketplaceId);
      return existing
        ? this.toSnapshot(input.providerId, input.marketplaceId ?? null, existing, Date.now())
        : this.unknownSnapshot(input.providerId, input.marketplaceId ?? null);
    }

    const prev = await this.loadRow(input.providerId, marketplaceId);
    // Vacuously "successful" when nothing was attempted (e.g. no configured
    // queries) — never trip the breaker on a config no-op.
    const tickSuccess = input.attempted === 0 || input.successCount > 0;

    const prevCircuit: ProviderCircuitRecord | null = prev
      ? {
          state: prev.circuit_state,
          consecutiveFailures: prev.consecutive_failures,
          openedAtMs: prev.opened_at ? prev.opened_at.getTime() : null,
        }
      : null;
    const next = nextCircuitState({ prev: prevCircuit, tickSuccess, nowMs });

    const attemptedTotal = (prev?.attempted_count ?? 0) + Math.max(0, input.attempted);
    const successTotal = (prev?.success_count ?? 0) + Math.max(0, input.successCount);
    const failureTotal = (prev?.failure_count ?? 0) + Math.max(0, input.failureCount);
    const lastSuccessAt =
      input.successCount > 0 ? observedAt : prev?.last_success_at?.toISOString() ?? null;
    const lastFailureAt =
      input.failureCount > 0 ? observedAt : prev?.last_failure_at?.toISOString() ?? null;
    const openedAtIso = next.openedAtMs != null ? new Date(next.openedAtMs).toISOString() : null;
    const partialFailure = input.successCount > 0 && input.failureCount > 0;

    await this.db.query(
      `INSERT INTO public.provider_runtime_health (
         provider_id, marketplace_id, circuit_state, consecutive_failures, opened_at,
         attempted_count, success_count, failure_count, last_success_at, last_failure_at,
         last_error_class, last_tick_at, last_tick_had_partial_failure, updated_at
       ) VALUES ($1,$2,$3,$4,$5::timestamptz,$6,$7,$8,$9::timestamptz,$10::timestamptz,$11,$12::timestamptz,$13,now())
       ON CONFLICT (provider_id, marketplace_id) DO UPDATE SET
         circuit_state = EXCLUDED.circuit_state,
         consecutive_failures = EXCLUDED.consecutive_failures,
         opened_at = EXCLUDED.opened_at,
         attempted_count = EXCLUDED.attempted_count,
         success_count = EXCLUDED.success_count,
         failure_count = EXCLUDED.failure_count,
         last_success_at = EXCLUDED.last_success_at,
         last_failure_at = EXCLUDED.last_failure_at,
         last_error_class = EXCLUDED.last_error_class,
         last_tick_at = EXCLUDED.last_tick_at,
         last_tick_had_partial_failure = EXCLUDED.last_tick_had_partial_failure,
         updated_at = now()`,
      [
        input.providerId,
        marketplaceId,
        next.state,
        next.consecutiveFailures,
        openedAtIso,
        attemptedTotal,
        successTotal,
        failureTotal,
        lastSuccessAt,
        lastFailureAt,
        input.errorClass ?? null,
        observedAt,
        partialFailure,
      ],
    );

    return this.toSnapshot(
      input.providerId,
      input.marketplaceId ?? null,
      {
        provider_id: input.providerId,
        marketplace_id: marketplaceId,
        circuit_state: next.state,
        consecutive_failures: next.consecutiveFailures,
        opened_at: next.openedAtMs != null ? new Date(next.openedAtMs) : null,
        attempted_count: attemptedTotal,
        success_count: successTotal,
        failure_count: failureTotal,
        last_success_at: lastSuccessAt ? new Date(lastSuccessAt) : null,
        last_failure_at: lastFailureAt ? new Date(lastFailureAt) : null,
        last_error_class: input.errorClass ?? null,
        last_tick_at: new Date(observedAt),
        last_tick_had_partial_failure: partialFailure,
      },
      nowMs,
    );
  }

  async getHealth(
    providerId: string,
    marketplaceId?: string | null,
  ): Promise<ProviderHealthSnapshot | null> {
    if (!this.db.configured()) return null;
    const row = await this.loadRow(providerId, marketplaceId ?? PROVIDER_LEVEL_MARKETPLACE);
    if (!row) return null;
    return this.toSnapshot(providerId, marketplaceId ?? null, row, Date.now());
  }

  /** Per-marketplace rows only (excludes the '' provider-level aggregate). */
  async listMarketplaceHealth(providerId: string): Promise<ProviderHealthSnapshot[]> {
    if (!this.db.configured()) return [];
    const { rows } = await this.db.query<ProviderHealthRow>(
      `SELECT provider_id, marketplace_id, circuit_state, consecutive_failures, opened_at,
              attempted_count, success_count, failure_count, last_success_at, last_failure_at,
              last_error_class, last_tick_at, last_tick_had_partial_failure
         FROM public.provider_runtime_health
        WHERE provider_id = $1 AND marketplace_id <> ''
        ORDER BY marketplace_id`,
      [providerId],
    );
    const nowMs = Date.now();
    return rows.map((r) => this.toSnapshot(providerId, r.marketplace_id, r, nowMs));
  }

  /**
   * Worst-wins tint across the provider-level row + every marketplace row —
   * §8: a partial failure must never render as fully green/healthy.
   */
  async getProviderAggregateTint(providerId: string): Promise<LegacyHealthTint> {
    if (!this.db.configured()) return "unknown";
    const provider = await this.getHealth(providerId, null);
    const marketplaces = await this.listMarketplaceHealth(providerId);
    const tints = [provider, ...marketplaces]
      .filter((s): s is ProviderHealthSnapshot => s != null)
      .map((s) => s.legacyTint);
    return worstTint(tints.length ? tints : ["unknown"]);
  }

  /** Missing/blank id = no dedup requested → always-unique → always applied. */
  private normalizeTickId(raw: string | null | undefined): string {
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    return trimmed.length > 0 ? trimmed : randomUUID();
  }

  /**
   * PTF-00C-R1 §2 — durable, race-safe claim via INSERT .. ON CONFLICT DO
   * NOTHING. Returns true exactly once per (providerId, marketplaceId,
   * providerTickId) triple, ever — every later call with the same triple
   * (any batch/retry/duplicate/arrival order) returns false.
   */
  private async claimTick(
    providerId: string,
    marketplaceId: string,
    providerTickId: string,
  ): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `INSERT INTO public.provider_tick_ledger (provider_id, marketplace_id, provider_tick_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (provider_id, marketplace_id, provider_tick_id) DO NOTHING
       RETURNING 1`,
      [providerId, marketplaceId, providerTickId],
    );
    return (rowCount ?? 0) > 0;
  }

  private async loadRow(
    providerId: string,
    marketplaceId: string,
  ): Promise<ProviderHealthRow | null> {
    const { rows } = await this.db.query<ProviderHealthRow>(
      `SELECT provider_id, marketplace_id, circuit_state, consecutive_failures, opened_at,
              attempted_count, success_count, failure_count, last_success_at, last_failure_at,
              last_error_class, last_tick_at, last_tick_had_partial_failure
         FROM public.provider_runtime_health
        WHERE provider_id = $1 AND marketplace_id = $2`,
      [providerId, marketplaceId],
    );
    return rows[0] ?? null;
  }

  private toSnapshot(
    providerId: string,
    marketplaceId: string | null,
    row: ProviderHealthRow,
    nowMs: number,
  ): ProviderHealthSnapshot {
    const displayCircuitState = deriveDisplayCircuitState({
      state: row.circuit_state,
      openedAtMs: row.opened_at ? row.opened_at.getTime() : null,
      nowMs,
    });
    const healthStatus = deriveHealthStatus({
      displayCircuitState,
      lastSuccessAtMs: row.last_success_at ? row.last_success_at.getTime() : null,
      nowMs,
      lastTickFailureCount: row.last_tick_had_partial_failure ? 1 : 0,
    });
    return {
      providerId,
      marketplaceId,
      circuitState: row.circuit_state,
      displayCircuitState,
      healthStatus,
      legacyTint: healthStatusToLegacyTint(healthStatus),
      consecutiveFailures: row.consecutive_failures,
      attemptedCount: row.attempted_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      lastSuccessAt: row.last_success_at ? row.last_success_at.toISOString() : null,
      lastFailureAt: row.last_failure_at ? row.last_failure_at.toISOString() : null,
      lastErrorClass: row.last_error_class,
      lastTickAt: row.last_tick_at ? row.last_tick_at.toISOString() : null,
      upstreamGating: "NONE",
    };
  }

  private unknownSnapshot(
    providerId: string,
    marketplaceId: string | null,
  ): ProviderHealthSnapshot {
    return {
      providerId,
      marketplaceId,
      circuitState: "CLOSED",
      displayCircuitState: "CLOSED",
      healthStatus: "STALE",
      legacyTint: "unknown",
      consecutiveFailures: 0,
      attemptedCount: 0,
      successCount: 0,
      failureCount: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastErrorClass: null,
      lastTickAt: null,
      upstreamGating: "NONE",
    };
  }

  private safeIso(v: string | null | undefined): string {
    if (typeof v === "string" && !Number.isNaN(Date.parse(v))) return v;
    return new Date().toISOString();
  }
}
