/**
 * Server-side admin RBAC authority (reusable platform primitive).
 *
 * SSOT = schemas/admin-rbac.v1.json (role × capability matrix, §9.9 / CONSTITUTION 40).
 * A token-supplied capability/permission array is NEVER an authorization source —
 * the token only carries an authenticated identity + role, and the matrix below
 * derives what that role may do.
 *
 * Fail-closed: unknown role, unreadable matrix and unknown capability all deny.
 */

import { createRequire } from "node:module";
import { join } from "node:path";

export type CapabilityLevel = "none" | "read" | "write";

const LEVEL_RANK: Readonly<Record<CapabilityLevel, number>> = {
  none: 0,
  read: 1,
  write: 2,
};

/** Only the literal `all` key grants a role every capability (today: `super`). */
const WILDCARD_CAPABILITY = "all";

type RoleEntry = {
  id?: unknown;
  labelKo?: unknown;
  capabilities?: unknown;
};

type LoadedMatrix = {
  roles: Map<string, Map<string, CapabilityLevel>>;
  source: string;
};

const requireJson = createRequire(__filename);

/** Resolves identically from `src/common/*.ts` and `dist/common/*.js` (both 4 levels below the repo root). */
const RBAC_SCHEMA_PATH = join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "schemas",
  "admin-rbac.v1.json",
);

let cached: LoadedMatrix | null | undefined;

function isLevel(value: unknown): value is CapabilityLevel {
  return value === "none" || value === "read" || value === "write";
}

function parseMatrix(raw: unknown): LoadedMatrix | null {
  if (!raw || typeof raw !== "object") return null;
  const defaults = (raw as { default?: unknown }).default;
  if (!defaults || typeof defaults !== "object") return null;
  const roles = (defaults as { roles?: unknown }).roles;
  if (!Array.isArray(roles) || roles.length === 0) return null;

  const parsed = new Map<string, Map<string, CapabilityLevel>>();
  for (const entry of roles as RoleEntry[]) {
    if (!entry || typeof entry !== "object") return null;
    if (typeof entry.id !== "string" || !entry.id) return null;
    const caps = entry.capabilities;
    if (!caps || typeof caps !== "object") return null;
    const capMap = new Map<string, CapabilityLevel>();
    for (const [cap, level] of Object.entries(caps as Record<string, unknown>)) {
      // Malformed metadata must not silently downgrade to an allow.
      if (!isLevel(level)) return null;
      capMap.set(cap, level);
    }
    parsed.set(entry.id, capMap);
  }
  return { roles: parsed, source: "schemas/admin-rbac.v1.json" };
}

function loadMatrix(): LoadedMatrix | null {
  if (cached !== undefined) return cached;
  try {
    cached = parseMatrix(requireJson(RBAC_SCHEMA_PATH));
  } catch {
    cached = null;
  }
  return cached;
}

/** Test seam — forces the next call to re-read the matrix from disk. */
export function resetAdminRbacCache(): void {
  cached = undefined;
}

export function adminRbacAvailable(): boolean {
  return loadMatrix() !== null;
}

export function knownAdminRoles(): string[] {
  const matrix = loadMatrix();
  return matrix ? [...matrix.roles.keys()].sort() : [];
}

export function isKnownAdminRole(role: unknown): boolean {
  const matrix = loadMatrix();
  if (!matrix || typeof role !== "string" || !role) return false;
  return matrix.roles.has(role);
}

/**
 * Effective level for `role` on `capability`:
 * explicit entry wins (including an explicit `none`), otherwise the `all`
 * wildcard, otherwise `none`.
 */
export function effectiveCapabilityLevel(
  role: unknown,
  capability: string,
): CapabilityLevel {
  const matrix = loadMatrix();
  if (!matrix || typeof role !== "string" || !role || !capability) return "none";
  const caps = matrix.roles.get(role);
  if (!caps) return "none";
  const explicit = caps.get(capability);
  if (explicit !== undefined) return explicit;
  return caps.get(WILDCARD_CAPABILITY) ?? "none";
}

export function adminRoleAllows(
  role: unknown,
  capability: string,
  required: Exclude<CapabilityLevel, "none">,
): boolean {
  const granted = effectiveCapabilityLevel(role, capability);
  return LEVEL_RANK[granted] >= LEVEL_RANK[required];
}

export const ADMIN_RBAC_SCHEMA_REF = "schemas/admin-rbac.v1.json";
export { WILDCARD_CAPABILITY };
