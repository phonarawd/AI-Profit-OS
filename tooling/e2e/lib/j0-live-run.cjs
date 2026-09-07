"use strict";

const lib = require("./j0-live-lib.cjs");
const { runEdge } = require("./j0-live-edge.cjs");
const { runInteractiveA } = require("./j0-live-interactive-a.cjs");
const { runInteractiveB } = require("./j0-live-interactive-b.cjs");

async function run() {
  const items = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    status: "NOT_RUN",
    why: "",
  }));
  await runEdge(items);
  if (process.env.J0_EDGE_ONLY !== "1") {
    const ctx = await runInteractiveA(items);
    await runInteractiveB(items, ctx);
  }
  const health = await lib.stagingHealth();
  const head = lib.workspaceHead();
  const aligned = lib.shaAligned(head, health.gitSha);
  const counts = items.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const allPass = items.every((row) => row.status === "PASS");
  const verdict = allPass && aligned ? "PASS" : "NOT_PASS";
  const evidence = {
    schema: "j0-live.v1",
    verdict,
    recordedAt: new Date().toISOString(),
    shaAligned: aligned,
    stagingSha: String(health.gitSha || "").slice(0, 8),
    workspaceHead: String(head || "").slice(0, 8),
    migrationHead: health.migrationHead,
    counts,
    items,
    note: "Human one-time login is not J0 PASS. Static verify is not live PASS.",
  };
  lib.writeEvidence(evidence);
  process.stdout.write(JSON.stringify(evidence, null, 2) + "\n");
  if (verdict !== "PASS") process.exitCode = 2;
}

module.exports = { run };
