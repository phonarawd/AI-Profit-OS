import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { LedgerAdminService } from "./ledger.admin.service";
import { LedgerPostingService } from "./ledger.posting.service";
import { LEDGER_ADMIN_ROUTES } from "./ledger.routes";
import type { AdminAdjustInput, UserBucket } from "./ledger.types";

/**
 * Admin Money HTTP surface · /api/v1/admin/*
 * Auth/RBAC = AdminGuard (deny-by-default · schemas/admin-rbac.v1.json).
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class LedgerAdminController {
  constructor(
    private readonly admin: LedgerAdminService,
    private readonly posting: LedgerPostingService,
  ) {}

  @Get(LEDGER_ADMIN_ROUTES.journals)
  listJournals(
    @Query("userId") userId?: string,
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string,
  ) {
    return this.admin.listJournals({
      userId: userId || undefined,
      limit: limitRaw ? Number(limitRaw) : undefined,
      offset: offsetRaw ? Number(offsetRaw) : undefined,
    });
  }

  @Get(LEDGER_ADMIN_ROUTES.journalById)
  getJournal(@Param("journalId") journalId: string) {
    return this.posting.getJournal(journalId);
  }

  @Get(LEDGER_ADMIN_ROUTES.recon)
  recon(@Query("userId") userId?: string) {
    return this.admin.reconcile(userId || undefined);
  }

  @Get(LEDGER_ADMIN_ROUTES.financialReport)
  financialReport(
    @Query("granularity") granularityRaw?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const granularity =
      granularityRaw === "month" ? ("month" as const) : ("day" as const);
    return this.admin.financialReport({ granularity, from, to });
  }

  @Get(LEDGER_ADMIN_ROUTES.userBuckets)
  userBuckets(@Param("userId") userId: string) {
    return this.admin.getBuckets(userId);
  }

  @Post(LEDGER_ADMIN_ROUTES.balanceAdjust)
  balanceAdjust(
    @Param("userId") userId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const input: AdminAdjustInput = {
      userId,
      bucket: body.bucket as UserBucket,
      kind: body.kind as AdminAdjustInput["kind"],
      amountUsdt: String(body.amountUsdt ?? ""),
      reason: String(body.reason ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
      createdBy: String(body.createdBy ?? ""),
      secondApproverId: body.secondApproverId
        ? String(body.secondApproverId)
        : undefined,
      reverseJournalId: body.reverseJournalId
        ? String(body.reverseJournalId)
        : undefined,
      applyKind:
        body.applyKind === "debit" || body.applyKind === "credit"
          ? body.applyKind
          : undefined,
      fxSnapshotId: body.fxSnapshotId ? String(body.fxSnapshotId) : null,
    };
    return this.admin.balanceAdjust(input);
  }
}
