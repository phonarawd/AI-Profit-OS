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
};

export type PeotteokChatDone = {
  trace_id?: string;
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
