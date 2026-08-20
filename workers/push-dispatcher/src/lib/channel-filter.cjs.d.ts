export const AUTO_PUSH_CHANNELS: readonly ["notice", "campaign", "opportunity"];
export function isAutoPushChannel(channel: unknown): boolean;
export function shouldAllowPref(
  prefs: Record<string, unknown> | null | undefined,
  channel: unknown,
): boolean;
export function filterAutoPush(
  prefs: Record<string, unknown> | null | undefined,
  channel: unknown,
): { allowed: boolean; status: string; enqueue: boolean };
export function applyPlanChannelFilter(input: {
  channelAllowed?: boolean;
  prefs?: Record<string, unknown>;
  channel?: string;
}): { status: string; sent: number; enqueue: boolean } | null;
