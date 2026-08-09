-- Engine §0.9 E-R2 · active execution_policies Day-1 bootstrap
-- matchStrictness=standard · Soft60/Hard90 presentation (code SSOT) · feed.nearMissCapUsdt
-- Insert-only when no active row · Admin PUT path must never be overwritten by this seed
-- Bootstrap admin sentinel = nil UUID (not a real admin user)

INSERT INTO public.execution_policies (
  is_active,
  match_strictness,
  min_profit_usdt,
  stale_allowance_sec,
  max_rematch_count,
  retry_wait_sec,
  slippage_bound_bps,
  daily_user_match_cap,
  daily_opp_slots_default,
  auto_cancel_on_shortfall,
  membership_band_overlay_enabled,
  feed,
  presentation,
  updated_by_admin_id
)
SELECT
  true,
  'standard',
  5,
  3,
  2,
  4,
  50,
  5,
  12,
  true,
  false,
  '{"nearMissCapUsdt":"50"}'::jsonb,
  '{
    "durationSecMin": 8,
    "durationSecMax": 15,
    "steps": [
      "product_check",
      "price_compare",
      "matching",
      "settle_prep",
      "credit"
    ]
  }'::jsonb,
  '00000000-0000-0000-0000-000000000000'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM public.execution_policies WHERE is_active = true
);

COMMENT ON TABLE public.execution_policies IS
  'Admin singleton-ish active policy · Day-1 seed/ensure = standard + Soft60/Hard90 presentation + feed.nearMissCapUsdt · successRatePercent FORBIDDEN · Admin PUT owns updates';
