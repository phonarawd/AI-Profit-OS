"use strict";

/**
 * True staging topology readiness.
 *
 * READ-ONLY evaluator only. It never creates Render/Supabase resources and
 * never mutates Production.
 *
 * v2 models Render's service-scoped environment correctly: a dedicated
 * staging web service may not expose a Render Environment ID. In that case,
 * service-scoped isolation must be explicit. We additionally require:
 * - autoDeploy OFF
 * - exact candidate SHA on the live staging service
 * - DB and Redis runtime health
 * - isolated Supabase ref, zero customer data, and schema parity
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

function autoDeployIsOff(value) {
  if (value === false) return true;
  const v = String(value == null ? "" : value).trim().toLowerCase();
  return v === "no" || v === "off" || v === "false";
}

function evaluateStagingTopology(snapshot) {
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const production = s.production && typeof s.production === "object" ? s.production : {};
  const staging = s.staging && typeof s.staging === "object" ? s.staging : {};
  const prodRender = production.render && typeof production.render === "object"
    ? production.render : null;
  const stageRender = staging.render && typeof staging.render === "object"
    ? staging.render : null;
  const prodSupabase = production.supabase && typeof production.supabase === "object"
    ? production.supabase : null;
  const stageSupabase = staging.supabase && typeof staging.supabase === "object"
    ? staging.supabase : null;

  const blockers = [];

  if (!prodRender) {
    blockers.push("production_render_missing");
  } else {
    if (!nonEmpty(prodRender.service_id)) blockers.push("production_render_service_id_missing");
    if (!nonEmpty(prodRender.environment_id)) blockers.push("production_render_environment_id_missing");
    if (!normalizeUrl(prodRender.url)) blockers.push("production_render_url_invalid");
  }

  if (!stageRender) {
    blockers.push("render_staging_missing");
  } else if (prodRender) {
    if (!nonEmpty(stageRender.service_id)) blockers.push("render_staging_service_id_missing");
    if (!nonEmpty(stageRender.supabase_project_ref)) {
      blockers.push("render_staging_db_binding_missing");
    }

    if (stageRender.service_id === prodRender.service_id) {
      blockers.push("render_staging_reuses_production_service");
    }

    if (nonEmpty(stageRender.environment_id)) {
      if (
        nonEmpty(prodRender.environment_id) &&
        stageRender.environment_id === prodRender.environment_id
      ) {
        blockers.push("render_staging_reuses_production_environment");
      }
    } else if (String(stageRender.environment_scope || "") !== "service-scoped") {
      blockers.push("render_staging_environment_scope_unproven");
    }

    const prodUrl = normalizeUrl(prodRender.url);
    const stageUrl = normalizeUrl(stageRender.url);
    if (!stageUrl) blockers.push("render_staging_url_invalid");
    if (prodUrl && stageUrl && prodUrl === stageUrl) {
      blockers.push("render_staging_reuses_production_url");
    }

    const branch = String(stageRender.branch || "").trim();
    if (!branch) blockers.push("render_staging_branch_missing");
    if (branch === "main") blockers.push("render_staging_tracks_main");

    if (!nonEmpty(stageRender.kind)) {
      blockers.push("render_staging_kind_missing");
    } else if (stageRender.kind !== "web_service") {
      blockers.push("render_staging_not_web_service");
    }

    if (!autoDeployIsOff(stageRender.autoDeploy)) {
      blockers.push("render_staging_autodeploy_not_off");
    }

    if (!nonEmpty(stageRender.source_sha)) {
      blockers.push("render_staging_source_sha_missing");
    }

    const runtime = stageRender.runtime_health &&
      typeof stageRender.runtime_health === "object"
      ? stageRender.runtime_health : null;
    if (!runtime) {
      blockers.push("render_staging_runtime_health_missing");
    } else {
      for (const key of [
        "db_configured",
        "db_ok",
        "redis_configured",
        "redis_ok",
        "warnings_empty",
      ]) {
        if (runtime[key] !== true) blockers.push("render_staging_runtime_" + key + "_not_true");
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
    if (stageSupabase.schema_parity_with_production !== true) {
      blockers.push("supabase_staging_schema_parity_not_proven");
    }

    const prodCount = Number(prodSupabase.public_table_count);
    const stageCount = Number(stageSupabase.public_table_count);
    if (
      Number.isInteger(prodCount) &&
      Number.isInteger(stageCount) &&
      prodCount !== stageCount
    ) {
      blockers.push("supabase_staging_public_table_count_mismatch");
    }
  }

  if (stageRender && stageSupabase) {
    if (
      nonEmpty(stageRender.supabase_project_ref) &&
      nonEmpty(stageSupabase.project_ref) &&
      stageRender.supabase_project_ref !== stageSupabase.project_ref
    ) {
      blockers.push("render_staging_db_binding_mismatch");
    }
  }

  const cloudflare = s.cloudflare_preview && typeof s.cloudflare_preview === "object"
    ? s.cloudflare_preview : null;
  let frontendStagingStatus = "NOT_RECORDED";
  if (cloudflare) {
    if (cloudflare.uses_production_api === true || cloudflare.uses_production_db === true) {
      blockers.push("cloudflare_preview_uses_production");
    }

    const dedicated =
      cloudflare.dedicated_staging_api === true &&
      cloudflare.dedicated_staging_db === true;
    if (cloudflare.required_for_current_topology === true && !dedicated) {
      blockers.push("cloudflare_preview_not_staging");
    }
    frontendStagingStatus = dedicated ? "BOUND_TO_ISOLATED_STAGING" : "PENDING_NOT_CORE_TOPOLOGY";
  }

  const ready = blockers.length === 0;
  const missingInfra = blockers.some((b) =>
    /_missing$|reuses_production|tracks_main|customer_data_not_proven|db_binding_|environment_scope_unproven|autodeploy_not_off|runtime_|schema_parity_not_proven|table_count_mismatch|uses_production/.test(b),
  );

  return {
    schema: "staging-topology-readiness.v2",
    ready,
    status: ready ? "READY" : "NOT_READY",
    classification: ready
      ? "TRUE_ISOLATED_STAGING"
      : missingInfra
        ? "BLOCKED_EXTERNAL_ACTION"
        : "NOT_READY",
    verdict: ready ? "STAGING_TOPOLOGY=READY" : "STAGING_TOPOLOGY=NOT_READY",
    blockers,
    frontend_staging_status: frontendStagingStatus,
    runtime_source_sha: stageRender && nonEmpty(stageRender.source_sha)
      ? stageRender.source_sha
      : null,
    exact_final_rc_binding: "SEPARATE_GATE",
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
    process.stderr.write("[staging-topology-readiness] FAIL_CLOSED:snapshot_invalid\n");
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
  autoDeployIsOff,
  evaluateStagingTopology,
  parseArgs,
};
