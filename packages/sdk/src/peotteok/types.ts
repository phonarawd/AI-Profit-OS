/** Engine §47.15 · Nest CoachController SSE contract */

export type PeotteokLane = "P" | "G" | "S";

export type PeotteokToneBand = "young" | "mid" | "senior";

export type PeotteokChip = {
  id: string;
  labelKey: string;
  prompt: string;
  tools?: string[];
  priority?: number;
  deepLink?: string;
};

export type PeotteokChipsResponse = {
  chips: PeotteokChip[];
  toneBand?: PeotteokToneBand | string | null;
};

export type PeotteokChatMeta = {
  lane?: PeotteokLane;
  intent?: string;
  answer_path?: string;
  tools_called?: string[];
  /** Engine §47.16.2 — echoes the conversation's id (server-issued if omitted on request) */
  conversation_id?: string;
};

export type PeotteokChatDone = {
  trace_id?: string;
  /** Engine §47.16.2 — pass back on the next request body to keep bounded recent history */
  conversation_id?: string;
  lane?: PeotteokLane;
  answer_path?: string;
  deep_link?: string | null;
  degraded?: boolean;
  answer_text?: string;
  provider_effective?: string;
};

export type PeotteokMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  lane?: PeotteokLane;
  deepLink?: string | null;
  degraded?: boolean;
  streaming?: boolean;
};
