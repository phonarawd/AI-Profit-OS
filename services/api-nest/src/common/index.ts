/**
 * Reusable platform primitives.
 * Nothing here may import a Peotteok domain module — domain services depend on
 * common, never the other way round.
 */

export {
  ADMIN_CAPABILITY_POLICY,
  classifiedAdminHandlerCount,
  requiredCapabilityFor,
  type RequiredCapability,
} from "./admin-capabilities";
export {
  ADMIN_RBAC_SCHEMA_REF,
  adminRbacAvailable,
  adminRoleAllows,
  effectiveCapabilityLevel,
  isKnownAdminRole,
  knownAdminRoles,
  resetAdminRbacCache,
  type CapabilityLevel,
} from "./admin-rbac.policy";
export {
  AdminTokenError,
  extractBearerToken,
  verifyAdminAuthorizationHeader,
  type AdminPrincipal,
  type AdminTokenFailure,
} from "./admin-token";
export {
  ADMIN_ROUTE_SEGMENT,
  AdminGuard,
  isAdminHandler,
  type RequestWithAdmin,
} from "./admin.guard";
