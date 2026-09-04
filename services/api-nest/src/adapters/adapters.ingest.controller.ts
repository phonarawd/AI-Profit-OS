import {
  Body,
  Controller,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";
import { AdaptersAdminService } from "./adapters.admin.service";
import { ADAPTER_INGEST_ROUTES } from "./adapters.routes";
import type { AdapterIngestBody } from "./adapters.types";

/**
 * Phase1 worker ingest · /api/v1/internal/adapters/ingest
 * When ADAPTER_INGEST_TOKEN is set, requires x-adapter-token header.
 */
@Controller()
export class AdaptersIngestController {
  constructor(private readonly adapters: AdaptersAdminService) {}

  @Post(ADAPTER_INGEST_ROUTES.ingest)
  ingest(
    @Body() body: AdapterIngestBody,
    @Req() req: { headers: Record<string, string | string[] | undefined> },
  ) {
    const token = loadPhase0Env().adapterIngestToken;
    if (!token) {
      throw new ServiceUnavailableException(
        "ADAPTER_INGEST_TOKEN_NOT_CONFIGURED",
      );
    }
    const raw = req.headers["x-adapter-token"];
    const got = Array.isArray(raw) ? raw[0] : raw;
    if (got !== token) {
      throw new UnauthorizedException("ADAPTER_INGEST_TOKEN_INVALID");
    }
    return this.adapters.ingest(body ?? { adapterId: "" });
  }
}
