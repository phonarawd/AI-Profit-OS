-- RLS ON for all public app tables · Nest service DB role bypasses RLS
-- anon/authenticated: no policies ⇒ Data API deny-by-default
-- Ledger immutability: entries/journals no UPDATE/DELETE; balance only via posting flag

-- ---------- Ledger posting guards ----------

CREATE OR REPLACE FUNCTION public.ledger_require_posting_flag()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('app.ledger_posting', true), '') <> 'on' THEN
    RAISE EXCEPTION 'ledger_accounts.balance_usdt direct UPDATE forbidden · set app.ledger_posting=on in posting TX'
      USING ERRCODE = '42501';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ledger_accounts_balance_guard
  BEFORE UPDATE OF balance_usdt ON public.ledger_accounts
  FOR EACH ROW
  WHEN (OLD.balance_usdt IS DISTINCT FROM NEW.balance_usdt)
  EXECUTE FUNCTION public.ledger_require_posting_flag();

CREATE OR REPLACE FUNCTION public.ledger_forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION '% is immutable · INSERT only', TG_TABLE_NAME
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER ledger_journals_immutable
  BEFORE UPDATE OR DELETE ON public.ledger_journals
  FOR EACH ROW
  EXECUTE FUNCTION public.ledger_forbid_mutation();

CREATE TRIGGER ledger_entries_immutable
  BEFORE UPDATE OR DELETE ON public.ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.ledger_forbid_mutation();

-- ---------- Enable RLS on all app tables ----------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ux_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_capability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.deposit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.krw_deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usdt_deposit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_intents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_opportunity_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_match_policy_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participate_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_embeddings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.referral_program_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tendency_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_rbac ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners too (defense in depth; service_role still bypasses)
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_journals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_intents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.krw_deposit_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.usdt_deposit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.memory_embeddings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_rbac FORCE ROW LEVEL SECURITY;

-- Revoke Data API defaults from anon/authenticated (Nest JWT path only)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO postgres, service_role;

COMMENT ON SCHEMA public IS
  'AI Profit OS / 퍼뜩 app SoT · Nest JWT Auth · Supabase Auth SDK unused · Dashboard DDL forbidden';
