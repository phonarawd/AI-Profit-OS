/**
 * Money §42 — KYC status / submit / Admin approve·reject / withdraw gate.
 * Storage: R2 kyc-docs keys only · binary never in PG.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { isAgeAtLeast } from "../auth/auth.stage";
import { STAGE_B_MIN_AGE_YEARS } from "../auth/auth.constants";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { COMPLIANCE_EVENTS } from "./compliance.events";
import {
  assertWithdrawKyc,
  KYC_WITHDRAW_REQUIRED,
  participateGate,
} from "./kyc-gate";
import { KycR2Service } from "./kyc-r2.service";
import {
  KYC_ID_DOC_TYPES,
  KYC_REJECT_REASON_MIN,
  KYC_RETENTION_YEARS_DEFAULT,
  KYC_SIGNED_URL_TTL_SEC,
  type KycDecideResult,
  type KycDocSignedUrl,
  type KycIdDocType,
  type KycStatus,
  type KycStatusV1,
  type KycSubmissionV1,
} from "./compliance.types";

type StatusRow = {
  user_id: string;
  kyc_status: KycStatus;
  submission_id: string | null;
  decided_at: Date | null;
  reject_reason: string | null;
};

type SubmissionRow = {
  id: string;
  user_id: string;
  legal_name: string;
  phone_e164: string;
  birth_date: string;
  id_doc_type: KycIdDocType;
  id_doc_r2_key: string;
  selfie_r2_key: string | null;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  decided_by_admin_id: string | null;
  decided_at: Date | null;
  created_at: Date;
};

@Injectable()
export class KycService {
  /** Settings key pointer — retention after delete (§42.2.1) */
  readonly retentionYearsDefault = KYC_RETENTION_YEARS_DEFAULT;

  constructor(
    private readonly db: PostgresService,
    private readonly r2: KycR2Service,
    private readonly bus: InProcessEventBus,
  ) {}

  /** §42 — withdraw path must call this · 403 KYC_WITHDRAW_REQUIRED */
  async assertWithdrawKycForUser(userId: string): Promise<void> {
    if (!userId) throw new BadRequestException("userId required");
    const status = await this.getStatus(userId);
    const problem = assertWithdrawKyc(status.kycStatus);
    if (problem) {
      throw new ForbiddenException({
        code: KYC_WITHDRAW_REQUIRED,
        toastCode: KYC_WITHDRAW_REQUIRED,
        message: KYC_WITHDRAW_REQUIRED,
        statusCode: 403,
      });
    }
  }

  /**
   * §42 — participate has NO kyc check (verify:kyc-withdraw-only → 200).
   * Deposit / practice / participate call this (or skip KYC entirely).
   */
  participateWithoutKyc(kycStatus: KycStatus) {
    return participateGate(kycStatus);
  }

  async getStatus(userId: string): Promise<KycStatusV1> {
    if (!userId) throw new BadRequestException("userId required");
    const row = await this.ensureStatusRow(userId);
    return this.toStatusV1(row);
  }

  async submit(input: {
    userId: string;
    legalName: string;
    phoneE164: string;
    birthDate: string;
    idDocType: string;
    idDocBytes: Buffer;
    selfieBytes?: Buffer;
  }): Promise<KycSubmissionV1> {
    if (!input.userId) throw new BadRequestException("userId required");
    const legalName = (input.legalName ?? "").trim();
    if (legalName.length < 1) throw new BadRequestException("legalName required");
    if (!/^\+[1-9][0-9]{7,14}$/.test(input.phoneE164 ?? "")) {
      throw new BadRequestException("phoneE164 must be E.164");
    }
    if (!isAgeAtLeast(input.birthDate, STAGE_B_MIN_AGE_YEARS)) {
      throw new BadRequestException(`birthDate must be age ${STAGE_B_MIN_AGE_YEARS}+`);
    }
    if (!(KYC_ID_DOC_TYPES as readonly string[]).includes(input.idDocType)) {
      throw new BadRequestException("idDocType must be kr_id|driver|passport");
    }
    // NEVER: rrnFull · gender · publicUrl
    if (!input.idDocBytes?.length) {
      throw new BadRequestException("id document bytes required");
    }

    const current = await this.getStatus(input.userId);
    if (current.kycStatus === "pending") {
      throw new ConflictException("KYC already pending");
    }
    if (current.kycStatus === "approved") {
      throw new ConflictException("KYC already approved — no resubmit");
    }

    const submissionId = randomUUID();
    const idKey = this.r2.buildObjectKey({
      userId: input.userId,
      submissionId,
      bytes: input.idDocBytes,
      kind: "id",
    });
    await this.r2.putObject(idKey, this.r2.seal(input.idDocBytes));

    let selfieKey: string | undefined;
    if (input.selfieBytes?.length) {
      selfieKey = this.r2.buildObjectKey({
        userId: input.userId,
        submissionId,
        bytes: input.selfieBytes,
        kind: "selfie",
      });
      await this.r2.putObject(selfieKey, this.r2.seal(input.selfieBytes));
    }

    const ins = await this.db.query<SubmissionRow>(
      `INSERT INTO public.kyc_submissions (
         id, user_id, legal_name, phone_e164, birth_date,
         id_doc_type, id_doc_r2_key, selfie_r2_key, status
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4, $5::date, $6, $7, $8, 'pending'
       )
       RETURNING id, user_id, legal_name, phone_e164, birth_date::text,
                 id_doc_type, id_doc_r2_key, selfie_r2_key, status,
                 reject_reason, decided_by_admin_id, decided_at, created_at`,
      [
        submissionId,
        input.userId,
        legalName,
        input.phoneE164,
        input.birthDate,
        input.idDocType,
        idKey,
        selfieKey ?? null,
      ],
    );
    const row = ins.rows[0];

    await this.db.query(
      `INSERT INTO public.kyc_status (user_id, kyc_status, submission_id, decided_at, reject_reason, updated_at)
       VALUES ($1::uuid, 'pending', $2::uuid, NULL, NULL, now())
       ON CONFLICT (user_id) DO UPDATE SET
         kyc_status = 'pending',
         submission_id = EXCLUDED.submission_id,
         decided_at = NULL,
         reject_reason = NULL,
         updated_at = now()`,
      [input.userId, submissionId],
    );

    const v1 = this.toSubmissionV1(row);
    this.bus.emit(COMPLIANCE_EVENTS.kycSubmitted, {
      userId: input.userId,
      submissionId,
      toastCode: "KYC_PENDING",
    });
    return v1;
  }

  async listQueue(input: {
    status?: "pending" | "approved" | "rejected";
    limit?: number;
  }): Promise<KycSubmissionV1[]> {
    const status = input.status ?? "pending";
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const rows = await this.db.query<SubmissionRow>(
      `SELECT id, user_id, legal_name, phone_e164, birth_date::text,
              id_doc_type, id_doc_r2_key, selfie_r2_key, status,
              reject_reason, decided_by_admin_id, decided_at, created_at
         FROM public.kyc_submissions
        WHERE status = $1
        ORDER BY created_at ASC
        LIMIT $2`,
      [status, limit],
    );
    return rows.rows.map((r) => this.toSubmissionV1(r));
  }

  async approve(input: {
    userId: string;
    adminId: string;
    idempotencyKey: string;
  }): Promise<KycDecideResult> {
    if (!input.userId) throw new BadRequestException("userId required");
    if (!input.adminId) throw new BadRequestException("adminId required");
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }

    const status = await this.getStatus(input.userId);
    if (status.kycStatus === "approved") {
      return {
        ok: true,
        decision: "approved",
        status,
        toastCode: "KYC_APPROVED",
      };
    }
    if (status.kycStatus !== "pending" || !status.submissionId) {
      throw new ConflictException("no pending KYC submission");
    }

    const decidedAt = new Date();
    await this.db.withTransaction(async (client) => {
      await client.query(
        `UPDATE public.kyc_submissions
            SET status = 'approved',
                decided_by_admin_id = $2::uuid,
                decided_at = $3,
                reject_reason = NULL,
                updated_at = now()
          WHERE id = $1::uuid AND status = 'pending'`,
        [status.submissionId, input.adminId, decidedAt.toISOString()],
      );
      await client.query(
        `UPDATE public.kyc_status
            SET kyc_status = 'approved',
                decided_at = $2,
                reject_reason = NULL,
                updated_at = now()
          WHERE user_id = $1::uuid`,
        [input.userId, decidedAt.toISOString()],
      );
      await client.query(
        `INSERT INTO public.kyc_decision_audit (
           user_id, submission_id, decision, admin_id, idempotency_key, reason
         ) VALUES ($1::uuid, $2::uuid, 'approved', $3::uuid, $4, NULL)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [
          input.userId,
          status.submissionId,
          input.adminId,
          input.idempotencyKey,
        ],
      );
    });

    const next = await this.getStatus(input.userId);
    this.bus.emit(COMPLIANCE_EVENTS.kycApproved, {
      userId: input.userId,
      submissionId: status.submissionId,
      adminId: input.adminId,
      toastCode: "KYC_APPROVED",
      push: "KYC_APPROVED",
    });
    return {
      ok: true,
      decision: "approved",
      status: next,
      toastCode: "KYC_APPROVED",
    };
  }

  async reject(input: {
    userId: string;
    adminId: string;
    idempotencyKey: string;
    reason: string;
  }): Promise<KycDecideResult> {
    if (!input.userId) throw new BadRequestException("userId required");
    if (!input.adminId) throw new BadRequestException("adminId required");
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }
    const reason = (input.reason ?? "").trim();
    if (reason.length < KYC_REJECT_REASON_MIN) {
      throw new BadRequestException(
        `reject reason minLength ${KYC_REJECT_REASON_MIN}`,
      );
    }

    const status = await this.getStatus(input.userId);
    if (status.kycStatus === "rejected" && status.rejectReason === reason) {
      return {
        ok: true,
        decision: "rejected",
        status,
        toastCode: "KYC_REJECTED",
      };
    }
    if (status.kycStatus !== "pending" || !status.submissionId) {
      throw new ConflictException("no pending KYC submission");
    }

    const decidedAt = new Date();
    await this.db.withTransaction(async (client) => {
      await client.query(
        `UPDATE public.kyc_submissions
            SET status = 'rejected',
                decided_by_admin_id = $2::uuid,
                decided_at = $3,
                reject_reason = $4,
                updated_at = now()
          WHERE id = $1::uuid AND status = 'pending'`,
        [status.submissionId, input.adminId, decidedAt.toISOString(), reason],
      );
      await client.query(
        `UPDATE public.kyc_status
            SET kyc_status = 'rejected',
                decided_at = $2,
                reject_reason = $3,
                updated_at = now()
          WHERE user_id = $1::uuid`,
        [input.userId, decidedAt.toISOString(), reason],
      );
      await client.query(
        `INSERT INTO public.kyc_decision_audit (
           user_id, submission_id, decision, admin_id, idempotency_key, reason
         ) VALUES ($1::uuid, $2::uuid, 'rejected', $3::uuid, $4, $5)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [
          input.userId,
          status.submissionId,
          input.adminId,
          input.idempotencyKey,
          reason,
        ],
      );
    });

    const next = await this.getStatus(input.userId);
    this.bus.emit(COMPLIANCE_EVENTS.kycRejected, {
      userId: input.userId,
      submissionId: status.submissionId,
      adminId: input.adminId,
      toastCode: "KYC_REJECTED",
      push: "KYC_REJECTED",
      reason,
    });
    return {
      ok: true,
      decision: "rejected",
      status: next,
      toastCode: "KYC_REJECTED",
    };
  }

  /** Admin compliance RBAC only · signed URL TTL ≤5m */
  async signedDocUrl(input: {
    userId: string;
    kind?: "id" | "selfie";
  }): Promise<KycDocSignedUrl> {
    const status = await this.getStatus(input.userId);
    if (!status.submissionId) {
      throw new NotFoundException("no KYC submission");
    }
    const rows = await this.db.query<SubmissionRow>(
      `SELECT id, user_id, legal_name, phone_e164, birth_date::text,
              id_doc_type, id_doc_r2_key, selfie_r2_key, status,
              reject_reason, decided_by_admin_id, decided_at, created_at
         FROM public.kyc_submissions
        WHERE id = $1::uuid`,
      [status.submissionId],
    );
    const row = rows.rows[0];
    if (!row) throw new NotFoundException("submission not found");
    const key =
      input.kind === "selfie" ? row.selfie_r2_key : row.id_doc_r2_key;
    if (!key) throw new NotFoundException("document key missing");
    this.r2.assertPrivateKey(key);
    const signedUrl = this.r2.signedGetUrl(key, KYC_SIGNED_URL_TTL_SEC);
    return {
      userId: input.userId,
      submissionId: row.id,
      r2Key: key,
      signedUrl,
      expiresInSec: KYC_SIGNED_URL_TTL_SEC,
      publicAccess: false,
    };
  }

  private async ensureStatusRow(userId: string): Promise<StatusRow> {
    const existing = await this.db.query<StatusRow>(
      `SELECT user_id, kyc_status, submission_id, decided_at, reject_reason
         FROM public.kyc_status
        WHERE user_id = $1::uuid`,
      [userId],
    );
    if (existing.rows[0]) return existing.rows[0];
    const ins = await this.db.query<StatusRow>(
      `INSERT INTO public.kyc_status (user_id, kyc_status)
       VALUES ($1::uuid, 'none')
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING user_id, kyc_status, submission_id, decided_at, reject_reason`,
      [userId],
    );
    return ins.rows[0];
  }

  private toStatusV1(row: StatusRow): KycStatusV1 {
    return {
      userId: row.user_id,
      kycStatus: row.kyc_status,
      submissionId: row.submission_id ?? undefined,
      decidedAt: row.decided_at
        ? new Date(row.decided_at).toISOString()
        : undefined,
      rejectReason: row.reject_reason ?? undefined,
    };
  }

  private toSubmissionV1(row: SubmissionRow): KycSubmissionV1 {
    const birth =
      typeof row.birth_date === "string"
        ? row.birth_date.slice(0, 10)
        : String(row.birth_date).slice(0, 10);
    return {
      submissionId: row.id,
      userId: row.user_id,
      legalName: row.legal_name,
      phoneE164: row.phone_e164,
      birthDate: birth,
      idDocType: row.id_doc_type,
      idDocR2Key: row.id_doc_r2_key,
      selfieR2Key: row.selfie_r2_key ?? undefined,
      status: row.status,
      rejectReason: row.reject_reason ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      decidedAt: row.decided_at
        ? new Date(row.decided_at).toISOString()
        : undefined,
    };
  }
}
