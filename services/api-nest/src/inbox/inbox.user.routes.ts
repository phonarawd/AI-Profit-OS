/** User inbox + notification prefs routes (prefix /api/v1/) */
export const INBOX_USER_ROUTES = {
  list: "me/inbox",
  read: "me/inbox/:id/read",
  hide: "me/inbox/:id/hide",
  prefsGet: "me/notification-prefs",
  prefsPut: "me/notification-prefs",
} as const;

export const OPS_INBOX_ADMIN_ROUTES = {
  send: "users/:id/ops-messages",
  list: "users/:id/ops-messages",
} as const;
