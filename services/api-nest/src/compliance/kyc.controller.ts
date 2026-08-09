import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { COMPLIANCE_USER_ROUTES } from "./compliance.routes";
import { KycService } from "./kyc.service";

type UploadPart = { buffer?: Buffer };

/**
 * User compliance KYC · /api/v1/compliance/*
 * Auth guard lands with auth wiring — contracts locked here.
 * multipart idDoc/selfie · also accepts idDocBase64 for thin clients.
 */
@Controller("compliance")
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Get(COMPLIANCE_USER_ROUTES.kycStatus)
  status(@Query("userId") userId?: string) {
    return this.kyc.getStatus(String(userId ?? ""));
  }

  @Post(COMPLIANCE_USER_ROUTES.kycSubmit)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "idDoc", maxCount: 1 },
      { name: "selfie", maxCount: 1 },
    ]),
  )
  submit(
    @Body() body: Record<string, unknown>,
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

    return this.kyc.submit({
      userId: String(body.userId ?? ""),
      legalName: String(body.legalName ?? ""),
      phoneE164: String(body.phoneE164 ?? ""),
      birthDate: String(body.birthDate ?? ""),
      idDocType: String(body.idDocType ?? ""),
      idDocBytes: idFromFile ?? idFromB64 ?? Buffer.alloc(0),
      selfieBytes: selfieFromFile ?? selfieFromB64,
    });
  }
}
