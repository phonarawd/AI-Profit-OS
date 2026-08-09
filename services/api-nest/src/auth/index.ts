export { AuthModule } from "./auth.module";
export { AuthService } from "./auth.service";
export { JwtAuthGuard, type SessionUser } from "./jwt-auth.guard";
export {
  USER_JWT_ISSUER,
  ADMIN_JWT_ISSUER,
  USER_JWT_AUDIENCE,
  ADMIN_JWT_AUDIENCE,
  ACCESS_TOKEN_TTL_SEC,
  OAUTH_PROVIDERS,
  OAUTH_PRIMARY,
  FORBIDDEN_USER_AUTH_FIELDS,
  STAGE_B_MIN_AGE_YEARS,
  DELETE_ACCOUNT_CONFIRM_PHRASE,
} from "./auth.constants";
export {
  STAGE_A_REQUIRED_FIELDS,
  STAGE_A_OPTIONAL_FIELDS,
  STAGE_A_IDENTITY_METHODS,
  STAGE_B_REQUIRED_FIELDS,
  isCapabilityAllowed,
  validateStageA,
  validateStageB,
  evaluateDeleteAccountGuards,
  assertNoForbiddenAuthFields,
} from "./auth.stage";
export { AUTH_HTTP_PATHS, AUTH_ROUTES, AUTH_ROUTE_PREFIX } from "./auth.routes";
