/**
 * UI §5.9.4 · Admin §9.8.8d — ops inbox row store
 * Push fanout Owns=PWA · prefs OFF skips Push only
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { NotificationPrefsService } from "./notification-prefs.service";

const TEMPLATES = [
  "OPS_NOTICE",
  "OPS_KYC",
  "OPS_DEPOSIT",
  "OPS_WITHDRAW",
  "OPS_CUSTOM",
] as const;

export type OpsInboxTemplate = (typeof TEMPLATES)[number];

const INTERNAL_HREF_MAX = 512;

function safeInternalHref(value: unknown): string | null {
  if (value == null) return null;
  const href = String(value).trim();
  if (!href) return null;
  if (
    href.length > INTERNAL_HREF_MAX ||
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(href)
  ) {
    return null;
  }
  return href;
}

function requireInternalHref(value: unknown): string | null {
  if (value == null || String(value).trim() === "") return null;
  const href = safeInternalHref(value);
  if (!href) throw new BadRequestException("href must be an internal path");
  return href;
}

export type SendOpsMessageInput = {
  template: OpsInboxTemplate | string;
  titleKo: string;
  bodyKo: string;
  href?: string;
  createdByAdminId: string;
  sourceEventId?: string;
};

type InboxRow = {
  id: string;
  user_id: string;
  template: string;
  title_ko: string;
  body_ko: string;
  href: string | null;
  read_at: Date | null;
  hidden_at: Date | null;
  created_at: Date;
  source_event_id: string | null;
};

@Injectable()
export class OpsInboxService {
  constructor(
    private readonly db: PostgresService,
    private readonly prefs: NotificationPrefsService,
  ) {}

  /**
   * Admin §9.8.8d — always store inbox row.
   * Returns pushEligible from prefs (PWA consumes; transmission Owns=PWA).
   */
  async sendToUser(userId: string, input: SendOpsMessageInput) {
    const template = String(input.template ?? "");
    if (!(TEMPLATES as readonly string[]).includes(template)) {
      throw new BadRequestException("invalid ops template");
    }
    const titleKo = String(input.titleKo ?? "").trim();
    const bodyKo = String(input.bodyKo ?? "").trim();
    if (!titleKo || titleKo.length > 40) {
      throw new BadRequestException("titleKo max 40");
    }
    if (!bodyKo || bodyKo.length > 500) {
      throw new BadRequestException("bodyKo max 500");
    }
    const adminId = String(input.createdByAdminId ?? "");
    if (!adminId) throw new BadRequestException("createdByAdminId required");

    // tendency / guaranteed profit soft guards (copy surface)
    if (/보장\s*수익|확정\s*수익/.test(bodyKo) || /보장\s*수익|확정\s*수익/.test(titleKo)) {
      throw new BadRequestException("guaranteed profit copy FORBIDDEN");
    }

    let row: InboxRow | undefined;
    try {
      const res = await this.db.query<InboxRow>(
        `INSERT INTO public.ops_inbox_messages (
           user_id, template, title_ko, body_ko, href,
           created_by_admin_id, source_event_id
         ) VALUES (
           $1::uuid, $2, $3, $4, $5, $6::uuid, $7
         )
         RETURNING id::text, user_id::text, template, title_ko, body_ko, href,
                   read_at, hidden_at, created_at, source_event_id`,
        [
          userId,
          template,
          titleKo,
          bodyKo,
          requireInternalHref(input.href),
          adminId,
          input.sourceEventId ?? null,
        ],
      );
      row = res.rows[0];
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "23505" && input.sourceEventId) {
        const again = await this.db.query<InboxRow>(
          `SELECT id::text, user_id::text, template, title_ko, body_ko, href,
                  read_at, hidden_at, created_at, source_event_id
             FROM public.ops_inbox_messages
            WHERE user_id = $1::uuid AND source_event_id = $2`,
          [userId, input.sourceEventId],
        );
        row = again.rows[0];
      } else {
        throw e;
      }
    }
    if (!row) throw new BadRequestException("ops message insert failed");

    const pushEligible = await this.prefs.allowPush(userId, "opsMessage");
    return {
      message: this.toUserItem(row),
      pushEligible,
      /** PWA §23.5a — when false, do not send Web Push */
      pushSkippedReason: pushEligible ? null : "prefs_opsMessage_or_master_off",
      audit: "admin.user.notify.sent" as const,
    };
  }

  async listForUser(userId: string) {
    const res = await this.db.query<InboxRow>(
      `SELECT id::text, user_id::text, template, title_ko, body_ko, href,
              read_at, hidden_at, created_at, source_event_id
         FROM public.ops_inbox_messages
        WHERE user_id = $1::uuid AND hidden_at IS NULL
        ORDER BY created_at DESC
        LIMIT 100`,
      [userId],
    );
    return { items: res.rows.map((r) => this.toUserItem(r)) };
  }

  async markRead(userId: string, id: string) {
    const res = await this.db.query(
      `UPDATE public.ops_inbox_messages
          SET read_at = COALESCE(read_at, now())
        WHERE id = $1::uuid AND user_id = $2::uuid AND hidden_at IS NULL
        RETURNING id`,
      [id, userId],
    );
    if (!res.rows[0]) throw new NotFoundException("INBOX_NOT_FOUND");
    return { ok: true as const };
  }

  /** Soft hide — hard delete FORBIDDEN */
  async hide(userId: string, id: string) {
    const res = await this.db.query(
      `UPDATE public.ops_inbox_messages
          SET hidden_at = now()
        WHERE id = $1::uuid AND user_id = $2::uuid AND hidden_at IS NULL
        RETURNING id`,
      [id, userId],
    );
    if (!res.rows[0]) throw new NotFoundException("INBOX_NOT_FOUND");
    return { ok: true as const, hardDelete: false as const };
  }

  private toUserItem(row: InboxRow) {
    return {
      id: row.id,
      channel: "ops" as const,
      titleKo: row.title_ko,
      bodyKo: row.body_ko,
      href: safeInternalHref(row.href),
      createdAt: row.created_at?.toISOString?.() ?? String(row.created_at),
      readAt: row.read_at ? row.read_at.toISOString() : null,
      template: row.template,
    };
  }
}
