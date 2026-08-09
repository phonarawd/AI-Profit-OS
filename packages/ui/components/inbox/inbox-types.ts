export type InboxChannel =
  | "ops"
  | "notice"
  | "campaign"
  | "opportunity"
  | "wallet"
  | "all";

export type InboxItemModel = {
  id: string;
  channel: Exclude<InboxChannel, "all">;
  titleKo: string;
  bodyKo: string;
  href?: string | null;
  createdAt: string;
  readAt?: string | null;
  template?: string;
};
