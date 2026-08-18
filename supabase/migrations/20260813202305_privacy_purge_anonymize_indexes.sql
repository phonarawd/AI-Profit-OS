-- §51.9 delete-account — PrivacyAccountService anonymizes ai_pick_scores/ai_feedback by
-- `UPDATE ... SET user_id = NULL WHERE user_id = $1`, which now runs on every account
-- deletion. Neither table had an index reaching user_id (ai_pick_scores only indexes
-- opportunity_id/is_ai_pick; ai_feedback only indexes ai_log_id), so that predicate was a
-- full sequential scan — material because ai_pick_scores is populated by an automated
-- scoring pipeline (unbounded growth), not just direct user actions.
--
-- Narrow and additive only: no FK/CASCADE policy change, no retained accounting/KYC table
-- touched, no other table indexed "just in case" (PRIVACY_INDEX_MIGRATION_REQUIRED = YES,
-- scoped to exactly these two).

CREATE INDEX IF NOT EXISTS ai_pick_scores_user_id_idx
  ON public.ai_pick_scores (user_id);

CREATE INDEX IF NOT EXISTS ai_feedback_user_id_idx
  ON public.ai_feedback (user_id);
