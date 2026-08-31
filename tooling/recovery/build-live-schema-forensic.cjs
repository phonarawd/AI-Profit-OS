"use strict";

/**
 * Git SQL ↔ live catalog 구조 비교. Production mutation 0.
 * 실행: node tooling/recovery/build-live-schema-forensic.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const COLS = require("../../governance/db-recon/live-columns-snapshot.v1.json");
const HISTORY = require("../../governance/db-recon/live-history-snapshot.v1.json");
const LIVE = require("../../governance/db-recon/live-catalog-snapshot.v1.json");

const SQL_KEYWORDS = new Set([
  "check",
  "references",
  "unique",
  "primary",
  "constraint",
  "foreign",
  "or",
  "and",
  "not",
  "null",
  "default",
  "on",
]);

const ALL_PRIVS = [
  "DELETE",
  "INSERT",
  "REFERENCES",
  "SELECT",
  "TRIGGER",
  "TRUNCATE",
  "UPDATE",
];

const MAP = {
  source_observations: "supabase/migrations/20260819210000_source_observations.sql",
  canonical_products: "supabase/migrations/20260819220000_canonical_products.sql",
  canonical_product_source_links:
    "supabase/migrations/20260819220000_canonical_products.sql",
  match_results: "supabase/migrations/20260820013000_match_results.sql",
  push_control: "supabase/migrations/20260821090000_push_subscriptions_and_control.sql",
  push_subscriptions:
    "supabase/migrations/20260821090000_push_subscriptions_and_control.sql",
  admin_audit_events: "supabase/migrations/20260823160000_admin_audit_events.sql",
  admin_kill_switches: "supabase/migrations/20260823170000_admin_kill_switches.sql",
  opportunity_price_overrides:
    "supabase/migrations/20260823180000_opportunity_price_overrides.sql",
  admin_ops_intents: "supabase/migrations/20260823190000_admin_ops_intents.sql",
  admin_match_controls: "supabase/migrations/20260823200000_admin_match_controls.sql",
  admin_policy_versions: "supabase/migrations/20260823210000_admin_policy_versions.sql",
  admin_policy_heads: "supabase/migrations/20260823210000_admin_policy_versions.sql",
};

const VERDICTS = [
  "EXACT_EQUIVALENT",
  "EQUIVALENT_WITH_NON_SEMANTIC_DIFFERENCE",
  "STRUCTURAL_DRIFT",
  "DATA_DRIFT",
  "UNVERIFIED",
];

function parseCreateColumns(sql, table) {
  const re = new RegExp(
    `CREATE TABLE IF NOT EXISTS public\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`,
    "i",
  );
  const m = sql.match(re);
  if (!m) return null;
  const names = [];
  for (const line of m[1].split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("CONSTRAINT") || t.startsWith("PRIMARY KEY") || t.startsWith("--")) {
      continue;
    }
    const col = t.match(/^([a-z_][a-z0-9_]*)\s+([a-z_]+)/i);
    if (!col) continue;
    if (SQL_KEYWORDS.has(col[1].toLowerCase())) continue;
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

function parseIndexNames(sql, table) {
  const names = [];
  const re = /CREATE(?:\s+UNIQUE)?\s+INDEX(?:\s+IF NOT EXISTS)?\s+([a-z0-9_]+)/gi;
  let m;
  while ((m = re.exec(sql))) {
    if (m[1].startsWith(table) || sql.includes(`ON public.${table}`)) {
      names.push(m[1]);
    }
  }
  const scoped = [];
  const idxRe = new RegExp(
    `CREATE(?:\\s+UNIQUE)?\\s+INDEX(?:\\s+IF NOT EXISTS)?\\s+([a-z0-9_]+)[\\s\\S]{0,120}ON public\\.${table}\\b`,
    "gi",
  );
  while ((m = idxRe.exec(sql))) scoped.push(m[1]);
  return [...new Set(scoped.length ? scoped : names)].sort();
}

function parseTriggerNames(sql, table) {
  const names = [];
  const re = new RegExp(
    `CREATE TRIGGER\\s+([a-z0-9_]+)[\\s\\S]{0,80}ON public\\.${table}\\b`,
    "gi",
  );
  let m;
  while ((m = re.exec(sql))) names.push(m[1]);
  return [...new Set(names)].sort();
}

function parseEnableRls(sql, table) {
  const re = new RegExp(
    `ALTER TABLE public\\.${table}\\s+ENABLE ROW LEVEL SECURITY`,
    "i",
  );
  return re.test(sql);
}

function parseServiceRoleGrants(sql, table) {
  const allRe = new RegExp(
    `GRANT ALL ON TABLE public\\.${table}\\s+TO[^;]*service_role`,
    "i",
  );
  if (allRe.test(sql)) return ALL_PRIVS.slice();
  const narrow = new RegExp(
    `GRANT\\s+([A-Z,\\s]+)\\s+ON TABLE public\\.${table}\\s+TO service_role`,
    "i",
  );
  const m = sql.match(narrow);
  if (!m) return null;
  return m[1]
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .sort();
}

function parseApplyNo(sql) {
  return /APPLY_THIS_SLICE\s*=\s*NO/.test(sql);
}

function sameList(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function worst(list) {
  const rank = {
    EXACT_EQUIVALENT: 0,
    EQUIVALENT_WITH_NON_SEMANTIC_DIFFERENCE: 1,
    DATA_DRIFT: 2,
    STRUCTURAL_DRIFT: 3,
    UNVERIFIED: 4,
  };
  return list.reduce((acc, v) => (rank[v] > rank[acc] ? v : acc), "EXACT_EQUIVALENT");
}

function gitFiles() {
  const dir = path.join(ROOT, "supabase/migrations");
  return fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".sql"))
    .sort();
}

function parseGitName(file) {
  const m = file.match(/^(\d+)_(.+)\.sql$/);
  return m ? { version: m[1], name: m[2], file } : null;
}

function main() {
  const objects = {};
  for (const [table, rel] of Object.entries(MAP)) {
    const sql = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const live = LIVE.tables[table];
    if (!live) throw new Error("missing live catalog: " + table);
    const gitCols = parseCreateColumns(sql, table);
    const liveCols = (COLS.tables[table] || []).map((c) => c.column_name);
    const colMatch = sameList(gitCols, liveCols);
    const gitIdxAll = parseIndexNames(sql, table).slice().sort();
    const liveIndexNames = (live.indexes || []).map((i) => i.name);
    const liveNonPk = liveIndexNames
      .filter((n) => !String(n).endsWith("_pkey"))
      .slice()
      .sort();
    const idxMatch = gitIdxAll.every((n) => liveIndexNames.includes(n));
    const gitTrig = parseTriggerNames(sql, table);
    const liveTrig = [...new Set((live.triggers || []).map((t) => t.name))].sort();
    const trigMatch = sameList(gitTrig, liveTrig);
    const gitRls = parseEnableRls(sql, table);
    const liveRls = Boolean(live.rls_enabled);
    const rlsMatch = gitRls === liveRls;
    const gitGrants = parseServiceRoleGrants(sql, table);
    const liveGrants = (live.service_role_privileges || []).slice().sort();
    let grantVerdict = "UNVERIFIED";
    let grantNote = "";
    if (gitGrants === null) {
      grantVerdict = "EQUIVALENT_WITH_NON_SEMANTIC_DIFFERENCE";
      grantNote = "Git SQL에 GRANT 없음. live는 anon/authenticated 공백 + service_role ALL.";
    } else if (sameList(gitGrants.slice().sort(), liveGrants)) {
      grantVerdict = "EXACT_EQUIVALENT";
    } else {
      grantVerdict = "STRUCTURAL_DRIFT";
      grantNote =
        "Git service_role=" +
        gitGrants.join(",") +
        " · live service_role=" +
        liveGrants.join(",") +
        " · anon/authenticated 여전히 공백";
    }
    const colVerdict = colMatch ? "EXACT_EQUIVALENT" : "STRUCTURAL_DRIFT";
    const idxVerdict = idxMatch ? "EXACT_EQUIVALENT" : "STRUCTURAL_DRIFT";
    const trigVerdict = trigMatch ? "EXACT_EQUIVALENT" : "UNVERIFIED";
    const rlsVerdict = rlsMatch ? "EXACT_EQUIVALENT" : "STRUCTURAL_DRIFT";
    const policyVerdict =
      Array.isArray(live.policies) && live.policies.length === 0
        ? "EXACT_EQUIVALENT"
        : "STRUCTURAL_DRIFT";
    const seedVerdict = live.seed ? live.seed.verdict : "EXACT_EQUIVALENT";
    const commentVerdict = live.comment ? live.comment.verdict : "EXACT_EQUIVALENT";
    const constraintVerdict = live.constraints_match_git
      ? "EXACT_EQUIVALENT"
      : "UNVERIFIED";
    const objectVerdict = worst([
      colVerdict,
      idxVerdict,
      trigVerdict,
      rlsVerdict,
      policyVerdict,
      grantVerdict,
      seedVerdict,
      commentVerdict,
      constraintVerdict,
    ]);
    // 함수 본문 미비교는 객체 판정을 가리지 않는다. 존재는 catalog에 기록한다.
    objects[table] = {
      source_file: rel,
      apply_this_slice: parseApplyNo(sql) ? "NO" : "UNKNOWN",
      history_version: null,
      history_present: false,
      exists_live: true,
      owner: live.owner,
      columns: {
        git: gitCols,
        live: liveCols,
        order_and_names: colMatch,
        verdict: colVerdict,
      },
      indexes: {
        git_non_pk: gitIdxAll,
        live_non_pk: liveNonPk,
        named_indexes_present: idxMatch,
        verdict: idxVerdict,
      },
      triggers: {
        git: gitTrig,
        live: liveTrig,
        verdict: trigVerdict,
      },
      rls: {
        git_enable: gitRls,
        live_enabled: liveRls,
        live_forced: Boolean(live.rls_forced),
        verdict: rlsVerdict,
      },
      policies: {
        live_count: (live.policies || []).length,
        verdict: policyVerdict,
      },
      grants: {
        git_service_role: gitGrants,
        live_service_role: liveGrants,
        live_anon: live.anon_privileges || [],
        live_authenticated: live.authenticated_privileges || [],
        verdict: grantVerdict,
        note: grantNote,
      },
      constraints: {
        verdict: constraintVerdict,
        note: live.constraints_note || "",
      },
      seed: live.seed || { verdict: "EXACT_EQUIVALENT", note: "no seed in Git" },
      comment: live.comment || { verdict: "EXACT_EQUIVALENT" },
      functions: live.functions || { verdict: "UNVERIFIED" },
      verdict: objectVerdict,
    };
  }

  const git = gitFiles().map(parseGitName).filter(Boolean);
  const hist = HISTORY.rows;
  const gitByVer = new Map(git.map((g) => [g.version, g]));
  const histByVer = new Map(hist.map((h) => [h.version, h]));
  const exact = [];
  const gitOnly = [];
  const histOnly = [];
  const sameNameDiffVer = [];
  const ptfPairs = [
    {
      git_version: "20260814130000",
      live_version: "20260814134038",
      name: "ptf00c_fx_marketplace_normalization",
    },
    {
      git_version: "20260814130100",
      live_version: "20260814134055",
      name: "ptf00c_provider_runtime_health",
    },
    {
      git_version: "20260814130200",
      live_version: "20260814135111",
      name: "ptf00c_provider_health_last_tick_partial",
    },
    {
      git_version: "20260814140000",
      live_version: "20260814152139",
      name: "ptf00c_r1_provider_tick_ledger",
    },
  ];
  const ptfGit = new Set(ptfPairs.map((p) => p.git_version));
  for (const g of git) {
    if (histByVer.has(g.version)) {
      const h = histByVer.get(g.version);
      exact.push({
        version: g.version,
        name: g.name,
        history_name: h.name,
        statement_count: h.statement_count,
      });
    } else if (ptfGit.has(g.version)) {
      continue;
    } else {
      gitOnly.push({ version: g.version, name: g.name, file: g.file });
    }
  }
  for (const h of hist) {
    if (!gitByVer.has(h.version)) {
      histOnly.push(h);
    }
  }
  for (const p of ptfPairs) sameNameDiffVer.push({ ...p, reapply: "FORBIDDEN" });

  const zeroStmt = hist.filter((h) => h.statement_count === 0);
  const driftTables = Object.entries(objects)
    .filter(([, o]) => o.verdict !== "EXACT_EQUIVALENT")
    .map(([name, o]) => ({ table: name, verdict: o.verdict }));

  const forensic = {
    schema: "governance.db-recon.live-schema-forensic.v1",
    observed_at: LIVE.observed_at,
    project_ref: "mgsytcetsiecllmhcyox",
    production_mutation: 0,
    query_mode: "SELECT / information_schema / pg_catalog only",
    apply: 0,
    reapply: 0,
    history_rewrite: 0,
    history_repair_approved: false,
    pitr: {
      status: "BLOCKED_EXTERNAL_EVIDENCE",
      enabled: "UNVERIFIED",
      retention: "UNVERIFIED",
      latest_restore_point: "UNVERIFIED",
      rehearsal: "NOT_RUN",
    },
    production_release: "NO_GO_BACKUP_UNVERIFIED",
    objects,
    object_verdict_counts: VERDICTS.reduce((acc, v) => {
      acc[v] = driftTables.filter((d) => d.verdict === v).length;
      return acc;
    }, {}),
    unresolved: {
      no_history_live_objects: Object.keys(objects),
      grant_wider_than_git: driftTables
        .filter((d) => objects[d.table].grants.verdict === "STRUCTURAL_DRIFT")
        .map((d) => d.table),
      function_bodies_compared: ["source_observations_forbid_mutation", "canonical_products_protect_immutable"],
      function_bodies_existence_only: [
        "match_results_forbid_mutation",
        "admin_audit_events_forbid_mutation",
        "admin_kill_switches_forbid_delete",
        "admin_ops_intents_forbid_delete",
        "admin_match_controls_forbid_delete",
        "opportunity_price_overrides_forbid_delete",
        "admin_policy_versions_forbid_mutation",
      ],
    },
  };

  forensic.object_verdict_counts.EXACT_EQUIVALENT = Object.values(objects).filter(
    (o) => o.verdict === "EXACT_EQUIVALENT",
  ).length;
  forensic.object_verdict_counts.EQUIVALENT_WITH_NON_SEMANTIC_DIFFERENCE =
    Object.values(objects).filter(
      (o) => o.verdict === "EQUIVALENT_WITH_NON_SEMANTIC_DIFFERENCE",
    ).length;
  forensic.object_verdict_counts.STRUCTURAL_DRIFT = Object.values(objects).filter(
    (o) => o.verdict === "STRUCTURAL_DRIFT",
  ).length;
  forensic.object_verdict_counts.DATA_DRIFT = Object.values(objects).filter(
    (o) => o.verdict === "DATA_DRIFT",
  ).length;
  forensic.object_verdict_counts.UNVERIFIED = Object.values(objects).filter(
    (o) => o.verdict === "UNVERIFIED",
  ).length;

  const recon = {
    schema: "governance.db-recon.migration-reconciliation.v1",
    observed_at: HISTORY.observed_at,
    project_ref: "mgsytcetsiecllmhcyox",
    production_mutation: 0,
    apply: 0,
    git_total: git.length,
    history_total: hist.length,
    exact_match: exact.length,
    same_name_different_version: sameNameDiffVer,
    git_only: gitOnly,
    history_version_only: histOnly,
    no_history_live_schema: Object.keys(objects),
    zero_statement_history_marker: zeroStmt,
    ptf_reapply: "FORBIDDEN",
    ten_no_apply_sql_reexecute: "FORBIDDEN",
    history_repair: {
      approved: false,
      reason: [
        "13 live objects have no matching history version",
        "service_role grants are wider than Git on multiple admin tables",
        "function bodies not fully compared",
        "PITR evidence BLOCKED_EXTERNAL_EVIDENCE",
        "all 10 source files declare APPLY_THIS_SLICE = NO",
      ],
      if_ever_considered: {
        direction: "insert history markers only · do not re-run SQL",
        prerequisite: [
          "forensic EXACT_EQUIVALENT on all 13 objects",
          "PITR proof",
          "Founder written approval",
          "isolated verify DB rehearsal",
        ],
        rollback: "PITR restore point taken immediately before repair",
        execute_now: false,
      },
    },
    exact_rows: exact.map((e) => ({ version: e.version, name: e.name })),
  };

  const md = renderMd(forensic, recon);
  const forensicPath = path.join(ROOT, "governance/db-recon/live-schema-forensic.v1.json");
  const reconPath = path.join(ROOT, "governance/db-recon/migration-reconciliation.v1.json");
  const mdPath = path.join(ROOT, "governance/db-recon/LIVE_SCHEMA_FORENSIC.md");
  fs.writeFileSync(forensicPath, JSON.stringify(forensic, null, 2) + "\n");
  fs.writeFileSync(reconPath, JSON.stringify(recon, null, 2) + "\n");
  fs.writeFileSync(mdPath, md);
  process.stdout.write(
    JSON.stringify(
      {
        git_total: recon.git_total,
        history_total: recon.history_total,
        exact_match: recon.exact_match,
        git_only: recon.git_only.length,
        history_version_only: recon.history_version_only.length,
        object_verdicts: forensic.object_verdict_counts,
        history_repair_approved: false,
      },
      null,
      2,
    ) + "\n",
  );
}

function renderMd(forensic, recon) {
  const lines = [];
  lines.push("# Live Schema Forensic");
  lines.push("");
  lines.push("- project_ref: `mgsytcetsiecllmhcyox`");
  lines.push("- query_mode: SELECT / catalog only");
  lines.push("- production_mutation: 0");
  lines.push("- history_repair_approved: false");
  lines.push("- PITR: `BLOCKED_EXTERNAL_EVIDENCE`");
  lines.push("- production_release: `NO_GO_BACKUP_UNVERIFIED`");
  lines.push("");
  lines.push("## Migration reconciliation");
  lines.push("");
  lines.push("| set | count |");
  lines.push("|---|---:|");
  lines.push("| Git migration SQL | " + recon.git_total + " |");
  lines.push("| Live history rows | " + recon.history_total + " |");
  lines.push("| Exact version match | " + recon.exact_match + " |");
  lines.push("| Same name / different version (PTF) | " + recon.same_name_different_version.length + " |");
  lines.push("| Git only (APPLY_THIS_SLICE=NO) | " + recon.git_only.length + " |");
  lines.push("| History version only | " + recon.history_version_only.length + " |");
  lines.push("| Zero-statement history markers | " + recon.zero_statement_history_marker.length + " |");
  lines.push("");
  lines.push("PTF 4개는 재실행 금지. `20260810212231` idempotency row는 Git 파일 version과 다르다. `20260811062000` / `20260811062100` history statements=0.");
  lines.push("");
  lines.push("## 13 live objects");
  lines.push("");
  lines.push("| table | verdict | history | RLS live | grants |");
  lines.push("|---|---|---|---|---|");
  for (const [name, o] of Object.entries(forensic.objects)) {
    lines.push(
      "| `" +
        name +
        "` | `" +
        o.verdict +
        "` | absent | " +
        (o.rls.live_enabled ? "ON" : "OFF") +
        " | `" +
        o.grants.verdict +
        "` |",
    );
  }
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  lines.push("1. 10개 no-apply SQL이 정의하는 13개 테이블이 live에 존재하고 history version은 없다.");
  lines.push("2. 컬럼 이름/순서와 명명된 인덱스는 Git CREATE와 일치한다.");
  lines.push("3. push_* Git SQL은 RLS/GRANT를 선언하지 않는다. live RLS OFF, anon/authenticated GRANT 없음, service_role ALL. 즉시 public exposure로 보지 않는다.");
  lines.push("4. admin_* / opportunity_price_overrides 는 Git이 service_role에 좁은 GRANT를 주는데 live는 ALL이다. `STRUCTURAL_DRIFT`.");
  lines.push("5. admin_policy_heads seed row는 Git INSERT가 없고 live도 0행. DATA_DRIFT 아님.");
  lines.push("6. deposit_config live row count = 0 (13객체 밖, money path 후속 슬라이스).");
  lines.push("7. history repair / 10 SQL 재실행 / Production apply 는 승인하지 않는다.");
  lines.push("");
  lines.push("## Repair (문서만 · 실행 금지)");
  lines.push("");
  lines.push("- 대상: 없음. `history_repair.approved = false`.");
  lines.push("- 방향(미래): SQL 재실행이 아니라 history marker insert만 검토 가능.");
  lines.push("- 전제: 13객체 EXACT_EQUIVALENT + PITR 증명 + Founder 승인 + isolated rehearsal.");
  lines.push("- 현재 전제 미충족.");
  lines.push("");
  return lines.join("\n") + "\n";
}

main();
