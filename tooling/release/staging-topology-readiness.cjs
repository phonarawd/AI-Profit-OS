"use strict";

/**
 * True staging topology readiness.
 *
 * READ-ONLY evaluator only. It never creates Render/Supabase resources and
 * never mutates Production. The input snapshot must come from provider
 * read-only APIs or a Founder-recorded evidence file.
 *
 * Required topology:
 * - dedicated non-production Render API service
 * - Render staging service is distinct from Production service/environment/URL
 * - staging API service does not track main
 * - dedicated Supabase branch/project ref distinct from Production
 * - staging DB explicitly contains no copied customer data
 *
 * A Cloudflare preview that points at Production API/DB is NOT staging.
 */

const fs = require("node:fs");
const path = require("node:path");

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
    return u.origin.toLowerCase();
  } catch {
    return "";
  }
}

function evaluateStagingTopology(snapshot) {
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const production = s.production && typeof s.production === "object" ? s.production : {};
  const staging = s.staging && typeof s.staging === "object" ? s.staging : {};
  const prodRender =
    production.render && typeof production.render === "object"
      ? production.render
      : null;
  const stageRender =
    staging.render && typeof staging.render === "object"
      ? staging.render
      : null;
  const prodSupabase =
    production.supabase && typeof production.supabase === "object"
      ? production.supabase
      : null;
  const stageSupabase =
    staging.supabase && typeof staging.supabase === "object"
      ? staging.supabase
      : null;

  const blockers = [];

  if (!prodRender) {
    blockers.push("production_render_missing");
  } else {
    if (!nonEmpty(prodRender.service_id)) {
      blockers.push("production_render_service_id_missing");
    }
    if (!nonEmpty(prodRender.environment_id)) {
      blockers.push("production_render_environment_id_missing");
    }
    if (!normalizeUrl(prodRender.url)) {
      blockers.push("production_render_url_invalid");
    }
  }

  if (!stageRender) {
    blockers.push("render_staging_missing");
  } else {
    if (!nonEmpty(stageRender.service_id)) {
      blockers.push("render_staging_service_id_missing");
    }
    if (!nonEmpty(stageRender.environment_id)) {
      blockers.push("render_staging_environment_id_missing");
    }
    const stageUrl = normalizeUrl(stageRender.url);
    if (!stageUrl) blockers.push("render_staging_url_invalid");

    const branch = String(stageRender.branch || "").trim();
    if (!branch) blockers.push("render_staging_branch_missing");
    if (branch === "main") blockers.push("render_staging_tracks_main");

    if (stageRender.kind !== "web_service") {
      blockers.push("render_staging_not_web_service");
    }
    if (!nonEmpty(stageRender.supabase_project_ref)) {
      blockers.push("render_staging_db_binding_missing");
    }

    if (prodRender) {
      if (
        nonEmpty(stageRender.service_id) &&
        nonEmpty(prodRender.service_id) &&
        stageRender.service_id === prodRender.service_id
      ) {
        blockers.push("render_staging_reuses_production_service");
      }
      if (
        nonEmpty(stageRender.environment_id) &&
        nonEmpty(prodRender.environment_id) &&
        stageRender.environment_id === prodRender.environment_id
      ) {
        blockers.push("render_staging_reuses_production_environment");
      }
      const prodUrl = normalizeUrl(prodRender.url);
      if (prodUrl && stageUrl && prodUrl === stageUrl) {
        blockers.push("render_staging_reuses_production_url");
      }
    }
  }

  if (!prodSupabase || !nonEmpty(prodSupabase.project_ref)) {
    blockers.push("production_supabase_ref_missing");
  }
  if (!stageSupabase) {
    blockers.push("supabase_staging_missing");
  } else if (prodSupabase && nonEmpty(prodSupabase.project_ref)) {
    if (!nonEmpty(stageSupabase.project_ref)) {
      blockers.push("supabase_staging_ref_missing");
    } else if (stageSupabase.project_ref === prodSupabase.project_ref) {
      blockers.push("supabase_staging_reuses_production_ref");
    }
    if (
      nonEmpty(stageSupabase.parent_project_ref) &&
      stageSupabase.parent_project_ref !== prodSupabase.project_ref
    ) {
      blockers.push("supabase_staging_parent_mismatch");
    }
    if (stageSupabase.customer_data !== false) {
      blockers.push("supabase_staging_customer_data_not_proven_zero");
    }
    if (stageSupabase.ready !== true) {
      blockers.push("supabase_staging_not_ready");
    }
  }

  if (
    stageRender &&
    stageSupabase &&
    nonEmpty(stageRender.supabase_project_ref) &&
    nonEmpty(stageSupabase.project_ref) &&
    stageRender.supabase_project_ref !== stageSupabase.project_ref
  ) {
    blockers.push("render_staging_db_binding_mismatch");
  }

  return {
    schema: "staging-topology-readiness.v1",
    ready: blockers.length === 0,
    blockers,
    production_mutation: 0,
    create_resources: false,
    staging_must_be_distinct: true,
    production_as_staging_forbidden: true,
  };
}

function parseArgs(argv) {
  const out = { input: "" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--input") out.input = argv[i + 1] || "";
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args.input) {
    process.stderr.write(
      "usage: staging-topology-readiness.cjs --input <provider-readonly-snapshot.json>\n",
    );
    process.exit(2);
  }
  let snapshot;
  try {
    snapshot = JSON.parse(fs.readFileSync(path.resolve(args.input), "utf8"));
  } catch {
    process.stderr.write(
      "[staging-topology-readiness] FAIL_CLOSED:snapshot_invalid\n",
    );
    process.exit(1);
  }
  const result = evaluateStagingTopology(snapshot);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (!result.ready) process.exit(1);
}

if (require.main === module) main(process.argv);

module.exports = {
  nonEmpty,
  normalizeUrl,
  evaluateStagingTopology,
  parseArgs,
};
