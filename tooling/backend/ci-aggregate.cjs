#!/usr/bin/env node
"use strict";
/**
 * backend-required aggregate (last job of backend-ci.yml · required status check candidate).
 *
 * input  NEEDS_JSON = toJSON(needs) · GITHUB_REPOSITORY/GITHUB_RUN_ID/GITHUB_TOKEN (actions:read · job timings)
 * rule   every needs.<job>.result must be success. failure · cancelled · skipped => exit 1.
 *        skipped/cancelled are reported as NOT_RUN; a NOT_RUN core domain job
 *        (auth · ledger-wallet · kyc · matching-membership · notification · migration) is itself a failure reason
 *        (missing remote resources never turn into a pass).
 * output $GITHUB_STEP_SUMMARY table: job · result · duration · NOT_RUN list.
 */
const fs = require("node:fs");

const CORE_JOBS = ["auth", "ledger-wallet", "kyc", "matching-membership", "notification", "migration"];

function parseNeeds() {
  const raw = process.env.NEEDS_JSON || "";
  if (!raw.trim()) throw new Error("NEEDS_JSON is empty - the aggregate job must pass toJSON(needs)");
  const needs = JSON.parse(raw);
  const jobs = Object.keys(needs).sort();
  if (!jobs.length) throw new Error("needs is empty - aggregate job must need every verification job");
  return { needs, jobs };
}

async function fetchJobTimings() {
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !runId || !token || typeof fetch !== "function") return new Map();
  const out = new Map();
  try {
    for (let page = 1; page <= 5; page++) {
      const res = await fetch("https://api.github.com/repos/" + repo + "/actions/runs/" + runId + "/jobs?per_page=100&page=" + page, {
        headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      });
      if (!res.ok) break;
      const body = await res.json();
      for (const j of body.jobs || []) out.set(j.name, { started: j.started_at, completed: j.completed_at, conclusion: j.conclusion, url: j.html_url });
      if (!body.jobs || body.jobs.length < 100) break;
    }
  } catch {
    return out;
  }
  return out;
}

function fmtDuration(started, completed) {
  if (!started || !completed) return "-";
  const ms = new Date(completed) - new Date(started);
  if (!Number.isFinite(ms) || ms < 0) return "-";
  const s = Math.round(ms / 1000);
  return s >= 60 ? Math.floor(s / 60) + "m" + String(s % 60).padStart(2, "0") + "s" : s + "s";
}

async function main() {
  const { needs, jobs } = parseNeeds();
  const timings = await fetchJobTimings();
  const rows = jobs.map((id) => {
    const result = String((needs[id] && needs[id].result) || "unknown");
    const t = timings.get(id) || {};
    return { id, result, notRun: result === "skipped" || result === "cancelled", core: CORE_JOBS.includes(id), duration: fmtDuration(t.started, t.completed), url: t.url || "" };
  });
  const failed = rows.filter((r) => r.result !== "success");
  const notRun = rows.filter((r) => r.notRun);
  const coreNotRun = notRun.filter((r) => r.core);

  const lines = [];
  lines.push("## backend-required");
  lines.push("");
  lines.push("| job | result | duration | core |");
  lines.push("|---|---|---|---|");
  for (const r of rows) {
    const name = r.url ? "[" + r.id + "](" + r.url + ")" : r.id;
    const mark = r.result === "success" ? "PASS" : r.notRun ? "NOT_RUN" : "FAIL";
    lines.push("| " + name + " | " + mark + " (" + r.result + ") | " + r.duration + " | " + (r.core ? "core" : "") + " |");
  }
  lines.push("");
  lines.push("NOT_RUN (skipped/cancelled): " + (notRun.length ? notRun.map((r) => r.id).join(", ") : "0"));
  lines.push("core NOT_RUN: " + (coreNotRun.length ? coreNotRun.map((r) => r.id).join(", ") : "0"));
  lines.push("red jobs: " + (failed.length ? failed.map((r) => r.id + "=" + r.result).join(", ") : "0"));
  lines.push("");
  lines.push(failed.length ? "**backend-required = FAIL** (" + failed.length + "/" + rows.length + " jobs not success)" : "**backend-required = PASS** (" + rows.length + "/" + rows.length + " jobs success)");
  const summary = lines.join("\n") + "\n";
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  process.stdout.write(summary);

  for (const r of rows) console.log("[backend-required] " + r.result.padEnd(9) + " " + r.id + (r.core ? " (core)" : "") + " " + r.duration);
  if (failed.length) {
    console.error("[backend-required] FAIL: " + failed.map((r) => r.id + "=" + r.result).join(", "));
    if (coreNotRun.length) console.error("[backend-required] core NOT_RUN is a failure: " + coreNotRun.map((r) => r.id).join(", "));
    process.exit(1);
  }
  console.log("[backend-required] PASS (" + rows.length + " jobs success · NOT_RUN 0)");
}

main().catch((err) => {
  console.error("[backend-required] FAIL " + (err && err.message ? err.message : err));
  process.exit(1);
});
