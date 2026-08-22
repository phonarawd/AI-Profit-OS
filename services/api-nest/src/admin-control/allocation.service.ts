/**
 * REL-223 — ALLOW/BLOCK/PAUSE/CANCEL/REASSIGN + bulk.
 * Reuses public.opportunities / trade_executions owners.
 * No ledger verbs. Preview required before LIVE apply.
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { AdminAuditService } from "./admin-audit.service";
import { OpsModeService } from "./ops-mode.service";

export const ALLOCATION_VERBS = [
  "ALLOW",
  "BLOCK",
  "PAUSE",
  "CANCEL",
  "REASSIGN",
] as const;

export type AllocationVerb = (typeof ALLOCATION_VERBS)[number];

const FORBIDDEN_VERBS = [
  "BALANCE_UPDATE",
  "LEDGER_EDIT",
  "SETTLE",
  "CREDIT",
  "DEBIT",
] as const;

const MAX_BATCH = 50;

type ItemOutcome = {
  id: string;
  ok: boolean;
  code: string;
};

@Injectable()
export class AllocationService {
  constructor(
    private readonly db: PostgresService,
    private readonly audit: AdminAuditService,
    private readonly ops: OpsModeService,
  ) {}

  preview(input: { verb: unknown; targetIds: unknown }): {
    verb: AllocationVerb;
    targetCount: number;
    bounded: true;
    ledgerWrite: false;
  } {
    const verb = this.requireVerb(input.verb);
    const ids = this.requireIds(input.targetIds);
    return {
      verb,
      targetCount: ids.length,
      bounded: true,
      ledgerWrite: false,
    };
  }

  async apply(input: {
    verb: unknown;
    targetIds: unknown;
    reason: string;
    confirm: unknown;
    previewed: unknown;
    adminId: string;
    idempotencyKey?: unknown;
  }): Promise<{
    verb: AllocationVerb;
    total: number;
    succeeded: number;
    failed: number;
    allSucceeded: boolean;
    items: ItemOutcome[];
    ledgerWrite: false;
  }> {
    if (!input.adminId) throw new BadRequestException("adminId required");
    if (!input.reason || input.reason.trim().length < 10) {
      throw new BadRequestException("reason must be ≥10 characters");
    }
    if (input.previewed !== true || input.confirm !== true) {
      throw new BadRequestException("PREVIEW_CONFIRM_REQUIRED");
    }
    if (FORBIDDEN_VERBS.includes(String(input.verb) as (typeof FORBIDDEN_VERBS)[number])) {
      throw new BadRequestException("VERB_FORBIDDEN");
    }
    const verb = this.requireVerb(input.verb);
    const ids = this.requireIds(input.targetIds);
    const mode = this.ops.getMode().mode;
    if (mode === "LIVE" && input.confirm !== true) {
      throw new BadRequestException("LIVE_CONFIRM_REQUIRED");
    }

    const items: ItemOutcome[] = [];
    if (mode === "DRY_RUN" || mode === "SIMULATION") {
      for (const id of ids) {
        items.push({ id, ok: true, code: "PREVIEW_ONLY" });
      }
      await this.audit.record({
        action: "allocation.preview_apply",
        outcome: "preview",
        actorAdminId: input.adminId,
        capability: "allocation",
        reason: input.reason.trim(),
        after: { verb, count: ids.length, mode },
        mode,
      });
      return this.summarize(verb, items);
    }

    for (const id of ids) {
      items.push(await this.applyOne(verb, id));
    }
    await this.audit.record({
      action: "allocation.apply",
      outcome: items.every((i) => i.ok) ? "applied" : "error",
      actorAdminId: input.adminId,
      capability: "allocation",
      reason: input.reason.trim(),
      after: {
        verb,
        succeeded: items.filter((i) => i.ok).length,
        failed: items.filter((i) => !i.ok).length,
      },
      mode,
    });
    return this.summarize(verb, items);
  }

  private summarize(verb: AllocationVerb, items: ItemOutcome[]) {
    const succeeded = items.filter((i) => i.ok).length;
    const failed = items.length - succeeded;
    return {
      verb,
      total: items.length,
      succeeded,
      failed,
      allSucceeded: failed === 0,
      items,
      ledgerWrite: false as const,
    };
  }

  private requireVerb(verb: unknown): AllocationVerb {
    if (!ALLOCATION_VERBS.includes(verb as AllocationVerb)) {
      throw new BadRequestException("VERB_NOT_ALLOWED");
    }
    return verb as AllocationVerb;
  }

  private requireIds(raw: unknown): string[] {
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new BadRequestException("targetIds required");
    }
    const ids = raw.filter((x) => typeof x === "string" && x.trim());
    if (ids.length === 0) throw new BadRequestException("targetIds required");
    if (ids.length > MAX_BATCH) {
      throw new BadRequestException("BATCH_LIMIT");
    }
    return ids as string[];
  }

  private async applyOne(verb: AllocationVerb, id: string): Promise<ItemOutcome> {
    if (!this.db.configured()) {
      return { id, ok: false, code: "UNAVAILABLE" };
    }
    try {
      if (verb === "REASSIGN") {
        return { id, ok: false, code: "REASSIGN_UNAVAILABLE" };
      }
      if (verb === "CANCEL") {
        const r = await this.db.query(
          `UPDATE public.trade_executions
              SET status = 'cancelled', result_code = 'CANCELLED_BY_USER', updated_at = now()
            WHERE id = $1::uuid
              AND status NOT IN ('success', 'safe_stop', 'cancelled', 'failed')
            RETURNING id`,
          [id],
        );
        return {
          id,
          ok: (r.rowCount ?? 0) > 0,
          code: (r.rowCount ?? 0) > 0 ? "CANCELLED" : "NOT_FOUND",
        };
      }
      const status =
        verb === "ALLOW" ? "available" : verb === "PAUSE" || verb === "BLOCK" ? "paused" : null;
      if (!status) return { id, ok: false, code: "UNAVAILABLE" };
      const r = await this.db.query(
        `UPDATE public.opportunities
            SET status = $2, updated_at = now()
          WHERE id = $1::uuid
          RETURNING id`,
        [id, status],
      );
      return {
        id,
        ok: (r.rowCount ?? 0) > 0,
        code: (r.rowCount ?? 0) > 0 ? verb : "NOT_FOUND",
      };
    } catch {
      return { id, ok: false, code: "UNAVAILABLE" };
    }
  }
}
