/** REL-020 · prefix /api/v1/ */
export const PUSH_USER_ROUTES = {
  vapidPublic: "me/push/vapid-public",
  subscribe: "me/push-subscriptions",
  unsubscribe: "me/push-subscriptions",
} as const;

export const PUSH_ADMIN_ROUTES = {
  get: "system-control/push",
  put: "system-control/push",
} as const;
