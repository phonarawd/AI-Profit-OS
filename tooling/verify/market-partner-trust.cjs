/**
 * verify:market-partner-trust — §38.10 Market Partner Trust (server registry half)
 *
 * schemas/market-partner.registry.json must point every tracked partner at its logo asset id
 * (the SVG files, brand manifest, canon wire, copy and MarketPartner* components live in putduk-web —
 * quality/putduk-web-ui-assertions-handoff.md 1d).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const REQUIRED_LOGOS = [
  "ebay.svg",
  "amazon.svg",
  "yahoo-jp.svg",
  "pokemontcg.svg",
  "ygoprodeck.svg",
  "coingecko.svg",
  "frankfurter.svg",
];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    return null;
  }
  return fs.readFileSync(p, "utf8");
}

// --- registry logoAsset pointers ---
const registryRaw = read("schemas/market-partner.registry.json");
if (registryRaw) {
  let registry = null;
  try {
    registry = JSON.parse(registryRaw);
  } catch {
    fails.push("market-partner.registry.json invalid JSON");
  }
  if (registry) {
    const partners = registry.partners || [];
    const logoAssets = new Set(partners.map((p) => p.logoAsset).filter(Boolean));
    for (const f of REQUIRED_LOGOS) {
      if (!logoAssets.has(f)) {
        fails.push(`market-partner.registry.json missing logoAsset ${f}`);
      }
    }
    // yahoo + amazon + ebay must stay tracked partners (adapter Day-1 != partner listing)
    for (const prefix of ["yahoo_jp", "amazon_", "ebay_"]) {
      if (!partners.some((p) => String(p.partnerId || p.id || "").startsWith(prefix))) {
        fails.push(`market-partner.registry.json missing partner ${prefix}*`);
      }
    }
  }
}

if (fails.length) {
  console.error("[verify:market-partner-trust] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:market-partner-trust] PASS (registry logoAsset pointers for 7 partners)");
