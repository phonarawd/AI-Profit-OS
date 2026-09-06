/**
 * admin_rbac.active / role. 가드가 JWT role만 믿으면 안 된다.
 */

export type AdminRbacRow = { role: string; active: boolean };

export type AdminRbacResolution =
  | { kind: "unwired" }
  | { kind: "unavailable" }
  | { kind: "missing" }
  | { kind: "inactive"; role: string }
  | { kind: "active"; role: string };

type LookupFn = (adminId: string) => Promise<
  | { status: "row"; row: AdminRbacRow }
  | { status: "empty" }
  | { status: "unavailable" }
>;

let lookup: LookupFn | null = null;

export function registerAdminRbacLookup(fn: LookupFn): void {
  lookup = fn;
}

export function clearAdminRbacLookup(): void {
  lookup = null;
}

export async function resolveAdminRbac(
  adminId: string,
): Promise<AdminRbacResolution> {
  if (!lookup) return { kind: "unwired" };
  const got = await lookup(adminId);
  if (got.status === "unavailable") return { kind: "unavailable" };
  if (got.status === "empty") return { kind: "missing" };
  if (!got.row.active) return { kind: "inactive", role: got.row.role };
  return { kind: "active", role: got.row.role };
}
