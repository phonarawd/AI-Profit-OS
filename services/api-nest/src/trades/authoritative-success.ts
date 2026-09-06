/**
 * A5 — compareReady / timer / fixture cannot pay profit.
 * Payment requires an unconsumed authoritative event bound to the trade id.
 */

export type AuthoritativePayoutPlan =
  | { action: "pay" }
  | { action: "wait" }
  | { action: "timeout" }
  | { action: "follow_rule" };

export function planAuthoritativePayout(input: {
  ruleCode: string;
  hasOpenAuthoritativeEvent: boolean;
  nowMs: number;
  hardDeadlineMs: number;
}): AuthoritativePayoutPlan {
  if (input.ruleCode !== "MATCH_SUCCESS") {
    return { action: "follow_rule" };
  }
  if (input.hasOpenAuthoritativeEvent) {
    return { action: "pay" };
  }
  if (input.nowMs >= input.hardDeadlineMs) {
    return { action: "timeout" };
  }
  return { action: "wait" };
}

export const PEEK_OPEN_CONFIRMATION_SQL = `
SELECT event_id
  FROM public.trade_execution_confirmations
 WHERE trade_id = $1::uuid
   AND consumed_at IS NULL
 ORDER BY ingested_at ASC
 LIMIT 1
`;

export const CONSUME_CONFIRMATION_SQL = `
UPDATE public.trade_execution_confirmations AS t
   SET consumed_at = now()
 WHERE t.event_id = (
   SELECT c.event_id
     FROM public.trade_execution_confirmations AS c
    WHERE c.trade_id = $1::uuid
      AND c.consumed_at IS NULL
    ORDER BY c.ingested_at ASC
    LIMIT 1
    FOR UPDATE
 )
 RETURNING t.event_id
`;

export const INGEST_CONFIRMATION_SQL = `
INSERT INTO public.trade_execution_confirmations (event_id, trade_id)
VALUES ($1, $2::uuid)
`;
