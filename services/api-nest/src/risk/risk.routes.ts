/** Risk Admin API paths · UI Owns=Admin · contracts Owns=Money §49.9 */

export const RISK_ADMIN_ROUTES = {
  /** GET — Admin /admin/risk?tab=queue */
  queue: "risk/queue",
  catalog: "risk/catalog",
  signalAck: "risk/signals/:id/ack",
  signalResolve: "risk/signals/:id/resolve",
  userState: "risk/users/:userId/state",
  userFreeze: "risk/users/:userId/freeze",
  userUnfreeze: "risk/users/:userId/unfreeze",
  userRestrict: "risk/users/:userId/restrict",
  userFlag: "risk/users/:userId/flag",
  circuit: "risk/circuit",
  circuitClose: "risk/circuit/close",
} as const;
