/**
 * Admin §9.8.9 — user opportunity override CRUD
 * Engine Owns=DDL/merge · UI/RBAC Owns=Admin (capability matrix locked)
 * FORBIDDEN: ledger UPDATE · RNG · compareReady false→true
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { InProcessEventBus } from "../events/in-process.bus";
import { OPPORTUNITY_EVENTS } from "./opportunities.events";
import type { CapitalBand } from "./opportunities.types";
import {
  assertCapitalBandForce,
  assertDecimalString,
  assertHiddenForceShowExclusive,
  assertPinOrder,
  assertReason,
  DAY1_MAX_PINS_PER_USER,
  mergeUserOpportunityOverride,
  OVERRIDE_AUDIT,
  type UserOpportunityOverrideV1,
} from "./user-opportunity-override.merge";

type OverrideRow = {
  user_id: string;
  opportunity_id: string;
  hidden: boolean;
  force_show: boolean;
  pin_order: number | null;
  margin_pct_override: string | null;
  expected_profit_usdt_override: string | null;
  capital_band_force: string | null;
  reason: string;
  updated_by_admin_id: string;
  updated_at: Date;
};

export type UpsertUserOpportunityOverrideRequest = {
  hidden?: boolean;
  forceShow?: boolean;
  pinOrder?: number | null;
  marginPctOverride?: string | null;
  expectedProfitUsdtOverride?: string | null;
  capitalBandForce?: CapitalBand | null;
  reason: string;
  updatedByAdminId: string;
};

@Injectable()
export class UserOpportunityOverrideAdminService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {}

  async list(userId: string): Promise<{
    items: UserOpportunityOverrideV1[];
    day1MaxPins: number;
    ledgerMutated: false;
  }> {
    this.assertUuid(userId, "userId");
    const { rows } = await this.db.query<OverrideRow>(
      `SELECT user_id::text, opportunity_id::text, hidden, force_show,
              pin_order, margin_pct_override::text,
              expected_profit_usdt_override::text, capital_band_force,
              reason, updated_by_admin_id::text, updated_at
         FROM public.user_opportunity_overrides
        WHERE user_id = $1::uuid
        ORDER BY pin_order NULLS LAST, updated_at DESC`,
      [userId],
    );
    return {
      items: rows.map((r) => this.toSchema(r)),
      day1MaxPins: DAY1_MAX_PINS_PER_USER,
      ledgerMutated: false,
    };
  }

  async upsert(
    userId: string,
    opportunityId: string,
    body: UpsertUserOpportunityOverrideRequest,
  ): Promise<{
    item: UserOpportunityOverrideV1;
    auditAction: string;
    ledgerMutated: false;
  }> {
    this.assertUuid(userId, "userId");
    this.assertUuid(opportunityId, "opportunityId");
    this.assertUuid(body.updatedByAdminId, "updatedByAdminId");
    assertReason(body.reason);

    const hidden = body.hidden === true;
    const forceShow = body.forceShow === true;
    try {
      assertHiddenForceShowExclusive(hidden, forceShow);
      assertPinOrder(body.pinOrder);
      assertDecimalString(body.marginPctOverride, "MARGIN_PCT_INVALID");
      assertDecimalString(
        body.expectedProfitUsdtOverride,
        "EXPECTED_PROFIT_OVERRIDE_INVALID",
      );
      assertCapitalBandForce(body.capitalBandForce ?? null);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : "OVERRIDE_INVALID",
      );
    }

    const opp = await this.db.query<{ id: string }>(
      `SELECT id::text FROM public.opportunities WHERE id = $1::uuid`,
      [opportunityId],
    );
    if (!opp.rows[0]) throw new NotFoundException("opportunity not found");

    const before = await this.loadOne(userId, opportunityId);

    if (body.pinOrder != null) {
      const pins = await this.db.query<{ c: string }>(
        `SELECT count(*)::text AS c
           FROM public.user_opportunity_overrides
          WHERE user_id = $1::uuid
            AND pin_order IS NOT NULL
            AND opportunity_id IS DISTINCT FROM $2::uuid`,
        [userId, opportunityId],
      );
      if (Number(pins.rows[0]?.c ?? 0) >= DAY1_MAX_PINS_PER_USER) {
        throw new BadRequestException("DAY1_MAX_PINS");
      }
    }

    const { rows } = await this.db.query<OverrideRow>(
      `INSERT INTO public.user_opportunity_overrides (
         user_id, opportunity_id, hidden, force_show, pin_order,
         margin_pct_override, expected_profit_usdt_override,
         capital_band_force, reason, updated_by_admin_id, updated_at
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4, $5,
         $6::numeric, $7::numeric, $8, $9, $10::uuid, now()
       )
       ON CONFLICT (user_id, opportunity_id) DO UPDATE SET
         hidden = EXCLUDED.hidden,
         force_show = EXCLUDED.force_show,
         pin_order = EXCLUDED.pin_order,
         margin_pct_override = EXCLUDED.margin_pct_override,
         expected_profit_usdt_override = EXCLUDED.expected_profit_usdt_override,
         capital_band_force = EXCLUDED.capital_band_force,
         reason = EXCLUDED.reason,
         updated_by_admin_id = EXCLUDED.updated_by_admin_id,
         updated_at = now()
       RETURNING user_id::text, opportunity_id::text, hidden, force_show,
                 pin_order, margin_pct_override::text,
                 expected_profit_usdt_override::text, capital_band_force,
                 reason, updated_by_admin_id::text, updated_at`,
      [
        userId,
        opportunityId,
        hidden,
        forceShow,
        body.pinOrder ?? null,
        body.marginPctOverride ?? null,
        body.expectedProfitUsdtOverride ?? null,
        body.capitalBandForce ?? null,
        body.reason.trim(),
        body.updatedByAdminId,
      ],
    );

    const item = this.toSchema(rows[0]);
    await this.insertAudit({
      userId,
      opportunityId,
      action: OVERRIDE_AUDIT.upsert,
      before,
      after: item,
      reason: body.reason.trim(),
      adminId: body.updatedByAdminId,
    });

    this.bus.emit(OPPORTUNITY_EVENTS.userOverrideUpserted, {
      userId,
      opportunityId,
      auditAction: OVERRIDE_AUDIT.upsert,
      ledgerMutated: false as const,
      mergePreview: mergeUserOpportunityOverride(
        { expectedProfitUsdt: "0", compareReady: true },
        item,
      ),
    });

    return {
      item,
      auditAction: OVERRIDE_AUDIT.upsert,
      ledgerMutated: false,
    };
  }

  async remove(
    userId: string,
    opportunityId: string,
    body: { reason: string; updatedByAdminId: string },
  ): Promise<{
    deleted: true;
    auditAction: string;
    ledgerMutated: false;
  }> {
    this.assertUuid(userId, "userId");
    this.assertUuid(opportunityId, "opportunityId");
    this.assertUuid(body.updatedByAdminId, "updatedByAdminId");
    assertReason(body.reason);

    const before = await this.loadOne(userId, opportunityId);
    if (!before) throw new NotFoundException("override not found");

    await this.db.query(
      `DELETE FROM public.user_opportunity_overrides
        WHERE user_id = $1::uuid AND opportunity_id = $2::uuid`,
      [userId, opportunityId],
    );

    await this.insertAudit({
      userId,
      opportunityId,
      action: OVERRIDE_AUDIT.delete,
      before,
      after: null,
      reason: body.reason.trim(),
      adminId: body.updatedByAdminId,
    });

    this.bus.emit(OPPORTUNITY_EVENTS.userOverrideDeleted, {
      userId,
      opportunityId,
      auditAction: OVERRIDE_AUDIT.delete,
      ledgerMutated: false as const,
    });

    return {
      deleted: true,
      auditAction: OVERRIDE_AUDIT.delete,
      ledgerMutated: false,
    };
  }

  /** Introspection for verify — merge + RBAC locks */
  describe() {
    return {
      schema: "user-opportunity-override.v1",
      day1MaxPins: DAY1_MAX_PINS_PER_USER,
      audit: OVERRIDE_AUDIT,
      ledgerMutated: false as const,
      routes: [
        "GET users/:id/opportunity-overrides",
        "PUT users/:id/opportunity-overrides/:opportunityId",
        "DELETE users/:id/opportunity-overrides/:opportunityId",
      ],
    };
  }

  private async loadOne(
    userId: string,
    opportunityId: string,
  ): Promise<UserOpportunityOverrideV1 | null> {
    const { rows } = await this.db.query<OverrideRow>(
      `SELECT user_id::text, opportunity_id::text, hidden, force_show,
              pin_order, margin_pct_override::text,
              expected_profit_usdt_override::text, capital_band_force,
              reason, updated_by_admin_id::text, updated_at
         FROM public.user_opportunity_overrides
        WHERE user_id = $1::uuid AND opportunity_id = $2::uuid`,
      [userId, opportunityId],
    );
    return rows[0] ? this.toSchema(rows[0]) : null;
  }

  private async insertAudit(input: {
    userId: string;
    opportunityId: string;
    action: string;
    before: UserOpportunityOverrideV1 | null;
    after: UserOpportunityOverrideV1 | null;
    reason: string;
    adminId: string;
  }) {
    await this.db.query(
      `INSERT INTO public.user_opportunity_override_audit (
         user_id, opportunity_id, action, before_payload, after_payload,
         reason, updated_by_admin_id
       ) VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, $5::jsonb, $6, $7::uuid)`,
      [
        input.userId,
        input.opportunityId,
        input.action,
        input.before ? JSON.stringify(input.before) : null,
        input.after ? JSON.stringify(input.after) : null,
        input.reason,
        input.adminId,
      ],
    );
  }

  private toSchema(r: OverrideRow): UserOpportunityOverrideV1 {
    return {
      userId: r.user_id,
      opportunityId: r.opportunity_id,
      hidden: r.hidden,
      forceShow: r.force_show,
      pinOrder: r.pin_order,
      marginPctOverride: r.margin_pct_override,
      expectedProfitUsdtOverride: r.expected_profit_usdt_override,
      capitalBandForce: (r.capital_band_force as CapitalBand | null) ?? null,
      reason: r.reason,
      updatedByAdminId: r.updated_by_admin_id,
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private assertUuid(value: string, field: string) {
    if (
      typeof value !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      throw new BadRequestException(`${field} must be uuid`);
    }
  }
}
