#!/usr/bin/env node
/**
 * one-shot observe — worker tick이 동일 observeProduct를 재사용한다.
 * 예: node cli.cjs observe --source fashionphile --url https://www.fashionphile.com/products/{handle} --purpose CONFIRMATION
 */

const { observeProduct, discoverSourceItems } = require("./observe.cjs");
const { createMemoryRepository } = require("./repository.memory.cjs");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) return fallback;
  return process.argv[i + 1];
}

async function main() {
  const cmd = process.argv[2] || "observe";
  if (cmd === "discover") {
    const result = await discoverSourceItems({
      source: arg("source", "ebay"),
      query: arg("query"),
      categoryIds: arg("categoryIds"),
      limit: arg("limit"),
      offset: arg("offset"),
      marketplaceId: arg("marketplaceId"),
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
    return;
  }
  if (cmd !== "observe") {
    console.error(
      "usage: observe --source fashionphile|chrono24|ebay --url <url> --externalItemId <id> --purpose DISCOVERY|CONFIRMATION\n" +
        "       discover --source ebay --query <q> --limit 5",
    );
    process.exit(2);
  }
  const result = await observeProduct({
    source: arg("source", "fashionphile"),
    url: arg("url"),
    purpose: arg("purpose", "CONFIRMATION"),
    handle: arg("handle"),
    externalItemId: arg("externalItemId"),
    marketplaceId: arg("marketplaceId"),
  });
  if (process.argv.includes("--persist-memory")) {
    const repo = createMemoryRepository();
    if (result.ok && result.observation) {
      repo.appendObservation(result.observation);
      result.memoryStored = true;
    }
  }
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
