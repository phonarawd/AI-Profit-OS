/**
 * 운영자 CMS persist. 운영 public.cms_posts 만.
 * 시드 글 0. 손님 목록은 published 만.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createRequire } from "node:module";
import { PostgresService } from "../db/postgres";
import { OpsInboxService } from "../inbox/ops-inbox.service";
import { PushEmitService } from "../push/push-emit.service";
import type { CmsKind } from "./cms.routes";

const reqCjs = createRequire(__filename);
const core = reqCjs("./cms.core.cjs") as {
  KINDS: string[];
  isKind: (raw: unknown) => boolean;
  applyCreate: (input: object, meta: object) => CmsCoreOut;
  applyPatch: (row: CmsRow | null, input: object) => CmsCoreOut;
  applyPublish: (row: CmsRow | null) => CmsCoreOut;
  applyEnd: (row: CmsRow | null) => CmsCoreOut;
  projectAdmin: (row: CmsRow | null) => object | null;
  projectPublic: (row: CmsRow | null) => object | null;
};

type CmsRow = {
  id: string;
  kind: string;
  status: string;
  title: string;
  body: string;
  imageUrl: string | null;
  publishedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CmsCoreOut = {
  ok: boolean;
  applied?: boolean;
  code?: string;
  httpStatus?: number;
  detail?: string;
  item?: CmsRow;
};

type DbRow = {
  id: string;
  kind: string;
  status: string;
  title: string;
  body: string;
  image_url: string | null;
  published_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class CmsService {
  constructor(
    private readonly db: PostgresService,
    @Optional() private readonly inbox?: OpsInboxService,
    @Optional() private readonly push?: PushEmitService,
  ) {}

  async adminList(kind: string) {
    this.assertKind(kind);
    this.assertDb();
    const { rows } = await this.db.query<DbRow>(
      `SELECT id::text, kind, status, title, body, image_url,
              published_at, ended_at, created_at, updated_at
         FROM public.cms_posts
        WHERE kind = $1
        ORDER BY created_at DESC
        LIMIT 100`,
      [kind],
    );
    return { items: rows.map((r) => core.projectAdmin(this.toRow(r))) };
  }

  async adminGet(kind: string, id: string) {
    this.assertKind(kind);
    this.assertUuid(id);
    const row = await this.fetch(kind, id);
    if (!row) throw new NotFoundException("cms post not found");
    return { item: core.projectAdmin(row) };
  }

  async create(
    kind: string,
    body: Record<string, unknown>,
    operatorId: string,
  ) {
    this.assertKind(kind);
    this.assertUuid(operatorId, "operatorId");
    this.assertDb();
    const planned = core.applyCreate(
      {
        kind,
        title: body.title,
        body: body.body,
        imageUrl: body.imageUrl,
      },
      {},
    );
    this.throwCore(planned);
    const { rows } = await this.db.query<DbRow>(
      `INSERT INTO public.cms_posts (
         kind, status, title, body, image_url,
         created_by_admin_id, updated_by_admin_id
       ) VALUES ($1, 'draft', $2, $3, $4, $5::uuid, $5::uuid)
       RETURNING id::text, kind, status, title, body, image_url,
                 published_at, ended_at, created_at, updated_at`,
      [
        kind,
        planned.item!.title,
        planned.item!.body,
        planned.item!.imageUrl,
        operatorId,
      ],
    );
    return { item: core.projectAdmin(this.toRow(rows[0])), applied: true };
  }

  async patch(
    kind: string,
    id: string,
    body: Record<string, unknown>,
    operatorId: string,
  ) {
    this.assertKind(kind);
    this.assertUuid(id);
    this.assertUuid(operatorId, "operatorId");
    this.assertDb();
    const current = await this.fetch(kind, id);
    const planned = core.applyPatch(current, body);
    this.throwCore(planned);
    const { rows } = await this.db.query<DbRow>(
      `UPDATE public.cms_posts SET
         title = $3,
         body = $4,
         image_url = $5,
         updated_by_admin_id = $6::uuid,
         updated_at = now()
       WHERE id = $1::uuid AND kind = $2 AND status = 'draft'
       RETURNING id::text, kind, status, title, body, image_url,
                 published_at, ended_at, created_at, updated_at`,
      [
        id,
        kind,
        planned.item!.title,
        planned.item!.body,
        planned.item!.imageUrl,
        operatorId,
      ],
    );
    if (!rows[0]) throw new ConflictException("NOT_DRAFT");
    return { item: core.projectAdmin(this.toRow(rows[0])), applied: true };
  }

  async publish(kind: string, id: string, operatorId: string) {
    this.assertKind(kind);
    this.assertUuid(id);
    this.assertUuid(operatorId, "operatorId");
    this.assertDb();
    const current = await this.fetch(kind, id);
    const planned = core.applyPublish(current);
    this.throwCore(planned);
    if (planned.applied !== true) {
      return { item: core.projectAdmin(current), applied: false };
    }
    const { rows } = await this.db.query<DbRow>(
      `UPDATE public.cms_posts SET
         status = 'published',
         published_at = COALESCE(published_at, now()),
         updated_by_admin_id = $3::uuid,
         updated_at = now()
       WHERE id = $1::uuid AND kind = $2 AND status = 'draft'
       RETURNING id::text, kind, status, title, body, image_url,
                 published_at, ended_at, created_at, updated_at`,
      [id, kind, operatorId],
    );
    if (!rows[0]) throw new ConflictException("NOT_DRAFT");
    const item = this.toRow(rows[0]);
    const fanout =
      kind === "notification" ? await this.fanoutNotification(item, operatorId) : null;
    return { item: core.projectAdmin(item), applied: true, fanout };
  }

  async end(kind: string, id: string, operatorId: string) {
    this.assertKind(kind);
    this.assertUuid(id);
    this.assertUuid(operatorId, "operatorId");
    this.assertDb();
    const current = await this.fetch(kind, id);
    const planned = core.applyEnd(current);
    this.throwCore(planned);
    if (planned.applied !== true) {
      return { item: core.projectAdmin(current), applied: false };
    }
    const { rows } = await this.db.query<DbRow>(
      `UPDATE public.cms_posts SET
         status = 'ended',
         ended_at = now(),
         updated_by_admin_id = $3::uuid,
         updated_at = now()
       WHERE id = $1::uuid AND kind = $2 AND status = 'published'
       RETURNING id::text, kind, status, title, body, image_url,
                 published_at, ended_at, created_at, updated_at`,
      [id, kind, operatorId],
    );
    if (!rows[0]) throw new ConflictException("NOT_PUBLISHED");
    return { item: core.projectAdmin(this.toRow(rows[0])), applied: true };
  }

  async publicList(kind: string) {
    this.assertKind(kind);
    this.assertDb();
    const { rows } = await this.db.query<DbRow>(
      `SELECT id::text, kind, status, title, body, image_url,
              published_at, ended_at, created_at, updated_at
         FROM public.cms_posts
        WHERE kind = $1 AND status = 'published'
        ORDER BY published_at DESC NULLS LAST, created_at DESC
        LIMIT 50`,
      [kind],
    );
    return { items: rows.map((r) => core.projectPublic(this.toRow(r))).filter(Boolean) };
  }

  async publicGet(kind: string, id: string) {
    this.assertKind(kind);
    this.assertUuid(id);
    this.assertDb();
    const row = await this.fetch(kind, id);
    const pub = core.projectPublic(row);
    if (!pub) throw new NotFoundException("cms post not found");
    return { item: pub };
  }

  /** 알림 게시 시 손님함 적재. push-dispatcher 가 있으면 그 경로만. 가짜 발송 금지. */
  private async fanoutNotification(item: CmsRow, operatorId: string) {
    if (!this.inbox) {
      return { inboxStored: 0, pushAttempted: false, reason: "inbox_unavailable" };
    }
    const { rows } = await this.db.query<{ id: string }>(
      `SELECT id::text FROM public.users WHERE status = 'active'`,
    );
    const titleKo = item.title.slice(0, 40);
    const bodyKo = (item.body || item.title).slice(0, 500);
    let inboxStored = 0;
    let pushAttempted = false;
    let pushSent = 0;
    for (const user of rows) {
      const sourceEventId = `cms:${item.id}:${user.id}`;
      try {
        const sent = await this.inbox.sendToUser(user.id, {
          template: "OPS_NOTICE",
          titleKo,
          bodyKo,
          createdByAdminId: operatorId,
          sourceEventId,
        });
        inboxStored += 1;
        if (sent.pushEligible === true && this.push) {
          pushAttempted = true;
          const emit = await this.push.emitToUser({
            userId: user.id,
            channel: "notice",
            payload: {
              title: titleKo,
              body: bodyKo,
              kind: "notification",
              cmsId: item.id,
            },
          });
          pushSent += Number(emit.sent || 0);
        }
      } catch {
        // 한 명 실패가 전체 게시를 뒤집지 않는다. 가짜 sent 카운트는 올리지 않는다.
      }
    }
    return { inboxStored, pushAttempted, pushSent };
  }

  private async fetch(kind: string, id: string): Promise<CmsRow | null> {
    this.assertDb();
    const { rows } = await this.db.query<DbRow>(
      `SELECT id::text, kind, status, title, body, image_url,
              published_at, ended_at, created_at, updated_at
         FROM public.cms_posts
        WHERE id = $1::uuid AND kind = $2`,
      [id, kind],
    );
    return rows[0] ? this.toRow(rows[0]) : null;
  }

  private toRow(row: DbRow): CmsRow {
    return {
      id: row.id,
      kind: row.kind,
      status: row.status,
      title: row.title,
      body: row.body,
      imageUrl: row.image_url,
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
      endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private throwCore(out: CmsCoreOut): void {
    if (out.ok) return;
    if (out.httpStatus === 404) throw new NotFoundException(out.code || "NOT_FOUND");
    if (out.httpStatus === 409) throw new ConflictException(out.code || "CONFLICT");
    throw new BadRequestException(out.code || out.detail || "INVALID");
  }

  private assertKind(kind: string): asserts kind is CmsKind {
    if (!core.isKind(kind)) {
      throw new BadRequestException("kind must be notice|event|benefit|banner|notification");
    }
  }

  private assertDb(): void {
    if (!this.db.configured()) {
      throw new ServiceUnavailableException({
        code: "STORE_UNREADY",
        toastCode: "STORE_UNREADY",
        message: "cms store is not ready",
        applied: false,
        storeStatus: "unready",
        statusCode: 503,
      });
    }
  }

  private assertUuid(value: string, field = "id"): void {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      throw new BadRequestException(`${field} must be uuid`);
    }
  }
}
