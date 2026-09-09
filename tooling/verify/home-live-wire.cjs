/**
 * verify:home-live-wire - UI PART9b/9c
 * page <-> @aipo/sdk/user-feed <-> HomeDesktopClient live wiring.
 *
 * SURFACE = /
 * RUNTIME_OWNER = apps/web/app/HomeDesktopClient.tsx
 * PRESENTATION_OWNER = apps/web/components/spark-dash-home/{HomeDesktop,HomeMobile}.tsx
 * MAPPER_OWNER = apps/web/components/spark-dash-home/map-runtime.ts
 * LEGACY_OWNER = apps/web/app/HomePageClient.tsx + packages/ui/components/home/HomeExperience.tsx
 *   (unreachable from any live route - see governance/runtime-surfaces.v1.json
 *   surfaces.home.legacyOwners. Never treat their existence as proof of wiring.)
 *
 * REWRITTEN 2026-09-04: the previous version of this file inferred live wiring
 * from `fs.existsSync("apps/web/app/HomePageClient.tsx")`. Since page.tsx
 * actually mounts HomeDesktopClient, that check was always true for the wrong
 * reason and this gate never actually inspected the real live source. See
 * tooling/verify/live-surface-integrity.cjs, which now forbids this pattern
 * repo-wide.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

// ---------------------------------------------------------------------------
// Pure assertion function. Takes ONLY the live entry+client source text - by
// construction it has no parameter through which legacy/dead source could
// influence the result. This is what makes the dead-code-immunity proof
// below meaningful rather than incidental.
// ---------------------------------------------------------------------------
const REQUIRED_HOOKS = [
  "fetchHomeReadModel",
  "fetchWalletBuckets",
  "fetchCurrentFxApprox",
  "fetchOpportunityFeed",
];

function assertHomeLiveWireChain({ entrySrc, clientSrc }) {
  const reasons = [];
  if (!entrySrc.includes("HomeDesktopClient")) {
    reasons.push("entry (page.tsx) does not mount HomeDesktopClient");
  }
  for (const hook of REQUIRED_HOOKS) {
    if (!clientSrc.includes(hook)) {
      reasons.push(`client does not call ${hook}`);
    }
  }
  if (!clientSrc.includes("HomeDesktop") || !clientSrc.includes("HomeMobile")) {
    reasons.push("client does not mount both HomeDesktop and HomeMobile presentation");
  }
  return { ok: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------
// 1) Registry-driven reachability against the REAL files.
// ---------------------------------------------------------------------------
let registry;
try {
  registry = JSON.parse(read("governance/runtime-surfaces.v1.json") || "{}");
} catch (e) {
  fails.push(`governance/runtime-surfaces.v1.json invalid JSON: ${e.message}`);
  registry = { surfaces: {} };
}
const homeSurface = (registry.surfaces || {}).home;
if (!homeSurface) {
  fails.push("governance/runtime-surfaces.v1.json missing surfaces.home");
}

const entryRel = homeSurface?.entry || "apps/web/app/page.tsx";
const clientRel = homeSurface?.client || "apps/web/app/HomeDesktopClient.tsx";

const entrySrc = read(entryRel);
const clientSrc = read(clientRel);

const liveResult = assertHomeLiveWireChain({ entrySrc, clientSrc });
if (!liveResult.ok) {
  for (const reason of liveResult.reasons) {
    fails.push(`live home wiring: ${reason} (${entryRel} -> ${clientRel})`);
  }
}

// ---------------------------------------------------------------------------
// 2) SDK contract (PART9a) - shared infra, independent of which UI renders it.
// ---------------------------------------------------------------------------
const sdkPkg = read("packages/sdk/package.json");
const feed = read("packages/sdk/src/user-feed/fetch.ts");

if (!sdkPkg.includes('"./user-feed"')) {
  fails.push("@aipo/sdk must export ./user-feed (PART9a)");
}
for (const name of ["fetchOpportunityFeed", "fetchDayPulse"]) {
  if (!feed.includes(name)) {
    fails.push(`user-feed must provide ${name}`);
  }
}

// ---------------------------------------------------------------------------
// 3) Three proofs (regression contract for this gate itself).
// ---------------------------------------------------------------------------
const FIXTURE_GOOD_ENTRY = `
import { HomeDesktopClient } from "@/app/HomeDesktopClient";
export default function Page() { return <HomeDesktopClient />; }
`;
const FIXTURE_GOOD_CLIENT = `
import { fetchHomeReadModel } from "@aipo/sdk/home-read-model";
import { fetchWalletBuckets } from "@aipo/sdk/wallet";
import { fetchCurrentFxApprox } from "@aipo/sdk/current-fx";
import { fetchOpportunityFeed } from "@aipo/sdk/user-feed";
import { HomeDesktop } from "../components/spark-dash-home/HomeDesktop";
import { HomeMobile } from "../components/spark-dash-home/HomeMobile";
export function HomeDesktopClient() { return null; }
`;

// --- Positive: a correct fixture must PASS ---
const positive = assertHomeLiveWireChain({
  entrySrc: FIXTURE_GOOD_ENTRY,
  clientSrc: FIXTURE_GOOD_CLIENT,
});
if (!positive.ok) {
  fails.push(
    `PROOF(positive) failed - a known-good fixture was rejected: ${positive.reasons.join("; ")}`,
  );
}

// --- Negative mutation: remove one required invariant, must FAIL ---
const mutatedClient = FIXTURE_GOOD_CLIENT.replace(
  'import { fetchOpportunityFeed } from "@aipo/sdk/user-feed";',
  "",
);
const negative = assertHomeLiveWireChain({
  entrySrc: FIXTURE_GOOD_ENTRY,
  clientSrc: mutatedClient,
});
if (negative.ok) {
  fails.push(
    "PROOF(negative-mutation) failed - removing fetchOpportunityFeed from the client fixture should FAIL but PASSed",
  );
}

// --- Dead-code immunity: the exact 2026-09-04 regression shape.
// A "legacy" blob that still has every marker must NOT be able to rescue a
// broken live client. We never pass the legacy blob into the function at
// all (there is no parameter for it) - this proof exists so that if a future
// edit ever adds such a fallback parameter/behavior, it fails loudly here.
const LEGACY_DECOY_WITH_ALL_MARKERS = `
// apps/web/app/HomePageClient.tsx (legacy, unreachable from any live route)
import { fetchHomeReadModel } from "@aipo/sdk/home-read-model";
import { fetchWalletBuckets } from "@aipo/sdk/wallet";
import { fetchCurrentFxApprox } from "@aipo/sdk/current-fx";
import { fetchOpportunityFeed } from "@aipo/sdk/user-feed";
import { HomeDesktop } from "../components/spark-dash-home/HomeDesktop";
import { HomeMobile } from "../components/spark-dash-home/HomeMobile";
export function HomeDesktopClient() { return null; }
`;
void LEGACY_DECOY_WITH_ALL_MARKERS; // intentionally never passed to the assertion below
const brokenLiveClient = FIXTURE_GOOD_CLIENT.replace(
  'import { fetchOpportunityFeed } from "@aipo/sdk/user-feed";',
  "",
);
const deadCodeImmunity = assertHomeLiveWireChain({
  entrySrc: FIXTURE_GOOD_ENTRY,
  clientSrc: brokenLiveClient, // the REAL live client for this test - broken
});
if (deadCodeImmunity.ok) {
  fails.push(
    "REGRESSION(dead-code-immunity) - assertHomeLiveWireChain PASSed on a broken live client. " +
      "This is the exact 2026-09-04 home-live-wire bug shape: a legacy file elsewhere containing " +
      "the right markers must never substitute for the live client actually having them.",
  );
}

// ---------------------------------------------------------------------------
// 4) Registration
// ---------------------------------------------------------------------------
const rootPkg = read("package.json");
if (!rootPkg.includes('"verify:home-live-wire"')) {
  fails.push("package.json missing verify:home-live-wire script");
}

if (fails.length) {
  console.error("[verify:home-live-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:home-live-wire] PASS (registry-driven / -> HomeDesktopClient -> HomeDesktop+HomeMobile live · 3 proofs incl. dead-code-immunity)",
);
