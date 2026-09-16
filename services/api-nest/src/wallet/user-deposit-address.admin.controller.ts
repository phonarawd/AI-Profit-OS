import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { DepositAddressService } from "./deposit-address.service";
import { WALLET_ADMIN_ROUTES } from "./wallet.routes";

/**
 * 회원별 기존 TRC20 조회 · /api/v1/admin/users/:id/deposit-address
 * 없으면 404. 공유 주소 발급 API 금지.
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class UserDepositAddressAdminController {
  constructor(private readonly depositAddress: DepositAddressService) {}

  @Get(WALLET_ADMIN_ROUTES.userDepositAddress)
  async get(@Param("id") id: string) {
    const row = await this.depositAddress.getExisting(id);
    if (!row) {
      throw new NotFoundException("deposit address not found");
    }
    return {
      userId: row.userId,
      trc20Address: row.trc20Address,
      qrPayload: row.qrPayload,
    };
  }
}
