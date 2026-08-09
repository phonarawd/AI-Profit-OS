/** Phase0 in-process · NATS subject names identical at Phase1+ */

export const SIMULATION_EVENTS = {
  completed: "simulation.completed",
} as const;

export const PLATFORM_RESERVE_EVENTS = {
  updated: "admin.platform_reserve.updated",
} as const;

export const GROWTH_EVENTS = {
  enabled: "admin.growth.enabled",
} as const;
