/**
 * Deny-by-default capability classification for every admin route.
 *
 * Keyed by Nest controller class + handler name (framework metadata, not raw
 * URL strings) so a renamed path cannot silently drop a route out of the map.
 * Capability names come from the canonical RBAC vocabulary in
 * schemas/admin-rbac.v1.json — no invented names.
 *
 * A handler that is absent here is UNCLASSIFIED and therefore denied, including
 * for `super`. New admin routes must be classified explicitly before they can be
 * reached (that is the whole point of the deny-by-default table).
 *
 * Where no canonical capability unambiguously fits a platform-operations route
 * (adapters, AI ops, execution policy, opportunity catalog, simulation, platform
 * reserve) the route requires `all`, which today only `super` holds. That is the
 * conservative choice, never the permissive one.
 */

import type { CapabilityLevel } from "./admin-rbac.policy";

export type RequiredCapability = {
  capability: string;
  level: Exclude<CapabilityLevel, "none">;
};

type ControllerPolicy = Readonly<Record<string, RequiredCapability>>;

const read = (capability: string): RequiredCapability => ({
  capability,
  level: "read",
});
const write = (capability: string): RequiredCapability => ({
  capability,
  level: "write",
});

export const ADMIN_CAPABILITY_POLICY: Readonly<
  Record<string, ControllerPolicy>
> = Object.freeze({
  AdaptersAdminController: {
    listingLegs: read("all"),
    matchingKpi: read("all"),
    simulationS4: read("all"),
    recordMatchAttempts: write("all"),
    identityReviewQueue: read("all"),
    list: read("all"),
    get: read("all"),
  },
  AiLogsAdminController: {
    evalStatus: read("all"),
    coach: read("all"),
    evalRun: write("all"),
    list: read("all"),
    get: read("all"),
  },
  AiPickAdminController: {
    score: write("all"),
    recent: read("all"),
  },
  ShadowReplayAdminController: {
    run: write("all"),
    latest: read("all"),
  },
  KycAdminController: {
    list: read("kyc"),
    approve: write("kyc"),
    reject: write("kyc"),
    docUrl: read("kyc"),
  },
  ExecutionPolicyAdminController: {
    get: read("all"),
    put: write("all"),
    statsToday: read("all"),
    audit: read("all"),
  },
  OpsInboxAdminController: {
    send: write("opsMessage"),
    list: read("opsMessage"),
  },
  LedgerAdminController: {
    listJournals: read("ledger"),
    getJournal: read("ledger"),
    recon: read("ledger"),
    financialReport: read("financeExport"),
    userBuckets: read("ledger"),
    balanceAdjust: write("balanceAdjust"),
  },
  MembershipAdminController: {
    get: read("userMembershipForce"),
    force: write("userMembershipForce"),
    getMatchPolicy: read("userMatchPolicy"),
    putMatchPolicy: write("userMatchPolicy"),
    effectivePreview: read("userMembershipForce"),
  },
  OpportunitiesAdminController: {
    listAssets: read("all"),
    list: read("all"),
    get: read("all"),
    patchPricing: write("all"),
    upsertAsset: write("all"),
    seedTradingCards: write("all"),
    seedLuxuryBags: write("all"),
    seedWatches: write("all"),
    catalogRuntimeSeed: write("all"),
    evaluateGrade: write("all"),
    evaluateBagMatch: write("all"),
    evaluateWatchMatch: write("all"),
    registerAssetImage: write("all"),
  },
  UserOpportunityOverrideAdminController: {
    list: read("userOpportunityOverride"),
    upsert: write("userOpportunityOverride"),
    remove: write("userOpportunityOverride"),
  },
  ReferralAdminController: {
    getProgram: read("growth"),
    patchProgram: write("growth"),
    audit: read("growth"),
    poolStatus: read("growth"),
    // Pool top-up / release / clawback move real money — finance authority, not marketing.
    poolTopUp: write("balanceAdjust"),
    holdQueue: read("growth"),
    release: write("balanceAdjust"),
    clawbackEdge: write("balanceAdjust"),
    accrualHalt: write("circuit"),
    userEdges: read("growth"),
  },
  RiskAdminController: {
    queue: read("risk"),
    catalog: read("risk"),
    circuitState: read("risk"),
    circuitClose: write("circuit"),
    userState: read("risk"),
    freeze: write("freezeBan"),
    unfreeze: write("freezeBan"),
    restrict: write("freezeBan"),
    flag: write("freezeBan"),
    ack: write("risk"),
    resolve: write("risk"),
  },
  PlatformReserveAdminController: {
    get: read("all"),
    put: write("all"),
    audit: read("all"),
  },
  SimulationAdminController: {
    run: write("all"),
    latest: read("all"),
    growthGate: read("all"),
    getGrowthEnabled: read("growth"),
    putGrowthEnabled: write("growth"),
  },
  DepositConfigAdminController: {
    get: read("wallet"),
    patch: write("wallet"),
    audit: read("wallet"),
  },
  DepositDisputeAdminController: {
    list: read("wallet"),
    credit: write("balanceAdjust"),
    reject: write("wallet"),
  },
  KrwDepositAdminController: {
    list: read("wallet"),
    approve: write("wallet"),
    reject: write("wallet"),
  },
  WithdrawCredentialsAdminController: {
    resetPin: write("withdrawPinReset"),
    revokeWebauthn: write("withdrawPinReset"),
  },
});

export function requiredCapabilityFor(
  controllerName: string,
  handlerName: string,
): RequiredCapability | null {
  const controller = Object.prototype.hasOwnProperty.call(
    ADMIN_CAPABILITY_POLICY,
    controllerName,
  )
    ? ADMIN_CAPABILITY_POLICY[controllerName]
    : undefined;
  if (!controller) return null;
  if (!Object.prototype.hasOwnProperty.call(controller, handlerName)) return null;
  return controller[handlerName] ?? null;
}

export function classifiedAdminHandlerCount(): number {
  return Object.values(ADMIN_CAPABILITY_POLICY).reduce(
    (sum, handlers) => sum + Object.keys(handlers).length,
    0,
  );
}
