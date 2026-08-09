/**
 * In-app toast / push fanout dedup — §8.3 · PWA §23.5 pointer.
 * Key = source_event_id (preferred) or code+bucket window.
 */

const seen = new Map<string, number>();
const WINDOW_MS = 8_000;
const MAX_ENTRIES = 200;

export function toastDedupKey(input: {
  sourceEventId?: string | null;
  code: string;
}): string {
  if (input.sourceEventId && input.sourceEventId.length > 0) {
    return `evt:${input.sourceEventId}`;
  }
  return `code:${input.code}:${Math.floor(Date.now() / WINDOW_MS)}`;
}

/** Returns true if this event should be shown (not a duplicate). */
export function shouldShowToast(input: {
  sourceEventId?: string | null;
  code: string;
  now?: number;
}): boolean {
  const now = input.now ?? Date.now();
  const key = toastDedupKey(input);
  const prev = seen.get(key);
  if (prev != null && now - prev < WINDOW_MS) return false;
  seen.set(key, now);
  if (seen.size > MAX_ENTRIES) {
    const oldest = [...seen.entries()].sort((a, b) => a[1] - b[1])[0];
    if (oldest) seen.delete(oldest[0]);
  }
  return true;
}

/** Test helper */
export function clearToastDedup(): void {
  seen.clear();
}
