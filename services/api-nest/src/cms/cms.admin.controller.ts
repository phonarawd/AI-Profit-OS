import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { CMS_ADMIN_ROUTES } from "./cms.routes";
import { CmsService } from "./cms.service";

/**
 * 운영자 CMS · /api/v1/admin/cms/:kind
 * 등록·수정·게시·게시종료. Auth/RBAC = AdminGuard.
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class CmsAdminController {
  constructor(private readonly cms: CmsService) {}

  @Get(CMS_ADMIN_ROUTES.list)
  list(@Param("kind") kind: string) {
    return this.cms.adminList(kind);
  }

  @Get(CMS_ADMIN_ROUTES.get)
  get(@Param("kind") kind: string, @Param("id") id: string) {
    return this.cms.adminGet(kind, id);
  }

  @Post(CMS_ADMIN_ROUTES.create)
  create(
    @Param("kind") kind: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.cms.create(kind, body || {}, operatorId);
  }

  @Patch(CMS_ADMIN_ROUTES.patch)
  patch(
    @Param("kind") kind: string,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.cms.patch(kind, id, body || {}, operatorId);
  }

  @Post(CMS_ADMIN_ROUTES.publish)
  publish(
    @Param("kind") kind: string,
    @Param("id") id: string,
    @AdminOperator() operatorId: string,
  ) {
    return this.cms.publish(kind, id, operatorId);
  }

  @Post(CMS_ADMIN_ROUTES.end)
  end(
    @Param("kind") kind: string,
    @Param("id") id: string,
    @AdminOperator() operatorId: string,
  ) {
    return this.cms.end(kind, id, operatorId);
  }
}
