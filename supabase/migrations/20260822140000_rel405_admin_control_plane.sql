-- REL-405/406/222/224 control-plane tables
-- MIGRATION_FILE_CREATED != MIGRATION_APPLIED
-- PRODUCTION APPLY = REL-701-DB only.

CREATE TABLE IF NOT EXISTS public.admin_control_audit (
  id uuid PRIMARY KEY,
  action text NOT NULL,
  outcome text NOT NULL,
  actor_admin_id uuid,
  actor_role text,
  capability text,
  reason_code text,
  reason text,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  mode text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_control_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_control_audit FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.admin_kill_switches (
  id text PRIMARY KEY,
  engaged boolean NOT NULL DEFAULT false,
  reason text,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_kill_switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_kill_switches FORCE ROW LEVEL SECURITY;
