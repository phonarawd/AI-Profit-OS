import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { COMPLIANCE_USER_ROUTES } from "./compliance.routes";
import { KYC_MAX_FILE_BYTES } from "./kyc-upload.contract";
import { KycService } from "./kyc.service";

type UploadPart = { buffer?: Buffer; mimetype?: string; originalname?: string };

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

/**
 * User compliance KYC · /api/v1/compliance/*
 * PART9-pre2 — status/submit JwtAuthGuard + session userId (IDOR 차단)
 * multipart idDoc/selfie · also accepts idDocBase64 for thin clients.
 */
@Controller("compliance")
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @UseGuards(JwtAuthGuard)
  @Get(COMPLIANCE_USER_ROUTES.kycStatus)
  status(@Req() req: SessionReq) {
    return this.kyc.getStatus(this.sessionUserId(req));
  }

  @Post(COMPLIANCE_USER_ROUTES.kycSubmit)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "idDoc", maxCount: 1 },
        { name: "selfie", maxCount: 1 },
      ],
      { limits: { fileSize: KYC_MAX_FILE_BYTES, files: 2 } },
    ),
  )
  @UseGuards(JwtAuthGuard)
  submit(
    @Body() body: Record<string, unknown>,
    @Req() req: SessionReq,
    @UploadedFiles()
    files?: {
      idDoc?: UploadPart[];
      selfie?: UploadPart[];
    },
  ) {
    const idFromFile = files?.idDoc?.[0]?.buffer;
    const idFromB64 =
      typeof body.idDocBase64 === "string"
        ? Buffer.from(body.idDocBase64, "base64")
        : undefined;
    const selfieFromFile = files?.selfie?.[0]?.buffer;
    const selfieFromB64 =
      typeof body.selfieBase64 === "string"
        ? Buffer.from(body.selfieBase64, "base64")
        : undefined;

    const idDocBytes = idFromFile ?? idFromB64 ?? Buffer.alloc(0);
    const selfieBytes = selfieFromFile ?? selfieFromB64 ?? Buffer.alloc(0);
    return this.kyc.submit({
      userId: this.sessionUserId(req),
      legalName: String(body.legalName ?? ""),
      phoneE164: String(body.phoneE164 ?? ""),
      birthDate: String(body.birthDate ?? ""),
      idDocType: String(body.idDocType ?? ""),
      idDocBytes,
      selfieBytes,
      idDocMime: files?.idDoc?.[0]?.mimetype,
      idDocName: files?.idDoc?.[0]?.originalname,
      selfieMime: files?.selfie?.[0]?.mimetype,
      selfieName: files?.selfie?.[0]?.originalname,
    });
  }

  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    return userId;
  }
}
