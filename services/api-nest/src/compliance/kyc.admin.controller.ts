import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { COMPLIANCE_ADMIN_ROUTES } from "./compliance.routes";
import { KycService } from "./kyc.service";

/**
 * Admin compliance?tab=kyc HTTP surface · /api/v1/admin/compliance/kyc/*
 * UI tab = /admin/compliance?tab=kyc · Auth/RBAC = Admin todos (준법·최고).
 * Money Owns: approve/reject API + R2 signed URL ≤5m.
 */
@Controller("admin")
export class KycAdminController {
  constructor(private readonly kyc: KycService) {}

  @Get(COMPLIANCE_ADMIN_ROUTES.kycQueue)
  list(
    @Query("status") statusRaw?: string,
    @Query("limit") limitRaw?: string,
  ) {
    const status = (statusRaw || "pending") as
      | "pending"
      | "approved"
      | "rejected";
    return this.kyc.listQueue({
      status,
      limit: limitRaw ? Number(limitRaw) : undefined,
    });
  }

  @Post(COMPLIANCE_ADMIN_ROUTES.kycApprove)
  approve(@Param("userId") userId: string, @Body() body: Record<string, unknown>) {
    return this.kyc.approve({
      userId,
      adminId: String(body.adminId ?? body.updatedByAdminId ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  @Post(COMPLIANCE_ADMIN_ROUTES.kycReject)
  reject(@Param("userId") userId: string, @Body() body: Record<string, unknown>) {
    return this.kyc.reject({
      userId,
      adminId: String(body.adminId ?? body.updatedByAdminId ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
      reason: String(body.reason ?? body.rejectReason ?? ""),
    });
  }

  /** R2 signed URL TTL ≤5m · publicAccess false · CS role 원본 다운로드 금지 (RBAC later) */
  @Get(COMPLIANCE_ADMIN_ROUTES.kycDocUrl)
  docUrl(
    @Param("userId") userId: string,
    @Query("kind") kindRaw?: string,
  ) {
    const kind = kindRaw === "selfie" ? "selfie" : "id";
    return this.kyc.signedDocUrl({ userId, kind });
  }
}
