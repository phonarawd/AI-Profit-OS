-- STAGING / NON-PRODUCTION ONLY
-- READ_ONLY_VERIFY = YES · PRODUCTION_MUTATION = 0
-- Run before hardening, after hardening, and after rollback rehearsal.
-- The result is evidence; this script performs no DDL/DML.

WITH table_state AS (
  SELECT jsonb_object_agg(
    c.relname,
    jsonb_build_object(
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'service_role', COALESCE(priv.privileges, '[]'::jsonb),
      'policies', COALESCE(pol.policies, '[]'::jsonb)
    )
  ) AS tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(g.privilege_type ORDER BY g.privilege_type) AS privileges
    FROM information_schema.role_table_grants g
    WHERE g.table_schema = 'public'
      AND g.table_name = c.relname
      AND g.grantee = 'service_role'
  ) priv ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', p.policyname,
        'roles', to_jsonb(p.roles),
        'cmd', p.cmd,
        'qual', p.qual,
        'with_check', p.with_check
      )
      ORDER BY p.policyname
    ) AS policies
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = c.relname
  ) pol ON true
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN ('admin_audit_events', 'push_control', 'push_subscriptions')
),
default_acl_state AS (
  SELECT COALESCE(jsonb_object_agg(owner, to_jsonb(grantees)), '{}'::jsonb)
    AS default_acl_public_tables
  FROM (
    SELECT
      pg_get_userbyid(d.defaclrole) AS owner,
      array_agg(
        DISTINCT CASE
          WHEN x.grantee = 0 THEN 'PUBLIC'
          ELSE pg_get_userbyid(x.grantee)
        END
        ORDER BY CASE
          WHEN x.grantee = 0 THEN 'PUBLIC'
          ELSE pg_get_userbyid(x.grantee)
        END
      ) AS grantees
    FROM pg_default_acl d
    JOIN pg_namespace n ON n.oid = d.defaclnamespace
    CROSS JOIN LATERAL aclexplode(d.defaclacl) x
    WHERE n.nspname = 'public'
      AND d.defaclobjtype = 'r'
    GROUP BY d.defaclrole
  ) q
),
truncate_guard AS (
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'admin_audit_events'
      AND t.tgname = 'admin_audit_events_forbid_truncate'
      AND NOT t.tgisinternal
  ) AS admin_audit_truncate_guard
)
SELECT jsonb_build_object(
  'tables', COALESCE((SELECT tables FROM table_state), '{}'::jsonb),
  'default_acl_public_tables',
    COALESCE((SELECT default_acl_public_tables FROM default_acl_state), '{}'::jsonb),
  'admin_audit_truncate_guard',
    COALESCE((SELECT admin_audit_truncate_guard FROM truncate_guard), false)
) AS db_hardening_snapshot;
