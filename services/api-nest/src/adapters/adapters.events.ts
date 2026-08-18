/** Phase0 in-process · NATS subject names identical at Phase1+ */

export const ADAPTER_EVENTS = {
  healthChanged: "adapter.health.changed",
  observationIngested: "adapter.observation.ingested",
} as const;
