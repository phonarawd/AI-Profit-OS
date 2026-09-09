/**
 * 클라이언트 푸시 팝업의 서버 권위. JWT 없음 — 켜짐/꺼짐만 알린다.
 * 조회 실패는 클라이언트가 fail-closed로 숨긴다.
 */
import { Controller, Get } from "@nestjs/common";
import { PUSH_PUBLIC_ROUTES } from "./push.routes";
import { PushKillService } from "./push-kill.service";

@Controller()
export class PushPublicController {
  constructor(private readonly kill: PushKillService) {}

  @Get(PUSH_PUBLIC_ROUTES.enabled)
  async enabled(): Promise<{ pushEnabled: boolean }> {
    const pushEnabled = await this.kill.getEnabled();
    return { pushEnabled: pushEnabled === true };
  }
}
