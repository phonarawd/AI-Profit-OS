import { Controller, Get, Param } from "@nestjs/common";
import { CMS_PUBLIC_ROUTES } from "./cms.routes";
import { CmsService } from "./cms.service";

/**
 * 손님 CMS · /api/v1/cms/:kind
 * published 만. 초안·종료는 숨김. 목업 카드 금지.
 */
@Controller()
export class CmsPublicController {
  constructor(private readonly cms: CmsService) {}

  @Get(CMS_PUBLIC_ROUTES.list)
  list(@Param("kind") kind: string) {
    return this.cms.publicList(kind);
  }

  @Get(CMS_PUBLIC_ROUTES.get)
  get(@Param("kind") kind: string, @Param("id") id: string) {
    return this.cms.publicGet(kind, id);
  }
}
