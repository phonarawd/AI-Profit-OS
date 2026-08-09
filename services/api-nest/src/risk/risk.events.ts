/** Phase0 in-process risk events (NATS subjects Phase1+ identical names) */

export const RISK_EVENTS = {
  signalRaised: "risk.signal.raised",
  queueUpdated: "risk.queue.updated",
  userStatusChanged: "risk.user.status.changed",
  freezeApplied: "risk.user.frozen",
  unfreezeApplied: "risk.user.unfrozen",
  circuitOpened: "risk.money.circuit.opened",
  circuitClosed: "risk.money.circuit.closed",
} as const;
