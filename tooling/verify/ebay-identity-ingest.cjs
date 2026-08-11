/**
 * verify:ebay-identity-ingest — Engine §0.10 / §0.10.2
 * exact Asset Master id · query:* persist 금지 · imageSource=ebay ·
 * i.ebayimg.com · unmatched review queue · silent drop 0 · amazon/yahoo INSERT 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "services/market-intelligence/src/ebay-identity-match.cjs",
  "services/market-intelligence/src/watch-match.cjs",
  "services/market-intelligence/src/card-match.cjs",
  "services/market-intelligence/src/bag-match.cjs",
  "services/api-nest/src/adapters/adapters.admin.service.ts",
  "services/api-nest/src/adapters/adapters.admin.controller.ts",
  "services/api-nest/src/adapters/adapters.routes.ts",
  "services/api-nest/src/opportunities/catalog-runtime-seed.service.ts",
  "workers/ebay-adapter/src/index.ts",
  "apps/admin/app/admin/adapters/page.tsx",
  "packages/ui/canon/surfaces/admin-adapters.wire.json",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:ebay-identity-ingest] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const mi = require(path.join(
  root,
  "services/market-intelligence/src/ebay-identity-match.cjs",
));
const catalog = require(path.join(
  root,
  "services/market-intelligence/src/catalog-runtime-seed.cjs",
));

const EBAY_IMG = "https://i.ebayimg.com/images/g/abc/s-l1600.jpg";

// --- 1) exact match → real Asset Master id ---
const exact = mi.resolveEbayIngestListings({
  listings: [
    {
      id: "lst_ebay_EBAY_US_test1",
      assetId: "query:Rolex Submariner 126610LN",
      searchQuery: "Rolex Submariner 126610LN",
      marketId: "ebay_us",
      adapterId: "ebay",
      marketplaceId: "EBAY_US",
      externalItemId: "ext_rolex_1",
      title: "Rolex Submariner 126610LN Ceramic Black Dial",
      priceUsdt: "9200",
      currency: "USDT",
      url: "https://www.ebay.com/itm/ext_rolex_1",
      imageUrl: EBAY_IMG,
      observedAt: new Date().toISOString(),
      staleAt: new Date(Date.now() + 300000).toISOString(),
    },
  ],
});
if (exact.matched.length !== 1) {
  fails.push(`exact match want 1 matched got ${exact.matched.length}`);
} else {
  const m = exact.matched[0];
  if (m.assetId !== "w_rolex_sub_126610ln") {
    fails.push(`exact assetId want w_rolex_sub_126610ln got ${m.assetId}`);
  }
  if (String(m.assetId).startsWith("query:")) {
    fails.push("exact match must not keep query: assetId");
  }
  // 3) imageSource === ebay
  if (m.imageSource !== "ebay") {
    fails.push(`exact imageSource want ebay got ${m.imageSource}`);
  }
  // 4) i.ebayimg.com host
  if (!mi.isEbayImageHost(m.imageUrl)) {
    fails.push("exact imageUrl must be i.ebayimg.com host");
  }
}
if (exact.unmatched.length !== 0) {
  fails.push("exact match must not enqueue unmatched");
}

// --- 2) query:* persistence forbidden after resolve ---
try {
  mi.assertNoQueryAssetIds(exact.matched);
} catch (e) {
  fails.push(`assertNoQueryAssetIds on matched failed: ${e.message}`);
}
const persistRows = catalog.normalizeIngestListingsForPersist(
  [
    {
      assetId: "query:should_never_persist",
      marketId: "ebay_us",
      adapterId: "ebay",
      priceUsdt: "10",
      observedAt: new Date().toISOString(),
    },
    ...(exact.matched.length
      ? [
          {
            ...exact.matched[0],
            marketId: "ebay_us",
            adapterId: "ebay",
            priceUsdt: "9200",
            observedAt: new Date().toISOString(),
            staleAt: new Date(Date.now() + 300000).toISOString(),
          },
        ]
      : []),
  ],
  "ebay",
);
if (persistRows.some((r) => String(r.assetId).startsWith("query:"))) {
  fails.push("normalizeIngest must never emit query: assetId");
}
if (
  exact.matched.length &&
  !persistRows.some((r) => r.assetId === "w_rolex_sub_126610ln")
) {
  fails.push("normalizeIngest must persist exact-matched Asset Master id");
}

// --- 5/6) unmatched → review queue · silent drop 0 ---
const noMatch = mi.resolveEbayIngestListings({
  listings: [
    {
      id: "lst_ebay_EBAY_US_junk",
      assetId: "query:Totally Unknown Widget XYZ",
      searchQuery: "Totally Unknown Widget XYZ",
      marketId: "ebay_us",
      adapterId: "ebay",
      marketplaceId: "EBAY_US",
      externalItemId: "ext_junk_1",
      title: "Totally Unknown Widget XYZ limited edition",
      priceUsdt: "12",
      currency: "USDT",
      imageUrl: EBAY_IMG,
      observedAt: new Date().toISOString(),
    },
  ],
});
if (noMatch.matched.length !== 0) {
  fails.push("unknown listing must not match");
}
if (noMatch.unmatched.length !== 1) {
  fails.push(
    `unknown listing must enqueue review queue got ${noMatch.unmatched.length}`,
  );
} else {
  const u = noMatch.unmatched[0];
  if (!u.reason) fails.push("unmatched evidence missing reason");
  if (!u.title) fails.push("unmatched evidence missing title");
  if (!u.externalItemId) fails.push("unmatched evidence missing externalItemId");
  if (u.evidence && u.evidence.queryPlaceholder !== true) {
    fails.push("unmatched evidence must flag queryPlaceholder");
  }
}
// missing ebay image host → unmatched (not silent drop, not persist)
const badImg = mi.resolveEbayIngestListings({
  listings: [
    {
      assetId: "query:Rolex Submariner 126610LN",
      searchQuery: "Rolex Submariner 126610LN",
      marketId: "ebay_us",
      adapterId: "ebay",
      externalItemId: "ext_rolex_badimg",
      title: "Rolex Submariner 126610LN",
      priceUsdt: "9000",
      imageUrl: "https://cdn.example.com/not-ebay.jpg",
    },
  ],
});
if (badImg.matched.length !== 0 || badImg.unmatched.length !== 1) {
  fails.push("non-ebay image host must go to review queue (not persist)");
}
if (
  badImg.unmatched[0] &&
  badImg.unmatched[0].reason !== "missing_ebay_image_host"
) {
  fails.push(
    `bad image reason want missing_ebay_image_host got ${badImg.unmatched[0]?.reason}`,
  );
}

// --- 7/8) Day-1 amazon/yahoo INSERT 0 ---
for (const forbidden of ["amazon", "yahoo_jp"]) {
  let threw = false;
  try {
    catalog.normalizeIngestListingsForPersist(
      [
        {
          assetId: "w_rolex_sub_126610ln",
          marketId: "ebay_us",
          adapterId: forbidden,
          priceUsdt: "1",
        },
      ],
      forbidden,
    );
  } catch {
    threw = true;
  }
  if (!threw) {
    fails.push(`normalizeIngest must throw for ${forbidden}`);
  }
}
if (!catalog.FORBIDDEN_INGEST_ADAPTERS.includes("amazon")) {
  fails.push("FORBIDDEN_INGEST_ADAPTERS must include amazon");
}
if (!catalog.FORBIDDEN_INGEST_ADAPTERS.includes("yahoo_jp")) {
  fails.push("FORBIDDEN_INGEST_ADAPTERS must include yahoo_jp");
}

// bag + card exact paths
const bag = mi.resolveEbayIngestListings({
  listings: [
    {
      assetId: "query:Hermes Birkin 25 Noir togo",
      searchQuery: "Hermes Birkin 25 Noir togo",
      adapterId: "ebay",
      marketId: "ebay_us",
      title: "Hermes Birkin 25 Noir Togo Leather Handbag",
      priceUsdt: "18000",
      imageUrl: EBAY_IMG,
      externalItemId: "ext_bag_1",
    },
  ],
});
if (bag.matched.length !== 1 || bag.matched[0].assetId !== "lb_hermes_birkin_25_noir") {
  fails.push(
    `bag exact want lb_hermes_birkin_25_noir got ${bag.matched[0]?.assetId}`,
  );
}

const card = mi.resolveEbayIngestListings({
  listings: [
    {
      assetId: "query:Pikachu Base Set 58 pokemon card",
      searchQuery: "Pikachu Base Set 58 pokemon card",
      adapterId: "ebay",
      marketId: "ebay_us",
      title: "Pikachu Base Set 58 Pokemon Card Raw",
      priceUsdt: "40",
      imageUrl: EBAY_IMG,
      externalItemId: "ext_card_1",
    },
  ],
});
if (card.matched.length !== 1 || card.matched[0].assetId !== "tc_poke_base1-58") {
  fails.push(
    `card exact want tc_poke_base1-58 got ${card.matched[0]?.assetId}`,
  );
}

// --- wiring: Nest ingest uses resolver + review queue + provenance ---
const svc = read("services/api-nest/src/adapters/adapters.admin.service.ts");
for (const needle of [
  "resolveEbayIngestListings",
  "assertNoQueryAssetIds",
  "identityReviewQueue",
  "enqueueIdentityReview",
  "applyEbayImageProvenance",
]) {
  if (!svc.includes(needle)) {
    fails.push(`adapters.admin.service missing ${needle}`);
  }
}
const routes = read("services/api-nest/src/adapters/adapters.routes.ts");
if (!routes.includes("identity-review-queue")) {
  fails.push("adapters.routes missing identity-review-queue");
}
const ctrl = read("services/api-nest/src/adapters/adapters.admin.controller.ts");
if (!ctrl.includes("identityReviewQueue")) {
  fails.push("adapters.admin.controller missing identityReviewQueue");
}
const seedSvc = read(
  "services/api-nest/src/opportunities/catalog-runtime-seed.service.ts",
);
if (!seedSvc.includes("applyEbayImageProvenance")) {
  fails.push("catalog-runtime-seed.service missing applyEbayImageProvenance");
}
if (!seedSvc.includes("asset_image_source = 'ebay'")) {
  fails.push("provenance update must set opportunities.asset_image_source=ebay");
}

const worker = read("workers/ebay-adapter/src/index.ts");
if (!worker.includes("searchQuery")) {
  fails.push("ebay-adapter must send searchQuery hint");
}
if (!/assetId:\s*`query:\$\{query\}`/.test(worker)) {
  fails.push("ebay-adapter still emits query: hint for Nest resolve");
}

const adminPage = read("apps/admin/app/admin/adapters/page.tsx");
if (!adminPage.includes('data-testid="identity-review-queue"')) {
  fails.push("admin adapters page missing identity-review-queue surface");
}
if (!adminPage.includes("identity-review-queue")) {
  fails.push("admin page must reference identity-review-queue API");
}

const wire = read("packages/ui/canon/surfaces/admin-adapters.wire.json");
if (!wire.includes("identity_review_queue")) {
  fails.push("admin-adapters.wire missing identity_review_queue block");
}
if (!wire.includes("unmatched_silent_drop")) {
  fails.push("admin-adapters.wire forbidden must include unmatched_silent_drop");
}

const pkg = read("package.json");
if (!pkg.includes("verify:ebay-identity-ingest")) {
  fails.push("package.json missing verify:ebay-identity-ingest script");
}
const catalogMd = read("tooling/verify/CATALOG.md");
if (!/ebay-identity-ingest/.test(catalogMd)) {
  fails.push("CATALOG.md missing ebay-identity-ingest");
}

const indexCjs = read("services/market-intelligence/src/index.cjs");
if (!indexCjs.includes("ebay-identity-match")) {
  fails.push("market-intelligence index must export ebay-identity-match");
}

if (fails.length) {
  console.error("[verify:ebay-identity-ingest] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:ebay-identity-ingest] PASS (§0.10 exact id · query:0 · ebay image · review queue · Day-1 source)",
);
