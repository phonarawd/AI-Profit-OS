"use strict";

/**
 * Render Production API promotion readiness.
 * READ-ONLY evaluator only. It never calls Render and never mutates Production.
 *
 * preflight:
 * - exact accepted SHA
 * - production service must remain on canonical main branch
 * - automatic commit deployment must be OFF so accepted-SHA promotion is the sole authority
 *
 * postflight:
 * - all preflight conditions
 * - live deploy commit SHA must equal the accepted SHA exactly
 */
const fs = require("node:fs");
const path = require("node:path");

const LAST_CONFIRMED_PRODUCTION_RENDER = Object.freeze({
  identity_class: "LAST_CONFIRMED_IDENTITY",
  live_status: "UNCONFIRMED",
  service_id: "srv-da5r1tqjobas73fl16dg",
  environment_id: "evm-da5r1tjbc2fs73a0b7hg",
  name: "AI-Profit-OS",
  repo: "https://github.com/phonarawd/AI-Profit-OS",
  url: "https://ai-profit-os.onrender.com",
  type: "web_service",
});
const CANONICAL_PRODUCTION_RENDER = LAST_CONFIRMED_PRODUCTION_RENDER;

function isFullSha(value) {
  return /^[0-9a-f]{40}$/i.test(String(value || ""));
}

function isServiceId(value) {
  return /^srv-[a-z0-9]+$/i.test(String(value || ""));
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin.toLowerCase();
  } catch {
    return "";
  }
}

function normalizeAutoDeploy(value) {
  if (value === false) return "no";
  if (value === true) return "yes";
  const s = String(value == null ? "" : value).trim().toLowerCase();
  if (["no", "false", "off", "disabled"].includes(s)) return "no";
  if (["yes", "true", "on", "enabled"].includes(s)) return "yes";
  return s;
}

function evaluatePromotionReadiness(input) {
  const mode = String((input && input.mode) || "preflight");
  const acceptedSha = String((input && input.accepted_sha) || "").toLowerCase();
  const service = input && input.service && typeof input.service === "object"
    ? input.service
    : null;
  const live = input && input.live_deploy && typeof input.live_deploy === "object"
    ? input.live_deploy
    : null;
  const blockers = [];
  const liveIdentity =
    input && input.live_identity && typeof input.live_identity === "object"
      ? input.live_identity
      : null;
  const liveConfirmed =
    liveIdentity &&
    liveIdentity.status === "LIVE_PROVIDER_CONFIRMED" &&
    liveIdentity.confirmed === true;
  if (!liveConfirmed) {
    blockers.push("production_identity_unconfirmed");
  }

  if (mode !== "preflight" && mode !== "postflight") {
    blockers.push("mode_invalid");
  }
  if (!isFullSha(acceptedSha)) blockers.push("accepted_sha_invalid");
  if (!service) {
    blockers.push("service_missing");
  } else {
    if (!isServiceId(service.id)) blockers.push("service_id_invalid");
    if (service.id !== LAST_CONFIRMED_PRODUCTION_RENDER.service_id) {
      blockers.push("service_id_not_last_confirmed_production");
    }
    const environmentId = String(
      service.environmentId || service.environment_id || "",
    );
    if (!environmentId) {
      blockers.push("service_environment_id_missing");
    } else if (environmentId !== LAST_CONFIRMED_PRODUCTION_RENDER.environment_id) {
      blockers.push("service_environment_not_last_confirmed_production");
    }
    if (String(service.name || "") !== LAST_CONFIRMED_PRODUCTION_RENDER.name) {
      blockers.push("service_name_not_last_confirmed_production");
    }
    if (String(service.repo || "") !== LAST_CONFIRMED_PRODUCTION_RENDER.repo) {
      blockers.push("service_repo_not_last_confirmed_production");
    }
    const serviceUrl = normalizeUrl(
      service.url || (service.serviceDetails && service.serviceDetails.url),
    );
    if (!serviceUrl) {
      blockers.push("service_url_missing");
    } else if (serviceUrl !== normalizeUrl(LAST_CONFIRMED_PRODUCTION_RENDER.url)) {
      blockers.push("service_url_not_last_confirmed_production");
    }
    if (String(service.type || "") !== LAST_CONFIRMED_PRODUCTION_RENDER.type) {
      blockers.push("service_type_not_web_service");
    }
    if (String(service.branch || "") !== "main") {
      blockers.push("service_branch_not_main");
    }
    if (normalizeAutoDeploy(service.autoDeploy) !== "no") {
      blockers.push("auto_deploy_enabled");
    }
  }

  let liveSha = "";
  if (mode === "postflight") {
    if (!live) {
      blockers.push("live_deploy_missing");
    } else {
      if (String(live.status || "") !== "live") {
        blockers.push("live_deploy_not_live");
      }
      liveSha = String(
        live.commit && typeof live.commit === "object" ? live.commit.id || "" : "",
      ).toLowerCase();
      if (!isFullSha(liveSha)) {
        blockers.push("live_sha_invalid");
      } else if (isFullSha(acceptedSha) && liveSha !== acceptedSha) {
        blockers.push("live_sha_mismatch");
      }
    }
  }

  return {
    schema: "render-api-promotion-readiness.v1",
    mode,
    ready: blockers.length === 0,
    status: blockers.length === 0 ? "READY" : "NOT_READY",
    blockers,
    accepted_sha: isFullSha(acceptedSha) ? acceptedSha : null,
    live_sha: liveSha || null,
    deployment_authority: "accepted_exact_sha_only",
    auto_deploy_required: "disabled",
    mutation: 0,
    apply: false,
    founder_approval_required: true,
    production_release_authorized: false,
    identity_class: "LAST_CONFIRMED_IDENTITY",
    live_status: liveConfirmed ? "LIVE_PROVIDER_CONFIRMED" : "UNCONFIRMED",
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
      "usage: render-api-promotion-readiness.cjs --input <snapshot.json>\n",
    );
    process.exit(2);
  }
  let input;
  try {
    input = JSON.parse(fs.readFileSync(path.resolve(args.input), "utf8"));
  } catch {
    process.stderr.write(
      "[render-api-promotion-readiness] FAIL_CLOSED:snapshot_invalid\n",
    );
    process.exit(1);
  }
  const result = evaluatePromotionReadiness(input);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (!result.ready) process.exit(1);
}

if (require.main === module) main(process.argv);

module.exports = {
  isFullSha,
  isServiceId,
  normalizeUrl,
  normalizeAutoDeploy,
  LAST_CONFIRMED_PRODUCTION_RENDER,
  CANONICAL_PRODUCTION_RENDER,
  evaluatePromotionReadiness,
  parseArgs,
};
