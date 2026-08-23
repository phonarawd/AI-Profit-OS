/** Admin audit HTTP paths · REL-405 · UI Owns=Admin · delete 0 */

export const AUDIT_ADMIN_ROUTES = {
  events: "audit/events",
  event: "audit/events/:id",
} as const;
