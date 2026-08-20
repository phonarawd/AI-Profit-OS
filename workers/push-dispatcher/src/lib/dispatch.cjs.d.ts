export function isPushEnabled(value: unknown): boolean;
export function normalizeSubscription(raw: unknown): {
  endpoint: string;
  p256dh: string;
  auth: string;
} | null;
export function dispatchPush(
  input: Record<string, unknown>,
  hooks?: { sendWebPush?: (input: unknown) => { ok: boolean } },
): {
  ok: boolean;
  status: string;
  sent: number;
  sendAttempted: boolean;
  wouldSend?: number;
};
export function handleDispatcherRequest(
  request: Request,
  env: Record<string, string | undefined>,
  hooks?: { sendWebPush?: (input: unknown) => { ok: boolean } },
): Promise<{ statusCode: number; body: Record<string, unknown> }>;
export function planEmit(input: {
  pushEnabled: boolean;
  subscriptionCount: number;
  channelAllowed?: boolean;
  channel?: string;
  prefs?: Record<string, unknown>;
}): { status: string; sent: number; enqueue: boolean };
