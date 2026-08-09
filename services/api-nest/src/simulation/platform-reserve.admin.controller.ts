import { Body, Controller, Get, Put, Query } from "@nestjs/common";
import { PlatformReserveAdminService } from "./platform-reserve.admin.service";
import { PLATFORM_RESERVE_ADMIN_ROUTES } from "./simulation.routes";
import type { PlatformReservePutInput } from "./simulation.types";

/**
 * Admin /admin/system-control?tab=reserve · /api/v1/admin/system-control/reserve*
 * Engine §0.0.4.3 · S2 input · audit
 */
@Controller("admin")
export class PlatformReserveAdminController {
  constructor(private readonly reserve: PlatformReserveAdminService) {}

  @Get(PLATFORM_RESERVE_ADMIN_ROUTES.get)
  get() {
    return this.reserve.get();
  }

  @Put(PLATFORM_RESERVE_ADMIN_ROUTES.put)
  put(@Body() body: Record<string, unknown>) {
    const input: PlatformReservePutInput = {
      targetUsdt: String(body.targetUsdt ?? ""),
      updatedByAdminId: String(body.updatedByAdminId ?? ""),
      changeReason: String(body.changeReason ?? ""),
    };
    return this.reserve.put(input);
  }

  @Get(PLATFORM_RESERVE_ADMIN_ROUTES.audit)
  audit(@Query("limit") limit?: string) {
    return this.reserve.audit(limit ? Number(limit) : 20);
  }
}
