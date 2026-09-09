#!/usr/bin/env node
/**
 * Founder 위임 실행기. 기본은 dry-run.
 * hard gate가 실제 PASS일 때만 --execute 가 gh/배포를 부른다.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  isRcProductionMergeable,
  loadContract,
} = require("../github/rc-production-merge.cjs");

const root = path.resolve(__dirname, "../..");
const DELEGATION_REL = "governance/recovery/founder-execution-delegation.v1.json";
const ACCEPTANCE_REL = "governance/engine-acceptance/FINAL_ACCEPTANCE.md";
const HARD_GATE_REL = "governance/release-master/HARD_GATE_LIVE.v1.json";
const RC_FORMAL_REL = "governance/release-master/rc-formal.v1.json";
const PUBLIC_SWITCH_REL = "governance/release-master/PUBLIC_SWITCH.v1.json";

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return "";
  return fs.readFileSync(p, "utf8");
}

function readJson(rel) {
  const text = read(rel);
  if (!text) return null;
  return JSON.parse(text);
}

function field(md, key) {
  const m = String(md).match(new RegExp("^" + key + " = (.+)$", "m"));
  return m ? m[1].trim() : "";
}

function loadDelegation() {
  const d = readJson(DELEGATION_REL);
  if (!d || d.executor !== "agent") {
    throw new Error("founder execution delegation missing or executor!=agent");
  }
  if (d.skip_hard_gates !== false) {
    throw new Error("delegation must keep skip_hard_gates=false");
  }
  if (d.cert_issued_by_delegation !== false) {
    throw new Error("delegation must not issue CERT");
  }
  return d;
}

function evaluate(action) {
  const blocks = [];
  const acceptance = read(ACCEPTANCE_REL);
  const certIssued = field(acceptance, "CERT_ISSUED") === "1";
  const certStatus = field(acceptance, "STATUS");
  const hard = readJson(HARD_GATE_REL) || {};
  const rc = readJson(RC_FORMAL_REL) || {};
  const pub = readJson(PUBLIC_SWITCH_REL);

  if (action === "preview") {
    return { ok: true, blocks, dispatch: "preview" };
  }

  if (action === "ops-auto" || action === "api-prod") {
    const d = loadDelegation();
    if (action === "ops-auto" && d.actions.ops_auto !== "agent_backend_only") {
      blocks.push("ops_auto not authorized as agent_backend_only");
    }
    if (action === "api-prod" && d.actions.api_prod_render !== "agent_backend_only") {
      blocks.push("api_prod_render not authorized as agent_backend_only");
    }
    if (d.cert_issued_by_delegation !== false) {
      blocks.push("api-prod must not issue CERT");
    }
    if (d.full_real_money_released_by_delegation !== false) {
      blocks.push("api-prod must not flip money YES");
    }
    return {
      ok: blocks.length === 0,
      blocks,
      dispatch: action === "ops-auto" ? "ops-auto" : "api-prod",
    };
  }

  if (action === "web" || action === "ops") {
    if (certStatus !== "ISSUED" || !certIssued) {
      blocks.push("FINAL_ACCEPTANCE not ISSUED (CERT_ISSUED=" + field(acceptance, "CERT_ISSUED") + ")");
    }
    if (hard.hardGatePassed !== 1) {
      blocks.push("HARD_GATE_LIVE.hardGatePassed=" + String(hard.hardGatePassed));
    }
    return {
      ok: blocks.length === 0,
      blocks,
      dispatch: action,
    };
  }

  if (action === "rel-701") {
    if (certStatus !== "ISSUED" || !certIssued) {
      blocks.push("FINAL_ACCEPTANCE not ISSUED (CERT_ISSUED=" + field(acceptance, "CERT_ISSUED") + ")");
    }
    if (hard.hardGatePassed !== 1) {
      blocks.push("HARD_GATE_LIVE.hardGatePassed=" + String(hard.hardGatePassed));
    }
    if (hard.fullRealMoneyReleased === "YES") {
      blocks.push("money already YES before REL-701 is not a skip; record only");
    }
    if (rc.production_deploy !== 0) {
      blocks.push("rc-formal.production_deploy already " + String(rc.production_deploy));
    }
    return { ok: blocks.length === 0, blocks, dispatch: "production" };
  }

  if (action === "rel-702" || action === "rel-703" || action === "rel-704") {
    if (rc.production_deploy !== 1) {
      blocks.push("REL-701 production_deploy is not 1");
    }
    return { ok: blocks.length === 0, blocks, dispatch: action };
  }

  if (action === "merge") {
    const raw = process.env.AIPO_RC_MERGE_CONTEXTS || "";
    const contexts = raw
      ? raw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const verdict = isRcProductionMergeable(contexts, loadContract());
    if (!verdict.mergeable) {
      blocks.push(
        "RC merge contract missing: " +
          (verdict.missing.join(", ") || "no completed contexts"),
      );
    }
    if (certStatus !== "ISSUED" || !certIssued) {
      blocks.push("merge blocked while FINAL_ACCEPTANCE is not ISSUED");
    }
    return { ok: blocks.length === 0, blocks, dispatch: "merge" };
  }

  if (action === "money-yes") {
    if (!pub || pub.authorized !== true) {
      blocks.push("PUBLIC_SWITCH.v1.json authorized!=true");
    }
    if (hard.fullRealMoneyReleased === "YES") {
      blocks.push("already YES");
    }
    if (certStatus !== "ISSUED" || !certIssued) {
      blocks.push("money YES blocked while CERT is not ISSUED");
    }
    if (hard.hardGatePassed !== 1) {
      blocks.push("money YES blocked while hardGatePassed!=1");
    }
    return { ok: blocks.length === 0, blocks, dispatch: "money-yes" };
  }

  blocks.push("unknown action " + action);
  return { ok: false, blocks, dispatch: null };
}

function runGh(args) {
  const run = spawnSync("gh", args, {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
  });
  if (run.status !== 0) {
    throw new Error(
      "gh failed: " + String(run.stderr || run.stdout || run.status),
    );
  }
  return run.stdout;
}

function execute(action, verdict) {
  if (action === "preview") {
    runGh([
      "workflow",
      "run",
      "deploy-cloudflare.yml",
      "-f",
      "target=preview",
      "-f",
      "surface=all",
      "-f",
      "worker_set=phase0",
    ]);
    return;
  }
  if (action === "ops-auto") {
    const run = spawnSync(
      process.execPath,
      [path.join(root, "tooling/dev/ops-auto-backend.cjs")],
      { cwd: root, encoding: "utf8", timeout: 300000 },
    );
    if (run.status !== 0) {
      throw new Error(
        "ops-auto failed: " + String(run.stderr || run.stdout || run.status),
      );
    }
    process.stdout.write(run.stdout || "");
    return;
  }
  if (action === "api-prod") {
    const argSha = process.argv.slice(2).find((a) => /^[0-9a-f]{40}$/i.test(a));
    let sha = argSha || "";
    if (!sha) {
      const shaRun = spawnSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
        timeout: 30000,
      });
      sha = String(shaRun.stdout || "").trim();
      if (shaRun.status !== 0 || !/^[0-9a-f]{40}$/i.test(sha)) {
        throw new Error("api-prod needs a full HEAD SHA");
      }
    }
    const deploy = spawnSync(
      process.execPath,
      [path.join(root, "tooling/dev/redeploy-production-api.cjs"), sha],
      { cwd: root, encoding: "utf8", timeout: 120000 },
    );
    if (deploy.status !== 0) {
      throw new Error(
        "api-prod render failed: " +
          String(deploy.stderr || deploy.stdout || deploy.status),
      );
    }
    process.stdout.write(deploy.stdout || "");
    return;
  }
  if (action === "web" || action === "ops") {
    runGh([
      "workflow",
      "run",
      "deploy-cloudflare.yml",
      "-f",
      "target=production",
      "-f",
      "surface=" + action,
      "-f",
      "worker_set=phase0",
      "--ref",
      "main",
    ]);
    return;
  }
  if (action === "rel-701") {
    runGh([
      "workflow",
      "run",
      "deploy-cloudflare.yml",
      "-f",
      "target=production",
      "-f",
      "surface=all",
      "-f",
      "worker_set=phase0",
      "--ref",
      "main",
    ]);
    return;
  }
  if (action === "merge") {
    const pr = process.env.AIPO_MERGE_PR || "221";
    runGh(["pr", "merge", pr, "--merge", "--delete-branch=false"]);
    return;
  }
  throw new Error("execute not implemented for " + action + " / " + verdict.dispatch);
}

function main() {
  const argv = process.argv.slice(2);
  const executeFlag = argv.includes("--execute");
  const action = argv.find((a) => !a.startsWith("--"));
  if (!action) {
    console.error(
      "usage: node tooling/release/agent-execute.cjs <ops-auto|api-prod|web|ops|rel-701|rel-702|rel-703|rel-704|preview|merge|money-yes> [--execute]",
    );
    process.exit(2);
  }
  loadDelegation();
  const verdict = evaluate(action);
  if (!verdict.ok) {
    console.error("[agent-execute] BLOCKED " + action);
    for (const b of verdict.blocks) console.error(" - " + b);
    process.exit(1);
  }
  console.log("[agent-execute] READY " + action);
  if (!executeFlag) {
    console.log("[agent-execute] dry-run (pass --execute to dispatch)");
    process.exit(0);
  }
  execute(action, verdict);
  console.log("[agent-execute] EXECUTED " + action);
}

if (require.main === module) {
  main();
}

module.exports = { evaluate, loadDelegation };
