/**
 * Admin boundary guard — deny-by-default authentication + RBAC for every
 * `/admin` route (§9.9 · CONSTITUTION 40 · ADR-006 issuer separation).
 *
 * Registered twice on purpose:
 *   1. globally via APP_GUARD in AppModule — a newly added admin controller is
 *      inside the boundary even when nobody remembers `@UseGuards`;
 *   2. explicitly on each `*.admin.controller.ts` — local, reviewable intent.
 * Both passes run the same pure verification, so double registration is safe.
 *
 * Route classification uses Nest's own `PATH_METADATA`, not the raw request URL:
 * a rewritten/encoded URL cannot walk a controller out of the boundary.
 *
 * Zero constructor deps (mirrors JwtAuthGuard) so `@UseGuards(AdminGuard)` works
 * in any module without provider registration.
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PATH_METADATA } from "@nestjs/common/constants";
import { requiredCapabilityFor } from "./admin-capabilities";
import { adminRoleAllows, isKnownAdminRole } from "./admin-rbac.policy";
import {
  AdminTokenError,
  verifyAdminAuthorizationHeader,
  type AdminPrincipal,
} from "./admin-token";
import { writeAdminAuditDeny } from "../admin-control/admin-audit.writer";

export const ADMIN_ROUTE_SEGMENT = "admin";

/** Populated only by this guard — never merged into `req.user` (trust domains stay split). */
export type RequestWithAdmin = {
  headers?: Record<string, string | string[] | undefined>;
  admin?: AdminPrincipal;
};

function metadataPaths(target: unknown): string[] {
  if (!target) return [];
  let raw: unknown;
  try {
    raw = Reflect.getMetadata(PATH_METADATA, target as object);
  } catch {
    return [];
  }
  if (raw == null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.filter((p) => typeof p === "string").map((p) => String(p));
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+/, "").replace(/\/+$/, "");
}

function firstSegment(value: string): string {
  return trimSlashes(value).split("/")[0]?.toLowerCase() ?? "";
}

/**
 * True when the controller path — or the controller+handler path pair — mounts
 * under the `admin` segment.
 */
export function isAdminHandler(
  controller: unknown,
  handler: unknown,
): boolean {
  const controllerPaths = metadataPaths(controller);
  const handlerPaths = metadataPaths(handler);

  for (const controllerPath of controllerPaths) {
    if (firstSegment(controllerPath) === ADMIN_ROUTE_SEGMENT) return true;
  }

  const prefixes = controllerPaths.length > 0 ? controllerPaths : [""];
  for (const controllerPath of prefixes) {
    for (const handlerPath of handlerPaths) {
      const joined = [trimSlashes(controllerPath), trimSlashes(handlerPath)]
        .filter(Boolean)
        .join("/");
      if (firstSegment(joined) === ADMIN_ROUTE_SEGMENT) return true;
    }
  }
  return false;
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Non-admin surfaces (including every user route) keep their prior behaviour.
    if (context.getType<string>() !== "http") return true;
    if (!isAdminHandler(context.getClass(), context.getHandler())) return true;

    const request = context.switchToHttp().getRequest<RequestWithAdmin>();

    let principal: AdminPrincipal;
    try {
      principal = verifyAdminAuthorizationHeader(
        request.headers?.authorization ?? request.headers?.Authorization,
      );
    } catch (e) {
      throw new UnauthorizedException(
        e instanceof AdminTokenError ? e.code : "ADMIN_AUTH_REQUIRED",
      );
    }

    // Role authority is the token claim; the *permissions* always come from the
    // server-side matrix. An unknown role can never resolve to a capability.
    if (!isKnownAdminRole(principal.role)) {
      writeAdminAuditDeny({
        action: "rbac.deny",
        outcome: "denied",
        actorAdminId: principal.adminId,
        actorRole: principal.role,
        reasonCode: "ADMIN_ROLE_UNKNOWN",
      });
      throw new ForbiddenException("ADMIN_ROLE_UNKNOWN");
    }

    const required = requiredCapabilityFor(
      context.getClass().name,
      context.getHandler().name,
    );
    if (!required) {
      writeAdminAuditDeny({
        action: "rbac.deny",
        outcome: "denied",
        actorAdminId: principal.adminId,
        actorRole: principal.role,
        reasonCode: "ADMIN_CAPABILITY_UNCLASSIFIED",
      });
      throw new ForbiddenException("ADMIN_CAPABILITY_UNCLASSIFIED");
    }
    if (!adminRoleAllows(principal.role, required.capability, required.level)) {
      writeAdminAuditDeny({
        action: "rbac.deny",
        outcome: "denied",
        actorAdminId: principal.adminId,
        actorRole: principal.role,
        capability: required.capability,
        reasonCode: "ADMIN_CAPABILITY_DENIED",
      });
      throw new ForbiddenException("ADMIN_CAPABILITY_DENIED");
    }

    request.admin = principal;
    return true;
  }
}
