/**
 * 쪽지함 목록 — { items: [] }만 빈 ready. 잘못된 권위는 unavailable.
 */

import type { InboxChannel, InboxItemModel } from "./inbox-types";

export type InboxReadView = "loading" | "ready" | "unauthorized" | "unavailable";

const ITEM_CHANNELS = new Set<Exclude<InboxChannel, "all">>([
  "ops",
  "notice",
  "campaign",
  "opportunity",
  "wallet",
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isOptionalStringOrNull(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

export function parseInboxItem(raw: unknown): InboxItemModel | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!isNonEmptyString(o.id)) return null;
  if (typeof o.channel !== "string" || !ITEM_CHANNELS.has(o.channel as Exclude<InboxChannel, "all">)) {
    return null;
  }
  if (typeof o.titleKo !== "string") return null;
  if (typeof o.bodyKo !== "string") return null;
  if (!isNonEmptyString(o.createdAt)) return null;
  if (!isOptionalStringOrNull(o.href)) return null;
  if (!isOptionalStringOrNull(o.readAt)) return null;
  if (o.template !== undefined && typeof o.template !== "string") return null;
  const item: InboxItemModel = {
    id: o.id,
    channel: o.channel as Exclude<InboxChannel, "all">,
    titleKo: o.titleKo,
    bodyKo: o.bodyKo,
    createdAt: o.createdAt,
  };
  if (o.href !== undefined) item.href = o.href as string | null;
  if (o.readAt !== undefined) item.readAt = o.readAt as string | null;
  if (typeof o.template === "string") item.template = o.template;
  return item;
}

export function parseInboxList(raw: unknown): { items: InboxItemModel[] } | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(o, "items")) return null;
  if (!Array.isArray(o.items)) return null;
  const items: InboxItemModel[] = [];
  for (const row of o.items) {
    const item = parseInboxItem(row);
    if (!item) return null;
    items.push(item);
  }
  return { items };
}

export function classifyInboxHttp(
  status: number,
): Exclude<InboxReadView, "loading" | "ready"> {
  if (status === 401 || status === 403) return "unauthorized";
  return "unavailable";
}
