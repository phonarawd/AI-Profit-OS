"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const LIVE = require("../../governance/db-recon/live-columns-snapshot.v1.json");

const MAP = {
  source_observations: "supabase/migrations/20260819210000_source_observations.sql",
  canonical_products: "supabase/migrations/20260819220000_canonical_products.sql",
  canonical_product_source_links: "supabase/migrations/20260819220000_canonical_products.sql",
  match_results: "supabase/migrations/20260820013000_match_results.sql",
  push_control: "supabase/migrations/20260821090000_push_subscriptions_and_control.sql",
  push_subscriptions: "supabase/migrations/20260821090000_push_subscriptions_and_control.sql",
  admin_audit_events: "supabase/migrations/20260823160000_admin_audit_events.sql",
  admin_kill_switches: "supabase/migrations/20260823170000_admin_kill_switches.sql",
  opportunity_price_overrides: "supabase/migrations/20260823180000_opportunity_price_overrides.sql",
  admin_ops_intents: "supabase/migrations/20260823190000_admin_ops_intents.sql",
  admin_match_controls: "supabase/migrations/20260823200000_admin_match_controls.sql",
  admin_policy_versions: "supabase/migrations/20260823210000_admin_policy_versions.sql",
  admin_policy_heads: "supabase/migrations/20260823210000_admin_policy_versions.sql",
};

function parseCreateColumns(sql, table) {
  const re = new RegExp(
    `CREATE TABLE IF NOT EXISTS public\\.${table}\\s*\\((\\s*[\\s\\S]*?)\\n\\);`,
    "i",
  );
  const m = sql.match(re);
  if (!m) return null;
  const body = m[1];
  const names = [];
  for (const line of body.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("CONSTRAINT") || t.startsWith("PRIMARY KEY") || t.startsWith("--")) continue;
    const col = t.match(/^([a-z_][a-z0-9_]*)\s+([a-z_]+)/i);
    if (!col) continue;
    if (
      /^(check|references|unique|primary|constraint|foreign|or|and|not|null|default|on)$/i.test(
        col[1],
      )
    ) {
      continue;
    }
    if (
      !/^(uuid|text|boolean|bool|integer|int|bigint|bigserial|serial|jsonb|timestamptz|numeric|int4|int8)$/i.test(
        col[2],
      )
    ) {
      continue;
    }
    names.push(col[1]);
  }
  return names;
}

function main() {
  const out = {};
  const fails = [];
  for (const [table, rel] of Object.entries(MAP)) {
    const sql = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const gitCols = parseCreateColumns(sql, table);
    const liveCols = (LIVE.tables[table] || []).map((c) => c.column_name);
    const same =
      gitCols &&
      gitCols.length === liveCols.length &&
      gitCols.every((n, i) => n === liveCols[i]);
    out[table] = {
      source_file: rel,
      git_columns: gitCols,
      live_columns: liveCols,
      column_order_match: Boolean(same),
      parse_ok: Array.isArray(gitCols),
    };
    if (!same) fails.push(table);
  }
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  if (fails.length) {
    process.stderr.write("column mismatch: " + fails.join(",") + "\n");
    process.exit(1);
  }
}

main();
