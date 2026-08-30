export const SPARK_TOSS_SURFACE_STATES = [
  "loading",
  "skeleton",
  "empty",
  "partial",
  "unavailable",
  "permissionDenied",
  "offlineTimeout",
  "retrying",
  "success",
  "failure",
  "cancellation",
  "destructiveConfirm",
] as const;

export type SparkTossSurfaceState = (typeof SPARK_TOSS_SURFACE_STATES)[number];

export const sparkTossStateTone: Record<SparkTossSurfaceState, string> = {
  loading: "information",
  skeleton: "muted",
  empty: "muted",
  partial: "caution",
  unavailable: "caution",
  permissionDenied: "critical",
  offlineTimeout: "caution",
  retrying: "information",
  success: "positive",
  failure: "critical",
  cancellation: "muted",
  destructiveConfirm: "critical",
};

export const sparkTossStateRules: Record<SparkTossSurfaceState, string> = {
  loading: "Keep structure. No fake percent or promised completion.",
  skeleton: "Reserve the real layout slots.",
  empty: "Offer exactly one next action.",
  partial: "Separate present values from missing values. Never coerce missing to 0.",
  unavailable: "Show cause and a retry path.",
  permissionDenied: "State the lack of permission only. No bypass action.",
  offlineTimeout: "State the lost connection and retry.",
  retrying: "Do not hide an in-progress retry.",
  success: "Show only a confirmable result.",
  failure: "Show what failed and the next action.",
  cancellation: "State cancellation. Do not relabel it as success.",
  destructiveConfirm: "Confirm irreversibility first.",
};
