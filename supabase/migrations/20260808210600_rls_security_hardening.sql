-- Advisor hardening · Nest-only EXECUTE · immutable search_path on ledger guards

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

CREATE OR REPLACE FUNCTION public.provision_user_bucket_accounts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ledger_accounts (code, owner_type, owner_user_id, account_kind, bucket)
  VALUES
    ('USER:' || p_user_id::text || ':principal', 'user', p_user_id, 'user_bucket', 'principal'),
    ('USER:' || p_user_id::text || ':profit', 'user', p_user_id, 'user_bucket', 'profit'),
    ('USER:' || p_user_id::text || ':locked', 'user', p_user_id, 'user_bucket', 'locked'),
    ('USER:' || p_user_id::text || ':practice', 'user', p_user_id, 'user_bucket', 'practice')
  ON CONFLICT (owner_user_id, bucket) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_user_bucket_accounts(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_user_bucket_accounts(uuid) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.ledger_require_posting_flag() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_forbid_mutation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ledger_require_posting_flag() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.ledger_forbid_mutation() TO postgres, service_role;
