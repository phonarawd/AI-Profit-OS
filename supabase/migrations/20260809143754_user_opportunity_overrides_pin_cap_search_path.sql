-- Security hardening: pin the trigger function's search_path (Supabase advisor: function_search_path_mutable).
-- Behavior-identical; brings this function in line with the other 4 public functions
-- (ledger_forbid_mutation / ledger_require_posting_flag / provision_user_bucket_accounts /
-- users_stage_a_identity_ok), which already set search_path=public.
ALTER FUNCTION public.user_opportunity_overrides_pin_cap() SET search_path = public;
