/** Phase0 in-process · NATS subject names identical at Phase1+ */

export const OPPORTUNITY_EVENTS = {
  /** §36 Admin pricing applied → user surfaces ≤500ms */
  priceUpdated: "opportunity.price.updated",
  /** Asset Master upsert */
  assetUpserted: "opportunity.asset.upserted",
  /** status / publish guard change */
  statusChanged: "opportunity.status.changed",
  /** Admin §9.8.9 · feed invalidate · ledgerMutated=false */
  userOverrideUpserted: "admin.user.opportunity_override.upsert",
  userOverrideDeleted: "admin.user.opportunity_override.delete",
} as const;
